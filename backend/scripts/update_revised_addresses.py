from database import SessionLocal
from db_models import ModbusDevice, ModbusRegister

def update_addresses():
    db = SessionLocal()
    try:
        dev = db.query(ModbusDevice).filter(ModbusDevice.device_type == 'twinstop').first()
        if not dev:
            print("Twinstop not found")
            return

        # Mapping for the new coils
        updates = [
            {"field": "Capture_C1", "addr": 240},
            {"field": "Capture_C2", "addr": 241},
            {"field": "Capture_C3", "addr": 242},
            {"field": "Cal_Reset", "addr": 243},
            {"field": "Set_Zero", "addr": 202},
            {"field": "Calibrate_At_Known_Height", "addr": 203},
        ]

        # First, delete any coils that used to have the OLD addresses to prevent conflicts
        # Old addresses were 480, 481, 482, 483, 403, 402
        old_addrs = [480, 481, 482, 483, 403, 402]
        db.query(ModbusRegister).filter(
            ModbusRegister.device_id == dev.id,
            ModbusRegister.address.in_(old_addrs),
            ModbusRegister.register_type == 'coil'
        ).delete(synchronize_session=False)

        # Now update or add the new ones
        for item in updates:
            # Check if exists by name
            reg = db.query(ModbusRegister).filter(
                ModbusRegister.device_id == dev.id,
                ModbusRegister.field_name == item['field']
            ).first()
            
            if reg:
                reg.address = item['addr']
                reg.register_type = 'coil'
                reg.function_code = 5
                reg.data_type = 'UINT16'
                reg.byte_order = 'None' # Clear byte order for coils if needed
                print(f"Updated {item['field']} to address {item['addr']}")
            else:
                db.add(ModbusRegister(
                    device_id=dev.id,
                    field_name=item['field'],
                    register_type='coil',
                    function_code=5,
                    address=item['addr'],
                    data_type='UINT16',
                    scale=1.0
                ))
                print(f"Added {item['field']} at address {item['addr']}")

        # Ensure known height / edms / blockheight are correct
        # EDMSCOUNT 204, BLOCKHEIGHT 208, Known_Height 264
        holds = [
            {"field": "Known_Height", "addr": 264, "fc": 16},
            {"field": "EDMSCOUNT", "addr": 204, "fc": 3},
            {"field": "BLOCKHEIGHT", "addr": 208, "fc": 3},
        ]
        for item in holds:
            reg = db.query(ModbusRegister).filter(
                ModbusRegister.device_id == dev.id,
                ModbusRegister.field_name == item['field']
            ).first()
            if reg:
                reg.address = item['addr']
                reg.function_code = item['fc']
                print(f"Verified Holding {item['field']} at {item['addr']}")

        db.commit()
        print("Address updates completed.")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    update_addresses()
