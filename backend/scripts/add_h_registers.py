import sys
sys.path.insert(0, '.')

from database import SessionLocal
from db_models import ModbusDevice, ModbusRegister

db = SessionLocal()

device = db.query(ModbusDevice).filter(ModbusDevice.device_type == "twinstop").first()
if not device:
    print("No twinstop device found!")
    sys.exit(1)

h_configs = [
    {"field_name": "H1", "address": 448},
    {"field_name": "H2", "address": 464},
    {"field_name": "H3", "address": 480},
]

for config in h_configs:
    existing = db.query(ModbusRegister).filter(
        ModbusRegister.device_id == device.id,
        ModbusRegister.field_name == config["field_name"]
    ).first()
    
    if not existing:
        print(f"Adding {config['field_name']} at address {config['address']}")
        new_reg = ModbusRegister(
            device_id=device.id,
            field_name=config["field_name"],
            register_type="holding",
            address=config["address"],
            function_code=3,
            data_type="FLOAT32",
            scale=1.0,
            byte_order="CDAB",
            unit="m"
        )
        db.add(new_reg)
    else:
        print(f"{config['field_name']} already exists at address {existing.address}")
        existing.function_code = 3
        existing.byte_order = "CDAB"
        existing.address = config["address"] # ensure address is correct

db.commit()

from services.telegraf_sync import sync_telegraf_config
sync_telegraf_config()
print("Registers added/updated and Telegraf synced.")
db.close()
