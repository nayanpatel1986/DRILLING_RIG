from database import SessionLocal
from db_models import ModbusRegister

db = SessionLocal()
device_id = 1 # Assuming Twinstop is device 1 based on frontend hardcoding
regs = db.query(ModbusRegister).filter(ModbusRegister.device_id == device_id).all()
print('Registers for device 1:')
for r in regs:
    print(f"- {r.field_name}: address={r.address}, byte_order={r.byte_order}")

# Just forcibly insert BH if it's missing, or update if we find a height field
new_reg = ModbusRegister(
    device_id=device_id,
    field_name='BH',
    register_type='holding',
    function_code=3,
    address=416,
    data_type='FLOAT32',
    byte_order='CDAB',
    scale=1.0,
    unit='m'
)
db.add(new_reg)
db.commit()
print('Added BH register to DB!')
db.close()
