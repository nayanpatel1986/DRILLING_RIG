import sys
sys.path.insert(0, '.')

from database import SessionLocal
from db_models import ModbusDevice, ModbusRegister

db = SessionLocal()

device = db.query(ModbusDevice).filter(ModbusDevice.device_type == "twinstop").first()
if not device:
    print("No twinstop device found!")
    sys.exit(1)

h_fields = ["H1", "H2", "H3"]
regs = db.query(ModbusRegister).filter(
    ModbusRegister.device_id == device.id,
    ModbusRegister.field_name.in_(h_fields)
).all()

for r in regs:
    print(f"Updating {r.field_name}: address={r.address}, setting fc=3, bo=CDAB")
    r.function_code = 3
    r.byte_order = "CDAB"

db.commit()

from services.telegraf_sync import sync_telegraf_config
sync_telegraf_config()
print("Database updated and Telegraf configuration synced.")
db.close()
