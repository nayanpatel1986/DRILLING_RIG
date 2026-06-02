from pydantic import BaseModel
from typing import List, Optional, Dict

class RigStatus(BaseModel):
    rig_id: str
    status: str # Drilling, Tripping, Idle
    timestamp: str

class EquipmentHealth(BaseModel):
    equipment_id: str
    name: str
    running_hours: float
    health_index: float # 0-100
    alerts: List[str]

class DrillingParams(BaseModel):
    depth: float
    rop: float
    wob: float
    rpm: float
    torque: float
    spp: float

class ConditionMonitor(BaseModel):
    equipment_id: str
    vibration_level: float
    temp_level: float
    status: str # Normal, Warning, Critical
