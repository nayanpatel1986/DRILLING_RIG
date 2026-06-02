from database import SessionLocal
from db_models import ModbusRegister

def main():
    db = SessionLocal()
    fields_to_remove = [
        "EStop_Reset", 
        "Brake_Release", 
        "Brake_Pressure_Setpoint", 
        "Target_Torque", 
        "Safety_Override"
    ]
    
    count = 0
    for f in fields_to_remove:
        deleted = db.query(ModbusRegister).filter(ModbusRegister.field_name == f).delete(synchronize_session=False)
        count += deleted
        print(f"Deleted {deleted} occurrences of {f}")
        
    db.commit()
    db.close()
    print(f"Total rows deleted: {count}")

if __name__ == "__main__":
    main()
