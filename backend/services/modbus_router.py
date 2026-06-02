from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from database import get_db
from db_models import ModbusDevice, ModbusRegister, User
from auth.router import get_current_user, require_operator_or_admin
from pydantic import BaseModel
from typing import List, Optional
import os
from services.modbus_control import modbus_writer

router = APIRouter(prefix="/modbus", tags=["Modbus Write Control"])

# ── Pydantic Models ───────────────────────────────────────

class WriteCoilRequest(BaseModel):
    device_id: int
    address: int
    value: bool

class WriteRegisterRequest(BaseModel):
    device_id: int
    address: int
    value: int

class HooterStatusRequest(BaseModel):
    active: bool

class WriteBulkRegistersRequest(BaseModel):
    device_id: int
    address: int
    values: List[int]

class WriteFloatRequest(BaseModel):
    device_id: int
    address: int
    value: float

# ── Safety Dependencies ───────────────────────────────────

async def require_safety_pin(x_safety_pin: Optional[str] = Header(None, alias="X-Safety-PIN")):
    return

# ── API Endpoints ──────────────────────────────────────────

@router.post("/write-coil")
async def write_coil(
    payload: WriteCoilRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_operator_or_admin),
    __: None = Depends(require_safety_pin)
):
    """Write a boolean (On/Off) value to a Modbus Coil (0x)."""
    device = db.query(ModbusDevice).filter(ModbusDevice.id == payload.device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Modbus Device not found")
    
    if not device.ip_address:
         raise HTTPException(status_code=400, detail="Device has no IP address configured")

    result = await modbus_writer.write_coil(
        device.ip_address, 
        device.port, 
        device.slave_id, 
        payload.address, 
        payload.value
    )
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return result

@router.post("/write-register")
async def write_register(
    payload: WriteRegisterRequest,
    db: Session = Depends(get_db),
    x_safety_pin: Optional[str] = Header(None, alias="X-Safety-PIN"),
    _: User = Depends(require_operator_or_admin)
):
    """Write a single 16-bit integer to a Modbus Register (4x)."""
    # Exempt Calibration Triggers from PIN requirement
    CALIBRATION_TRIGGERS = [30, 31, 32, 33, 34, 37, 38]
    
    if payload.address not in CALIBRATION_TRIGGERS:
        await require_safety_pin(x_safety_pin)

    device = db.query(ModbusDevice).filter(ModbusDevice.id == payload.device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Modbus Device not found")
    
    if not device.ip_address:
         raise HTTPException(status_code=400, detail="Device has no IP address configured")

    # Safety Limit Validation
    register_config = db.query(ModbusRegister).filter(
        ModbusRegister.device_id == payload.device_id,
        ModbusRegister.address == payload.address
    ).first()

    if register_config:
        if register_config.min_value is not None and payload.value < (register_config.min_value / register_config.scale):
             raise HTTPException(status_code=400, detail=f"Safety Violation: Value {payload.value} is below minimum allowed ({register_config.min_value} {register_config.unit})")
        if register_config.max_value is not None and payload.value > (register_config.max_value / register_config.scale):
             raise HTTPException(status_code=400, detail=f"Safety Violation: Value {payload.value} is above maximum allowed ({register_config.max_value} {register_config.unit})")

    result = await modbus_writer.write_register(
        device.ip_address, 
        device.port, 
        device.slave_id, 
        payload.address, 
        payload.value
    )
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return result

@router.post("/write-registers-bulk")
async def write_registers_bulk(
    payload: WriteBulkRegistersRequest,
    db: Session = Depends(get_db),
    x_safety_pin: Optional[str] = Header(None, alias="X-Safety-PIN"),
    _: User = Depends(require_operator_or_admin)
):
    """Write multiple 16-bit integers to Modbus Holding Registers (4x)."""
    await require_safety_pin(x_safety_pin)

    device = db.query(ModbusDevice).filter(ModbusDevice.id == payload.device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Modbus Device not found")
    
    if not device.ip_address:
         raise HTTPException(status_code=400, detail="Device has no IP address configured")

    result = await modbus_writer.write_registers(
        device.ip_address, 
        device.port, 
        device.slave_id, 
        payload.address, 
        payload.values
    )
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return result

@router.post("/write-float")
async def write_float(
    payload: WriteFloatRequest,
    db: Session = Depends(get_db),
    x_safety_pin: Optional[str] = Header(None, alias="X-Safety-PIN"),
    _: User = Depends(require_operator_or_admin)
):
    """Write a 32-bit floating point value (REAL) to Modbus Holding Registers (4x)."""
    # Exempt Calibration Heights, Safety Setpoints, Stroke Counters, and Depth from PIN requirement
    EXEMPT_FLOAT_ADDRESSES = [448, 464, 480, 620, 640, 656, 496, 504, 512, 24, 26, 30, 1110, 1114, 1156, 1234, 1242, 416, 1100, 2318]

    print(f"[DEBUG] write_float: addr={payload.address}, dev={payload.device_id}, val={payload.value}")
    if payload.address not in EXEMPT_FLOAT_ADDRESSES:
        await require_safety_pin(x_safety_pin)

    device = db.query(ModbusDevice).filter(ModbusDevice.id == payload.device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Modbus Device not found")
    
    if not device.ip_address:
         raise HTTPException(status_code=400, detail="Device has no IP address configured")

    # Safety Limit Validation
    register_config = db.query(ModbusRegister).filter(
        ModbusRegister.device_id == payload.device_id,
        ModbusRegister.address == payload.address
    ).first()

    if register_config:
        if register_config.min_value is not None and payload.value < (register_config.min_value / register_config.scale):
             raise HTTPException(status_code=400, detail=f"Safety Violation: Value {payload.value} is below minimum allowed ({register_config.min_value} {register_config.unit})")
        if register_config.max_value is not None and payload.value > (register_config.max_value / register_config.scale):
             raise HTTPException(status_code=400, detail=f"Safety Violation: Value {payload.value} is above maximum allowed ({register_config.max_value} {register_config.unit})")

    result = await modbus_writer.write_float(
        device.ip_address, 
        device.port, 
        device.slave_id, 
        payload.address, 
        payload.value
    )
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return result

@router.post("/twinstop/hooter-sync")
async def hooter_sync(
    payload: HooterStatusRequest,
    _: User = Depends(require_operator_or_admin)
):
    """
    Synchronizes the software alarm state with the physical TWINSTOP hooter.
    Configured for Holding Register 41, Bit 0 on 192.168.1.10.
    """
    # Hardcoded for Twinstop PLC as requested
    TWINSTOP_IP = "192.168.1.10"
    TWINSTOP_PORT = 502
    TWINSTOP_SLAVE = 1
    HOOTER_REG = 41
    HOOTER_BIT = 0

    result = await modbus_writer.write_register_bit(
        ip=TWINSTOP_IP,
        port=TWINSTOP_PORT,
        slave_id=TWINSTOP_SLAVE,
        address=HOOTER_REG,
        bit_index=HOOTER_BIT,
        value=payload.active
    )

    if not result["success"]:
        # Don't throw 500 error for hooter sync to avoid UX disruption if PLC offline
        return {"status": "error", "message": result["error"]}
    
    return {"status": "ok", "physical_state": payload.active}
