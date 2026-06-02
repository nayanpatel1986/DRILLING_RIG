from database import SessionLocal
from db_models import ModbusDevice

db = SessionLocal()
try:
    dev = db.query(ModbusDevice).filter(ModbusDevice.device_type == "twinstop").first()
    if dev:
        print(f"DEVICE_ID: {dev.id}")
    else:
        print("DEVICE NOT FOUND")
finally:
    db.close()
