import sys
from database import SessionLocal
from db_models import ModbusDevice, ModbusRegister

def add_extra():
    db = SessionLocal()
    try:
        dev = db.query(ModbusDevice).filter(ModbusDevice.device_type == 'twinstop').first()
        if not dev:
            print("Twinstop not found")
            return

        extra = [
            {"field": "Set_Zero", "type": "coil", "fc": 5, "addr": 402, "dt": "UINT16"},
            {"field": "Known_Height", "type": "holding", "fc": 16, "addr": 264, "dt": "FLOAT32", "u": "ft"},
            {"field": "EDMSCOUNT", "type": "holding", "fc": 3, "addr": 204, "dt": "FLOAT32"},
            {"field": "BLOCKHEIGHT", "type": "holding", "fc": 3, "addr": 208, "dt": "FLOAT32", "u": "ft"},
        ]

        for item in extra:
            # Clean up if exists
            db.query(ModbusRegister).filter(
                ModbusRegister.device_id == dev.id,
                ModbusRegister.address == item['addr'],
                ModbusRegister.register_type == item['type']
            ).delete()
            
            db.add(ModbusRegister(
                device_id=dev.id,
                field_name=item['field'],
                register_type=item['type'],
                function_code=item['fc'],
                address=item['addr'],
                data_type=item['dt'],
                unit=item.get('u'),
                scale=1.0
            ))
            print(f"Added {item['field']} at {item['addr']}")

        db.commit()
        print("Extra registers added.")

    finally:
        db.close()

if __name__ == "__main__":
    add_extra()
