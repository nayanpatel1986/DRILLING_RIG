from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from db_models import User, ModbusDevice, ModbusRegister
from database import get_db, engine, Base
from sqlalchemy.orm import Session
import uvicorn
from typing import Dict, List
import os
from dotenv import load_dotenv

# Analytics engine and WebSocket imports
from services.analytics import engine as analytics_engine
from services.websocket_server import ws_manager, websocket_endpoint

# Router imports
from auth.router import router as auth_router, get_current_user
from services.wells import router as wells_router
from services.export import router as export_router
from services.modbus_config import router as modbus_config_router, get_daq10_dashboard_mappings
from services.modbus_router import router as modbus_control_router
from services.preferences import router as preferences_router

load_dotenv()
ENV = os.getenv("ENV", "development").lower()
is_prod = ENV == "production"
LIVE_MODE = os.getenv("LIVE_MODE", "false").lower() == "true"

app = FastAPI(
    title="DrillBit Digital Twin API", 
    version="1.0.0",
    docs_url=None if is_prod else "/docs",
    redoc_url=None if is_prod else "/redoc",
    openapi_url=None if is_prod else "/openapi.json"
)

# CORS Configuration
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:8081,http://127.0.0.1:8081,http://localhost:3001,http://127.0.0.1:3001").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables if not exist
Base.metadata.create_all(bind=engine)

# Include Routers
app.include_router(auth_router)
app.include_router(wells_router)
app.include_router(export_router)
app.include_router(modbus_config_router)
app.include_router(modbus_control_router)
app.include_router(preferences_router)

@app.on_event("startup")
async def startup_event():
    # Connect WebSocket manager to analytics engine
    analytics_engine.ws_manager = ws_manager
    analytics_engine.start()
    print("Backend started. Waiting for Modbus connections.")

@app.on_event("shutdown")
async def shutdown_event():
    pass

@app.get("/")
def read_root():
    return {"status": "online", "service": "DrillBit Digital Twin Backend"}

def convert_units_to_metric(data):
    def map_and_convert(row):
        if "BitDepth" in row and row["BitDepth"] is not None:
            row["BitDepth"] = round(row["BitDepth"], 2)
        if "Depth" in row and row["Depth"] is not None:
            row["Depth"] = round(row["Depth"], 2)
        if "ROP" in row and row["ROP"] is not None:
            row["ROP"] = round(row["ROP"] * 0.3048, 2)
        if "BlockPosition" in row and row["BlockPosition"] is not None:
            row["BlockPosition"] = round(row["BlockPosition"], 2)
            row["BLOCK_HEIGHT"] = row["BlockPosition"]
            row["BLOCK_POS"] = row["BlockPosition"]
            
        bbl_fields = ["PitVolume1", "PitVolume2", "PitVolume3", "PitVolume4", 
                      "TripTank1", "TripTank2", "TripTankGL", "TT_VOL"]
        for field in bbl_fields:
            if field in row and row[field] is not None:
                row[field] = round(row[field], 2)

        # Twinstop mapping for frontend compatibility
        if "BH" in row and row["BH"] is not None:
            row["BLOCK_HEIGHT"] = round(row["BH"], 2)
            row["BLOCK_POS"] = round(row["BH"], 2)
            row["BlockPosition"] = round(row["BH"], 2)
        if "LiveEncounterCount" in row and row["LiveEncounterCount"] is not None:
            row["EDMSCOUNT"] = round(row["LiveEncounterCount"], 0)
        elif "EDMS COUNT" in row and row["EDMS COUNT"] is not None:
            row["EDMSCOUNT"] = round(row["EDMS COUNT"], 0)
        elif "EDMSCOUNT" in row and row["EDMSCOUNT"] is not None:
            row["EDMSCOUNT"] = round(row["EDMSCOUNT"], 0)
        for i in range(1, 6):
            src_cap = f"Point{i}Capture"
            if src_cap in row and row[src_cap] is not None:
                row[f"C{i}"] = round(row[src_cap], 2)

        # DAQ-10 Twinstop setpoint mappings
        if "CROWNOMATIC" in row and row["CROWNOMATIC"] is not None:
            row["Crownomatic"] = round(row["CROWNOMATIC"], 2)
        if "FLOOROMATIC" in row and row["FLOOROMATIC"] is not None:
            row["Flooromatic"] = round(row["FLOOROMATIC"], 2)
        elif "FLOROMATIC" in row and row["FLOROMATIC"] is not None:
            row["Flooromatic"] = round(row["FLOROMATIC"], 2)
        if "ALARAMOFFSET" in row and row["ALARAMOFFSET"] is not None:
            row["AlarmOffset"] = round(row["ALARAMOFFSET"], 2)
        if " AIR PRESSURE SET POINT" in row and row[" AIR PRESSURE SET POINT"] is not None:
            row["AirPressureSetPoint"] = round(row[" AIR PRESSURE SET POINT"], 2)
        elif "AIR PRESSURE SET POINT" in row and row["AIR PRESSURE SET POINT"] is not None:
            row["AirPressureSetPoint"] = round(row["AIR PRESSURE SET POINT"], 2)
                
    if isinstance(data, dict):
        map_and_convert(data)
    elif isinstance(data, list):
        for row in data:
            map_and_convert(row)
    return data

