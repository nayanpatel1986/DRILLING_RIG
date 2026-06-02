"""
Patch script: Add physical Depth and BitDepth registers to the DAQ-10 device.
These are required for the new SET DEPTH dashboard functionality.
"""
import sys
import os

# Ensure the app directory is in the path
sys.path.insert(0, '/app')

try:
    from database import SessionLocal
    from db_models import ModbusDevice, ModbusRegister
    from services.telegraf_sync import sync_telegraf_config
except ImportError as e:
    print(f"Import Error: {e}. Are you running this inside the backend container?")
    sys.exit(1)

NEW_REGISTERS = [
    {"field_name": "Depth",    "register_type": "holding", "function_code": 3, "address": 1242,  "data_type": "FLOAT32", "byte_order": "CDAB", "scale": 0.3048, "unit": "m"},
    {"field_name": "BitDepth", "register_type": "holding", "function_code": 3, "address": 1234,  "data_type": "FLOAT32", "byte_order": "CDAB", "scale": 0.3048, "unit": "m"},
]

def patch():
    db = SessionLocal()
    try:
        device = db.query(ModbusDevice).filter(ModbusDevice.device_type == "daq10").first()
        if not device:
            print("ERROR: No DAQ-10 device found in database.")
            return

        print(f"Found DAQ-10 device: '{device.name}' (id={device.id})")

        added_count = 0
        for reg_data in NEW_REGISTERS:
            # Check if it already exists to avoid duplicates
            existing = db.query(ModbusRegister).filter(
                ModbusRegister.device_id == device.id,
                ModbusRegister.field_name == reg_data["field_name"]
            ).first()
            
            if not existing:
                db.add(ModbusRegister(device_id=device.id, **reg_data))
                print(f"Added register: {reg_data['field_name']} at address {reg_data['address']}")
                added_count += 1
            else:
                # Update existing if needed
                existing.address = reg_data["address"]
                existing.byte_order = reg_data["byte_order"]
                existing.scale = reg_data["scale"]
                print(f"Updated existing register: {reg_data['field_name']}")

        db.commit()
        print(f"Patched {added_count} new registers.")

        # Sync Telegraf
        sync_telegraf_config()
        print("Telegraf configuration synced and written.")

    except Exception as e:
        db.rollback()
        print(f"Patch Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    patch()
