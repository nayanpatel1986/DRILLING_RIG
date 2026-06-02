"""
Patch script: Replace all registers on the existing DAQ-10 device with
the full 25-register map (Hook Load, Pumps, Spare, Rotary, Gas, Mud).
Run:  docker exec -u root drillbit_backend python /app/patch_daq10_v4.py
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
    # ── Rotary Performance ─────────────────────────────────────────────────────
    {"field_name": "RPM",      "register_type": "holding", "function_code": 3, "address": 36,    "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": "rpm"},
    {"field_name": "TORQUE",   "register_type": "holding", "function_code": 3, "address": 38,    "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": "kNm"},
    {"field_name": "RAP",      "register_type": "holding", "function_code": 3, "address": 40,    "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": "psi"},
    {"field_name": "TONG_TRQ", "register_type": "holding", "function_code": 3, "address": 42,    "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": "kNm"},
    # ── Gas Monitoring ─────────────────────────────────────────────────────────
    {"field_name": "LEL_SS",   "register_type": "holding", "function_code": 3, "address": 44,    "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": "%"},
    {"field_name": "LEL_BN",   "register_type": "holding", "function_code": 3, "address": 46,    "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": "%"},
    {"field_name": "H2S_SS",   "register_type": "holding", "function_code": 3, "address": 48,    "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": "ppm"},
    {"field_name": "H2S_BN",   "register_type": "holding", "function_code": 3, "address": 50,    "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": "ppm"},
    # ── Mud Volume ─────────────────────────────────────────────────────────────
    {"field_name": "TANK_1",   "register_type": "holding", "function_code": 3, "address": 52,    "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": "m³"},
    {"field_name": "TANK_2",   "register_type": "holding", "function_code": 3, "address": 54,    "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": "m³"},
    {"field_name": "TANK_3",   "register_type": "holding", "function_code": 3, "address": 56,    "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": "m³"},
    {"field_name": "TRIP_TNK", "register_type": "holding", "function_code": 3, "address": 58,    "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": "m³"},
    {"field_name": "FLOW_RT",  "register_type": "holding", "function_code": 3, "address": 60,    "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": "gpm"},
    {"field_name": "FLOW_OUT", "register_type": "holding", "function_code": 3, "address": 62,    "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": "%"},
    {"field_name": "GAIN_LSS", "register_type": "holding", "function_code": 3, "address": 64,    "data_type": "FLOAT32", "byte_order": "ABCD", "scale": 1.0,       "unit": "bbl"},
    {"field_name": "BH",       "register_type": "holding", "function_code": 3, "address": 1100,  "data_type": "FLOAT32", "byte_order": "CDAB", "scale": 1.0,       "unit": "m"},
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
    except Exception as e:
        db.rollback(); print(f"ERROR: {e}", file=sys.stderr); sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    patch()
