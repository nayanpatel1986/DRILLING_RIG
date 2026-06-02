"""
Patch script: Update the existing DAQ-10 Modbus device registers
to WOH (addr 1018, CDAB, 0.453592 klb→ton) and WOB (addr 11102, CDAB, 0.453592 klb→ton).
Run inside the backend container:
    docker exec drillbit_backend python /app/patch_daq10.py
"""
import sys
from database import SessionLocal
from db_models import ModbusDevice, ModbusRegister

DAQ10_REGISTERS = [
    {"field_name": "WOH",   "register_type": "holding", "function_code": 3, "address": 1018,  "data_type": "FLOAT32", "byte_order": "CDAB", "scale": 0.453592, "unit": "ton"},
    {"field_name": "WOB",   "register_type": "holding", "function_code": 3, "address": 11102, "data_type": "FLOAT32", "byte_order": "CDAB", "scale": 0.453592, "unit": "ton"},
    {"field_name": "AI-3",  "register_type": "holding", "function_code": 3, "address": 4,     "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": ""},
    {"field_name": "AI-4",  "register_type": "holding", "function_code": 3, "address": 6,     "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": ""},
    {"field_name": "AI-5",  "register_type": "holding", "function_code": 3, "address": 8,     "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": ""},
    {"field_name": "AI-6",  "register_type": "holding", "function_code": 3, "address": 10,    "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": ""},
    {"field_name": "AI-7",  "register_type": "holding", "function_code": 3, "address": 12,    "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": ""},
    {"field_name": "AI-8",  "register_type": "holding", "function_code": 3, "address": 14,    "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": ""},
    {"field_name": "AI-9",  "register_type": "holding", "function_code": 3, "address": 16,    "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": ""},
    {"field_name": "AI-10", "register_type": "holding", "function_code": 3, "address": 18,    "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": ""},
]

def patch():
    db = SessionLocal()
    try:
        # Find the DAQ-10 device
        device = db.query(ModbusDevice).filter(ModbusDevice.device_type == "daq10").first()
        if not device:
            print("ERROR: No daq10 device found in the database.", file=sys.stderr)
            sys.exit(1)

        print(f"Found DAQ-10 device: '{device.name}' (id={device.id})")

        # Delete all existing registers for this device
        deleted = db.query(ModbusRegister).filter(ModbusRegister.device_id == device.id).delete()
        print(f"Deleted {deleted} old registers.")

        # Insert the correct registers
        for reg_data in DAQ10_REGISTERS:
            reg = ModbusRegister(device_id=device.id, **reg_data)
            db.add(reg)

        db.commit()
        print(f"Inserted {len(DAQ10_REGISTERS)} new registers successfully.")

        # Trigger Telegraf sync
        from services.telegraf_sync import sync_telegraf_config
        sync_telegraf_config()
        print("Telegraf config synced.")

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    patch()
