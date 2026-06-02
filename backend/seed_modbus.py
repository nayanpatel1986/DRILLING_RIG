"""
DrillBit Modbus Seed Script
---------------------------
Runs on every container startup.
Seeds default Modbus configurations (like DAQ-10) upon first deployment,
so operators don't have to manually configure them on every new installation.
"""

import os
import sys

sys.path.insert(0, '/app')

from database import SessionLocal, engine, Base
from db_models import ModbusDevice, ModbusRegister
from services.modbus_config import DEFAULT_REGISTERS
from services.telegraf_sync import sync_telegraf_config


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Check if any Modbus device exists
        if db.query(ModbusDevice).count() > 0:
            print("[Modbus Seed] Devices already exist. Skipping seed.", flush=True)
            return

        print("[Modbus Seed] Fresh installation detected. Seeding DEFAULT modbus devices...", flush=True)
        
        # We will securely seed DAQ-10 out of the box because it drives the main Drilling Twin
        daq10_device = ModbusDevice(
            name="DAQ-10",
            device_type="daq10",
            is_enabled=False,  # Start disabled so it doesn't poll an invalid IP
            ip_address="192.168.1.10", # Placeholder IP
            port=502,
            slave_id=1,
            protocol="tcp",
            timeout="1s",
            measurement_name="rig_sensors"
        )
        db.add(daq10_device)
        db.flush() # Get DAQ-10 ID
        
        daq10_regs = DEFAULT_REGISTERS.get('daq10', [])
        for reg in daq10_regs:
            db.add(ModbusRegister(device_id=daq10_device.id, **reg))
            
        db.commit()
        print("[Modbus Seed] Successfully seeded DAQ-10 and its 25 telemetry channels.", flush=True)
        sync_telegraf_config()

    except Exception as e:
        db.rollback()
        print(f"[Modbus Seed Error] {e}", flush=True)
    finally:
        db.close()

if __name__ == "__main__":
    seed()
