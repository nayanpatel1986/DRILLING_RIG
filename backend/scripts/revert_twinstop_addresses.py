from database import SessionLocal
from db_models import ModbusDevice, ModbusRegister

def revert_addresses():
    db = SessionLocal()
    try:
        dev = db.query(ModbusDevice).filter(ModbusDevice.device_type == 'twinstop').first()
        if not dev:
            print("Twinstop not found")
            return

        reverts = [
            {"field": "Capture_C1", "addr": 480},
            {"field": "Capture_C2", "addr": 481},
            {"field": "Capture_C3", "addr": 482},
            {"field": "Cal_Reset", "addr": 483},
            {"field": "Set_Zero", "addr": 402},
            {"field": "Calibrate_At_Known_Height", "addr": 403},
        ]

        # Delete the ones we just added / moved to prevent conflicts
        new_addrs = [240, 241, 242, 243, 202, 203]
        db.query(ModbusRegister).filter(
            ModbusRegister.device_id == dev.id,
            ModbusRegister.address.in_(new_addrs),
            ModbusRegister.register_type == 'coil'
        ).delete(synchronize_session=False)

        # Re-add or update to the original addresses
        for item in reverts:
            reg = db.query(ModbusRegister).filter(
                ModbusRegister.device_id == dev.id,
                ModbusRegister.field_name == item['field']
            ).first()
            
            if reg:
                reg.address = item['addr']
                reg.register_type = 'coil'
                reg.function_code = 5
                reg.data_type = 'UINT16'
                print(f"Reverted {item['field']} to address {item['addr']}")
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
                print(f"Re-added {item['field']} at address {item['addr']}")

        db.commit()
        print("Revert completed.")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    revert_addresses()
