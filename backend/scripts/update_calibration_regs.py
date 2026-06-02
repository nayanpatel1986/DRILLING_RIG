import sys
import os

# Internal imports from the app structure
try:
    from database import SessionLocal
    from db_models import ModbusDevice, ModbusRegister
except ImportError:
    print("Run this from the backend directory")
    sys.exit(1)

def update_twinstop():
    db = SessionLocal()
    try:
        # Find the Twinstop device
        dev = db.query(ModbusDevice).filter(ModbusDevice.device_type == 'twinstop').first()
        if not dev:
            print("Twinstop device not found in database.")
            return

        print(f"Updating registers for {dev.name} (ID: {dev.id})")

        # 1. Update Existing Holding Registers
        # C1, C2, C3 are Read-Only (03)
        # H1, H2, H3 are Writeable (16)
        
        # Address mapping
        reals = [
            {"field": "C1", "addr": 440, "fc": 3},
            {"field": "H1", "addr": 448, "fc": 16},
            {"field": "C2", "addr": 456, "fc": 3},
            {"field": "H2", "addr": 464, "fc": 16},
            {"field": "C3", "addr": 472, "fc": 3},
            {"field": "H3", "addr": 480, "fc": 16},
        ]

        for item in reals:
            reg = db.query(ModbusRegister).filter(
                ModbusRegister.device_id == dev.id,
                ModbusRegister.address == item['addr'],
                ModbusRegister.register_type == 'holding'
            ).first()
            
            if reg:
                reg.field_name = item['field']
                reg.function_code = item['fc']
                print(f"Updated {item['field']} at {item['addr']} to FC {item['fc']}")
            else:
                db.add(ModbusRegister(
                    device_id=dev.id,
                    field_name=item['field'],
                    register_type='holding',
                    function_code=item['fc'],
                    address=item['addr'],
                    data_type='FLOAT32',
                    scale=1.0
                ))
                print(f"Added MISSING register {item['field']} at {item['addr']}")

        # 2. Add New Coils
        coils = [
            {"field": "Capture_C1", "addr": 480},
            {"field": "Capture_C2", "addr": 481},
            {"field": "Capture_C3", "addr": 482},
            {"field": "Cal_Reset", "addr": 483},
            {"field": "SinglePointCalDone", "addr": 403},
        ]

        for item in coils:
            # Delete any existing before re-adding to ensure clarity
            db.query(ModbusRegister).filter(
                ModbusRegister.device_id == dev.id,
                ModbusRegister.address == item['addr'],
                ModbusRegister.register_type == 'coil'
            ).delete()
            
            db.add(ModbusRegister(
                device_id=dev.id,
                field_name=item['field'],
                register_type='coil',
                function_code=5, # Write Single Coil
                address=item['addr'],
                data_type='UINT16', # Standard for coils in this DB
                scale=1.0
            ))
            print(f"Injected Coil {item['field']} at address {item['addr']}")

        db.commit()
        print("Done.")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    update_twinstop()
