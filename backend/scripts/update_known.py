from database import SessionLocal
from db_models import ModbusRegister

db = SessionLocal()

# Update Known_Height
known = db.query(ModbusRegister).filter(ModbusRegister.field_name == 'Known_Height').first()
if known:
    known.address = 528
    print(f"Updated Known_Height address to {known.address}")

# Update Calibrate_At_Known_Height
coil = db.query(ModbusRegister).filter(ModbusRegister.field_name == 'Calibrate_At_Known_Height').first()
if coil:
    coil.address = 403
    print(f"Updated Calibrate_At_Known_Height address to {coil.address}")

db.commit()
db.close()
