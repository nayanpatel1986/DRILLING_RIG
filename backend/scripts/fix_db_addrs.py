import sys
sys.path.insert(0, '.')

from database import SessionLocal
from db_models import ModbusDevice, ModbusRegister

db = SessionLocal()

device = db.query(ModbusDevice).filter(ModbusDevice.device_type == "twinstop").first()
if not device:
    sys.exit(1)

floor_regs = db.query(ModbusRegister).filter(
    ModbusRegister.device_id == device.id,
    ModbusRegister.field_name == "Flooromatic"
).all()

for r in floor_regs:
    r.address = 504
    r.function_code = 3
    r.byte_order = "CDAB"

alarm_regs = db.query(ModbusRegister).filter(
    ModbusRegister.device_id == device.id,
    ModbusRegister.field_name == "AlarmOffset"
).all()

for r in alarm_regs:
    r.address = 512
    r.function_code = 3
    r.byte_order = "CDAB"

db.commit()

from services.telegraf_sync import sync_telegraf_config
sync_telegraf_config()
print("Fixed Flooromatic to address 504 and AlarmOffset to FC 3.")
