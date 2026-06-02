from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime, Enum
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    OPERATOR = "operator"
    VIEWER = "viewer"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default=UserRole.VIEWER)
    is_active = Column(Boolean, default=True)

class WellStatus(str, enum.Enum):
    PLANNED = "planned"
    ACTIVE = "active"
    COMPLETED = "completed"
    SUSPENDED = "suspended"

class Well(Base):
    __tablename__ = "wells"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    api_number = Column(String, unique=True, index=True)
    operator = Column(String)
    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime, nullable=True)
    status = Column(String, default=WellStatus.PLANNED)
    description = Column(String, nullable=True)


class ModbusDevice(Base):
    __tablename__ = "modbus_devices"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)                     # e.g. "Engine 1", "Mud Pump 1"
    device_type = Column(String)                          # "engine", "mudpump", "bop"
    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Modbus connection
    ip_address = Column(String, nullable=True)            # e.g. "192.168.1.10"
    port = Column(Integer, default=502)
    slave_id = Column(Integer, default=1)
    protocol = Column(String, default="tcp")              # tcp or rtu
    baud_rate = Column(Integer, default=9600)              # for RTU
    timeout = Column(String, default="1s")

    # Telegraf measurement
    measurement_name = Column(String, default="rig_sensors")

    # Relationship
    registers = relationship("ModbusRegister", back_populates="device", cascade="all, delete-orphan", order_by="ModbusRegister.id")


class ModbusRegister(Base):
    __tablename__ = "modbus_registers"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("modbus_devices.id", ondelete="CASCADE"), index=True)
    field_name = Column(String)                           # e.g. "RPM", "OilPressure", "SPM"
    register_type = Column(String, default="holding")     # holding, input, coil, discrete
    function_code = Column(Integer, nullable=True)        # 01, 02, 03, 04, 05, 06, 15, 16
    address = Column(Integer)                             # Modbus register address
    data_type = Column(String, default="FLOAT32")         # UINT16, INT16, FLOAT32, etc.
    byte_order = Column(String, default="ABCD")           # ABCD, DCBA, BADC, CDAB
    scale = Column(Float, default=1.0)
    unit = Column(String, nullable=True)                  # e.g. "rpm", "psi", "spm"
    
    # Safety Limits (Industrial Risk Protection)
    min_value = Column(Float, nullable=True)
    max_value = Column(Float, nullable=True)

    device = relationship("ModbusDevice", back_populates="registers")


class SystemPreference(Base):
    __tablename__ = "system_preferences"

    key = Column(String, primary_key=True, index=True)
    value = Column(String)  # JSON serialized string
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
