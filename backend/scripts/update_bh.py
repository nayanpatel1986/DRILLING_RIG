from database import SessionLocal
from db_models import ModbusRegister
db = SessionLocal()
reg = db.query(ModbusRegister).filter(ModbusRegister.field_name == 'BLOCKHEIGHT').first()
if reg:
    reg.field_name = 'BH'
    reg.address = 416
    reg.byte_order = 'CDAB'
    reg.unit = 'm'
    db.commit()
    print('Updated existing BLOCKHEIGHT to BH:', (reg.field_name, reg.address, reg.byte_order))
else:
    # check if BH already exists
    bh_reg = db.query(ModbusRegister).filter(ModbusRegister.field_name == 'BH').first()
    if bh_reg:
        bh_reg.address = 416
        bh_reg.byte_order = 'CDAB'
        bh_reg.unit = 'm'
        db.commit()
        print('Updated existing BH:', (bh_reg.field_name, bh_reg.address, bh_reg.byte_order))
    else:
        print('Neither BLOCKHEIGHT nor BH found in DB. Might need to add it manually or recreate device.')
db.close()
