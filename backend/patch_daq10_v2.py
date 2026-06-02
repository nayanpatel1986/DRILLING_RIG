"""
Patch script: Replace all registers on the existing DAQ-10 device with
the full 10-register pump+hookload map.
Run:  docker exec -u root drillbit_backend python /app/patch_daq10_v2.py
"""
import sys
sys.path.insert(0, '/app')
from database import SessionLocal
from db_models import ModbusDevice, ModbusRegister

NEW_REGISTERS = [
    # ── Hook Load ──────────────────────────────────────────────────────────────
    {"field_name": "WOH",      "register_type": "holding", "function_code": 3, "address": 1018,  "data_type": "FLOAT32", "byte_order": "CDAB", "scale": 0.453592, "unit": "ton"},
    {"field_name": "WOB",      "register_type": "holding", "function_code": 3, "address": 11102, "data_type": "FLOAT32", "byte_order": "CDAB", "scale": 0.453592, "unit": "ton"},
    # ── Mud Pump ───────────────────────────────────────────────────────────────
    {"field_name": "MP1_SPM",  "register_type": "holding", "function_code": 3, "address": 20,    "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": "spm"},
    {"field_name": "MP2_SPM",  "register_type": "holding", "function_code": 3, "address": 22,    "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": "spm"},
    {"field_name": "STROKES1", "register_type": "holding", "function_code": 3, "address": 24,    "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": ""},
    {"field_name": "STROKES2", "register_type": "holding", "function_code": 3, "address": 26,    "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": ""},
    {"field_name": "STP_PRS",  "register_type": "holding", "function_code": 3, "address": 28,    "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": "psi"},
    {"field_name": "TOT_STRK", "register_type": "holding", "function_code": 3, "address": 30,    "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": ""},
    {"field_name": "TOT_SPM",  "register_type": "holding", "function_code": 3, "address": 32,    "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": "spm"},
    # ── Spare ──────────────────────────────────────────────────────────────────
    {"field_name": "AI-10",    "register_type": "holding", "function_code": 3, "address": 34,    "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": ""},
]

def patch():
    db = SessionLocal()
    try:
        device = db.query(ModbusDevice).filter(ModbusDevice.device_type == "daq10").first()
        if not device:
            print("ERROR: No daq10 device found.", file=sys.stderr); sys.exit(1)
        print(f"Found DAQ-10 device: '{device.name}' (id={device.id})")

        deleted = db.query(ModbusRegister).filter(ModbusRegister.device_id == device.id).delete()
        print(f"Deleted {deleted} old registers.")

        for reg_data in NEW_REGISTERS:
            db.add(ModbusRegister(device_id=device.id, **reg_data))

        db.commit()
        print(f"Inserted {len(NEW_REGISTERS)} new registers.")

        from services.telegraf_sync import sync_telegraf_config
        sync_telegraf_config()
        print("Telegraf config synced.")

        # Print summary
        print("\nNew register map:")
        roles = ["→ HookLoad", "→ WOB", "→ SPM1", "→ SPM2", "→ PumpStrokes1",
                 "→ PumpStrokes2", "→ StandpipePressure", "→ TotalStrokes", "→ TotalSPM", "(spare)"]
        regs = db.query(ModbusRegister).filter(ModbusRegister.device_id == device.id).order_by(ModbusRegister.id).all()
        for i, r in enumerate(regs):
            print(f"  [{i+1}] {r.field_name:12s} addr={r.address:6d}  {roles[i]}")
    except Exception as e:
        db.rollback(); print(f"ERROR: {e}", file=sys.stderr); sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    patch()
