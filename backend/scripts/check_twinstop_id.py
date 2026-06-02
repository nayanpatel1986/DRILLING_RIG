from database import SessionLocal
from db_models import ModbusDevice

db = SessionLocal()
try:
    dev = db.query(ModbusDevice).filter(ModbusDevice.device_type == "twinstop").first()
    if dev:
        print(f"TWINSTOP_ID={dev.id}")
    else:
        print("Not Found")
except Exception as e:
    print(e)
finally:
    db.close()