# ── Rig Data Router ──
from fastapi import APIRouter
rig_router = APIRouter(prefix="/rig", tags=["Rig Telemetry"])

@rig_router.get("/latest")
async def get_latest_data(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    from services.influx import InfluxWrapper
    influx = InfluxWrapper()
    
    sensor_data = influx.query_sensors_latest("modbus") or {}
    merged_data = {**sensor_data}

    daq10_mappings, daq10_units = get_daq10_dashboard_mappings(db)
    for src_field, dashboard_key in daq10_mappings.items():
        if merged_data.get(src_field) is not None:
            merged_data[dashboard_key] = merged_data[src_field]
            
    merged_data.update(daq10_units)
    return convert_units_to_metric(merged_data)

@rig_router.get("/history")
async def get_history(range: str = "-5m", db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    from services.influx import InfluxWrapper
    influx = InfluxWrapper()
    modbus_rows = influx.query_range(range, "modbus")
    all_rows = modbus_rows
    
    if modbus_rows:
        merged = {}
        for row in all_rows:
            t = row.get("time", "")
            if t not in merged:
                merged[t] = row
            else:
                merged[t].update(row)
        all_rows = sorted(merged.values(), key=lambda r: r.get("time", ""))
        
        # Apply DAQ-10 mappings to each history row
        daq10_mappings, _ = get_daq10_dashboard_mappings(db)
        for row in all_rows:
            for src_field, dashboard_key in daq10_mappings.items():
                if row.get(src_field) is not None:
                    row[dashboard_key] = row[src_field]
    
    return convert_units_to_metric(all_rows)

@rig_router.get("/history-range")
async def get_history_range(start: str = "", stop: str = "", db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    from services.influx import InfluxWrapper
    influx = InfluxWrapper()
    if not start or not stop:
        return []
    
    modbus_rows = influx.query_custom_range(start, stop, "modbus")
    all_rows = modbus_rows
    
    if modbus_rows:
        merged = {}
        for row in all_rows:
            t = row.get("time", "")
            if t not in merged:
                merged[t] = row
            else:
                merged[t].update(row)
        all_rows = sorted(merged.values(), key=lambda r: r.get("time", ""))
        
        # Apply DAQ-10 mappings to each history row
        daq10_mappings, _ = get_daq10_dashboard_mappings(db)
        for row in all_rows:
            for src_field, dashboard_key in daq10_mappings.items():
                if row.get(src_field) is not None:
                    row[dashboard_key] = row[src_field]
    
    return convert_units_to_metric(all_rows)

@rig_router.get("/sensors")
async def get_sensors(_: User = Depends(get_current_user)):
    from services.influx import InfluxWrapper
    influx = InfluxWrapper()
    return influx.query_sensors_latest("modbus")

app.include_router(rig_router)

@app.get("/health")
def health_check():
    return {
        "status": "ok", 
        "live_mode": LIVE_MODE
    }

@app.websocket("/ws/realtime")
async def realtime_websocket(websocket: WebSocket):
    await websocket_endpoint(websocket)

@app.get("/ws/stats")
async def websocket_stats():
    return ws_manager.get_stats()

if __name__ == "__main__":
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", 8000))
    reload = os.getenv("API_RELOAD", "true").lower() == "true" and not is_prod
    uvicorn.run("main:app", host=host, port=port, reload=reload)
