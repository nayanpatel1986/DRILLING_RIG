from database import SessionLocal
from db_models import ModbusDevice

db = SessionLocal()
try:
    devices = db.query(ModbusDevice).all()
    print(f"Found {len(devices)} devices:")
    for d in devices:
        print(f"ID: {d.id}, Name: {d.name}, Type: {d.device_type}")
finally:
    db.close()
