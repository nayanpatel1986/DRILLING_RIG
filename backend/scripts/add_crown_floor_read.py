"""
Add readable (function_code=3) versions of Crownomatic and Flooromatic registers
so Telegraf can poll them from the PLC and the frontend can use their live values.
"""
import sys
sys.path.insert(0, '.')

from database import SessionLocal
from db_models import ModbusDevice, ModbusRegister

db = SessionLocal()

# Find twinstop device
device = db.query(ModbusDevice).filter(ModbusDevice.device_type == "twinstop").first()
if not device:
    print("No twinstop device found!")
    sys.exit(1)

print(f"Found twinstop device: {device.name} (ID: {device.id})")

# Check existing registers
existing = db.query(ModbusRegister).filter(
    ModbusRegister.device_id == device.id
).all()

print(f"\nCurrent registers ({len(existing)}):")
for r in existing:
    print(f"  {r.field_name:30s} addr={r.address:5d} fc={r.function_code} dt={r.data_type} bo={r.byte_order}")

# Check if readable Crownomatic/Flooromatic already exist with fc=3
crown_read = [r for r in existing if r.field_name == "Crownomatic" and r.function_code == 3]
floor_read = [r for r in existing if r.field_name == "Flooromatic" and r.function_code == 3]

changes = False

# Update existing Crownomatic from fc=16 to fc=3 so Telegraf reads it
crown_write = [r for r in existing if r.field_name == "Crownomatic" and r.function_code == 16]
if crown_write and not crown_read:
    reg = crown_write[0]
    reg.function_code = 3
    reg.byte_order = "CDAB"
    print(f"\n✓ Updated Crownomatic register to function_code=3, byte_order=CDAB")
    changes = True
elif crown_read:
    print(f"\n✓ Crownomatic already readable (fc=3)")

# Update existing Flooromatic from fc=16 to fc=3 so Telegraf reads it 
floor_write = [r for r in existing if r.field_name == "Flooromatic" and r.function_code == 16]
if floor_write and not floor_read:
    reg = floor_write[0]
    reg.function_code = 3
    reg.byte_order = "CDAB"
    print(f"✓ Updated Flooromatic register to function_code=3, byte_order=CDAB")
    changes = True
elif floor_read:
    print(f"✓ Flooromatic already readable (fc=3)")

if changes:
    db.commit()
    print("\n✅ Database updated. Now syncing Telegraf config...")
    
    from services.telegraf_sync import sync_telegraf_config
    sync_telegraf_config()
    
    print("✅ Done! Telegraf will now poll Crownomatic and Flooromatic from PLC.")
else:
    print("\nNo changes needed.")

db.close()
