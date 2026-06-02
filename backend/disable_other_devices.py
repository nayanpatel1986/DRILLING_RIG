from database import SessionLocal
from db_models import ModbusDevice

db = SessionLocal()
try:
    devices = db.query(ModbusDevice).all()
    for dev in devices:
        if dev.device_type != "twinstop":
            dev.is_enabled = False
            print(f"Disabled {dev.name} ({dev.device_type})")
        else:
            dev.is_enabled = True
            print(f"Ensured {dev.name} ({dev.device_type}) is enabled")
    db.commit()
    print("Optimization complete.")
except Exception as e:
    print(e)
finally:
    db.close()
