from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from database import get_db
from db_models import Well, WellStatus
from pydantic import BaseModel
from auth.router import get_current_user, require_operator_or_admin
from services.influx import InfluxWrapper
from services.export import _build_xlsx_bytes
import pandas as pd

router = APIRouter(prefix="/wells", tags=["wells"])

class WellCreate(BaseModel):
    name: str
    api_number: str
    operator: str
    description: Optional[str] = None

class WellUpdate(BaseModel):
    status: WellStatus
    end_date: Optional[datetime] = None

class WellResponse(BaseModel):
    id: int
    name: str
    api_number: str
    status: str
    start_date: datetime
    end_date: Optional[datetime]
    class Config:
        orm_mode = True

@router.post("/", response_model=WellResponse)
def create_well(well: WellCreate, db: Session = Depends(get_db), current_user = Depends(require_operator_or_admin)):
    from sqlalchemy.exc import IntegrityError
    
    # Check if active well exists
    active_well = db.query(Well).filter(Well.status == WellStatus.ACTIVE).first()
    if active_well:
        raise HTTPException(
            status_code=400, 
            detail="An active well already exists. Please end the current well first."
        )

    new_well = Well(
        name=well.name,
        api_number=well.api_number,
        operator=well.operator,
        description=well.description,
        status=WellStatus.ACTIVE,
        start_date=datetime.utcnow()
    )
    db.add(new_well)
    try:
        db.commit()
        db.refresh(new_well)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"A well with API number '{well.api_number}' already exists in the system."
        )
    return new_well

@router.get("/active", response_model=Optional[WellResponse])
def get_active_well(db: Session = Depends(get_db)):
    well = db.query(Well).filter(Well.status == WellStatus.ACTIVE).first()
    if not well:
         # Return a default placeholder or None
         return None 
    return well

@router.get("/{well_id}/export")
def export_well_data(well_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Export all telemetry data collected during a well as an Excel file."""
    well = db.query(Well).filter(Well.id == well_id).first()
    if not well:
        raise HTTPException(status_code=404, detail="Well not found")

    influx = InfluxWrapper()

    # Use well start_date -> end_date (or now if still active)
    start_iso = well.start_date.replace(tzinfo=timezone.utc).isoformat()
    if well.end_date:
        stop_iso = well.end_date.replace(tzinfo=timezone.utc).isoformat()
    else:
        stop_iso = datetime.now(timezone.utc).isoformat()

    def get_df(measurement):
        query = f'''
        from(bucket: "{influx.bucket}")
          |> range(start: {start_iso}, stop: {stop_iso})
          |> filter(fn: (r) => r["_measurement"] == "{measurement}")
          |> pivot(rowKey:["_time"], columnKey:["_field"], valueColumn:"_value")
        '''
        try:
            df = influx.query_api.query_data_frame(query=query)
            if isinstance(df, list):
                df = pd.concat(df, ignore_index=True)
            if df is None or df.empty:
                return pd.DataFrame()
            drop_cols = ['_start', '_stop', 'result', 'table', '_measurement',
                         'device_name', 'device_type', 'host', 'name', 'rig_id', 'slave_id', 'type']
            df.drop(columns=[c for c in drop_cols if c in df.columns], inplace=True, errors='ignore')
            return df
        except Exception as e:
            print(f"Well export query error ({measurement}): {e}")
            return pd.DataFrame()

    df_drilling = get_df("realtime_drilling")
    df_modbus = get_df("modbus")

    if df_drilling.empty and df_modbus.empty:
        raise HTTPException(status_code=404, detail="No telemetry data found for this well")

    if df_drilling.empty:
        df = df_modbus
    elif df_modbus.empty:
        df = df_drilling
    else:
        df = pd.merge(df_drilling, df_modbus, on='_time', how='outer').sort_values('_time')

    if '_time' in df.columns:
        df.rename(columns={'_time': 'Time'}, inplace=True)

    headers = list(df.columns)
    rows = df.values.tolist()
    output = _build_xlsx_bytes(headers, rows)

    safe_name = well.name.replace(" ", "_").replace("/", "-")
    filename = f"well_{safe_name}_{well.api_number}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

    response = StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    response.headers["Content-Disposition"] = f"attachment; filename={filename}"
    return response

@router.put("/{well_id}/end", response_model=WellResponse)
def end_well(well_id: int, db: Session = Depends(get_db), current_user = Depends(require_operator_or_admin)):
    well = db.query(Well).filter(Well.id == well_id).first()
    if not well:
        raise HTTPException(status_code=404, detail="Well not found")
    
    # Capture the time range before marking as completed
    start_iso = well.start_date.replace(tzinfo=timezone.utc).isoformat()
    
    well.status = WellStatus.COMPLETED
    well.end_date = datetime.utcnow()
    db.commit()
    db.refresh(well)

    # Delete all InfluxDB data for this well's time range
    try:
        stop_iso = well.end_date.replace(tzinfo=timezone.utc).isoformat()
        influx = InfluxWrapper()
        influx.delete_all_well_data(start_iso, stop_iso)
        print(f"Well '{well.name}' ended - all telemetry data purged from InfluxDB.")
    except Exception as e:
        print(f"Warning: Well ended but data deletion failed: {e}")

    return well

@router.get("/", response_model=List[WellResponse])
def list_wells(db: Session = Depends(get_db)):
    return db.query(Well).order_by(Well.start_date.desc()).all()
