import asyncio
from sqlalchemy.orm import Session
from database import SessionLocal
from db_models import ModbusDevice
from services.modbus_control import modbus_writer

async def run():
    db: Session = SessionLocal()
    device = db.query(ModbusDevice).filter(ModbusDevice.id == 1).first()
    if not device:
        print("Device 1 not found")
        return
    
    print(f"Testing device {device.name} at {device.ip_address}:{device.port} SlaveID {device.slave_id}")
    res1 = await modbus_writer.write_register(device.ip_address, device.port, device.slave_id, 36, 1)
    print("Write 1:", res1)
    await asyncio.sleep(0.5)
    res0 = await modbus_writer.write_register(device.ip_address, device.port, device.slave_id, 36, 0)
    print("Write 0:", res0)

asyncio.run(run())
