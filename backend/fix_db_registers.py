from sqlalchemy import create_engine, text
import os

# Database connection from environment
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    user = os.getenv("POSTGRES_USER")
    password = os.getenv("POSTGRES_PASSWORD")
    db = os.getenv("POSTGRES_DB", "rig_manager")
    host = os.getenv("POSTGRES_HOST", "postgres")
    port = os.getenv("POSTGRES_PORT", "5432")
    DATABASE_URL = f"postgresql://{user}:{password}@{host}:{port}/{db}"

engine = create_engine(DATABASE_URL)

def fix_daq10_registers():
    with engine.connect() as conn:
        # 1. Find the DAQ-10 device
        res = conn.execute(text("SELECT id FROM modbus_devices WHERE device_type = 'daq10' LIMIT 1")).fetchone()
        if not res:
            print("DAQ-10 device not found.")
            return
        device_id = res[0]
        print(f"Found DAQ-10 with ID: {device_id}")

        # 2. Delete any existing TOTAL VOLUME register to avoid duplicates
        conn.execute(text("DELETE FROM modbus_registers WHERE device_id = :dev_id AND field_name = 'TOTAL VOLUME'"), {"dev_id": device_id})
        
        # 3. Insert TOTAL VOLUME at the end
        conn.execute(text("""
            INSERT INTO modbus_registers 
            (device_id, field_name, register_type, address, data_type, byte_order, scale, unit, function_code)
            VALUES 
            (:dev_id, 'TOTAL VOLUME', 'holding', 1166, 'FLOAT32', 'CDAB', 1.0, 'bbl', 3)
        """), {"dev_id": device_id})
        
        conn.commit()
        print("TOTAL VOLUME register added to the end of DAQ-10 configuration.")

if __name__ == "__main__":
    fix_daq10_registers()
