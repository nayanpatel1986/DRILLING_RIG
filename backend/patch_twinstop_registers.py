import os
from sqlalchemy import create_engine, text
from database import SessionLocal
from services.telegraf_sync import sync_telegraf_config

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    user = os.getenv("POSTGRES_USER")
    password = os.getenv("POSTGRES_PASSWORD")
    db = os.getenv("POSTGRES_DB", "rig_manager")
    host = os.getenv("POSTGRES_HOST", "postgres")
    port = os.getenv("POSTGRES_PORT", "5432")
    DATABASE_URL = f"postgresql://{user}:{password}@{host}:{port}/{db}"

engine = create_engine(DATABASE_URL)

def patch_twinstop():
    with engine.connect() as conn:
        # 1. Find Twinstop device ID
        res = conn.execute(text("SELECT id FROM modbus_devices WHERE device_type = 'twinstop' LIMIT 1")).fetchone()
        if not res:
            print("[ERROR] Twinstop device not found in database. Cannot patch registers.")
            return
        device_id = res[0]
        print(f"[INFO] Found Twinstop device with ID: {device_id}")

        # 2. Registers to add
        registers_to_add = [
            {
                "field_name": "H4",
                "register_type": "holding",
                "function_code": 3,
                "address": 620,
                "data_type": "FLOAT32",
                "byte_order": "CDAB",
                "scale": 1.0,
                "unit": "m"
            },
            {
                "field_name": "H5",
                "register_type": "holding",
                "function_code": 3,
                "address": 656,
                "data_type": "FLOAT32",
                "byte_order": "CDAB",
                "scale": 1.0,
                "unit": "m"
            },
            {
                "field_name": "Point4Capture",
                "register_type": "holding",
                "function_code": 3,
                "address": 632,
                "data_type": "FLOAT32",
                "byte_order": "CDAB",
                "scale": 1.0,
                "unit": ""
            },
            {
                "field_name": "Point5Capture",
                "register_type": "holding",
                "function_code": 3,
                "address": 648,
                "data_type": "FLOAT32",
                "byte_order": "CDAB",
                "scale": 1.0,
                "unit": ""
            }
        ]

        # 3. Add registers if not already present
        for reg in registers_to_add:
            # Check if exists
            check_res = conn.execute(text(
                "SELECT id FROM modbus_registers WHERE device_id = :dev_id AND address = :addr LIMIT 1"
            ), {"dev_id": device_id, "addr": reg["address"]}).fetchone()

            if check_res:
                print(f"[INFO] Register {reg['field_name']} (Address {reg['address']}) already exists. Skipping.")
            else:
                conn.execute(text("""
                    INSERT INTO modbus_registers 
                    (device_id, field_name, register_type, address, data_type, byte_order, scale, unit, function_code)
                    VALUES 
                    (:dev_id, :field_name, :register_type, :address, :data_type, :byte_order, :scale, :unit, :function_code)
                """), {
                    "dev_id": device_id,
                    "field_name": reg["field_name"],
                    "register_type": reg["register_type"],
                    "address": reg["address"],
                    "data_type": reg["data_type"],
                    "byte_order": reg["byte_order"],
                    "scale": reg["scale"],
                    "unit": reg["unit"],
                    "function_code": reg["function_code"]
                })
                print(f"[SUCCESS] Added register {reg['field_name']} (Address {reg['address']}) to Twinstop.")

        conn.commit()

    print("[INFO] Re-syncing Telegraf configuration...")
    sync_telegraf_config()
    print("[SUCCESS] Telegraf configuration sync complete!")

if __name__ == "__main__":
    patch_twinstop()
