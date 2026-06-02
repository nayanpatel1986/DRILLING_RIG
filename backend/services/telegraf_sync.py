"""
Telegraf Config Sync Engine
Generates telegraf.conf from Modbus device configuration stored in the database,
and restarts the Telegraf container so changes take effect immediately.
"""
import os
from database import SessionLocal
from db_models import ModbusDevice

# Path where telegraf.conf is mounted (shared volume between backend and telegraf)
TELEGRAF_CONF_PATH = os.getenv("TELEGRAF_CONF_PATH", "/telegraf-config/telegraf.conf")
# Also write to the host-mounted path so the user can see it on the host filesystem
HOST_TELEGRAF_CONF_PATH = "/host-telegraf-config/telegraf.conf"

# Map our DB data types to valid Telegraf inputs.modbus data types
DATA_TYPE_MAP = {
    "FLOAT32": "FLOAT32-IEEE",
    "FLOAT64": "FLOAT64-IEEE",
    "FLOAT16": "FLOAT16-IEEE",
    "INT16": "INT16",
    "INT32": "INT32",
    "INT64": "INT64",
    "UINT16": "UINT16",
    "UINT32": "UINT32",
    "UINT64": "UINT64",
}

# Map our byte_order to valid Telegraf options
BYTE_ORDER_MAP = {
    "ABCD": "ABCD",
    "DCBA": "DCBA",
    "BADC": "BADC",
    "CDAB": "CDAB",
    "AB": "AB",
    "BA": "BA",
}

DAQ10_MUD_VOLUME_FIELDS = {"TANK_1", "TANK_2", "TANK_3", "TRIP_TNK"}


def _build_address_list(address, data_type):
    """Build the address array for a register based on its data type."""
    if data_type in ("FLOAT32", "FLOAT32-IEEE", "INT32", "UINT32"):
        return f"[{address}, {address+1}]"
    elif data_type in ("FLOAT64", "FLOAT64-IEEE", "INT64", "UINT64"):
        return f"[{address}, {address+1}, {address+2}, {address+3}]"
    else:
        return f"[{address}]"


def generate_telegraf_conf(db) -> str:
    """Generate the full telegraf.conf content from the database."""
    
    # ── Agent section (static) ──
    conf = """[agent]
  interval = "500ms"
  round_interval = true
  metric_batch_size = 1000
  metric_buffer_limit = 10000
  collection_jitter = "0s"
  flush_interval = "500ms"
  flush_jitter = "0s"
  precision = ""
  hostname = "modbus"
  omit_hostname = false

[[inputs.internal]]
  collect_memstats = true

[[outputs.influxdb_v2]]
  urls = ["http://influxdb:8086"]
  token = "my-super-secret-auth-token"
  organization = "nov_rig"
  bucket = "rig_data"

"""
    
    # ── Read all enabled Modbus devices ──
    devices = db.query(ModbusDevice).filter(ModbusDevice.is_enabled == True).all()
    
    if not devices:
        conf += "# No Modbus devices configured or enabled.\n"
        return conf
    
    for device in devices:
        if not device.ip_address:
            conf += f"# Skipped '{device.name}': no IP address configured\n\n"
            continue
        
        # Group registers by type or function code
        holding_regs = [r for r in device.registers if r.function_code == 3 or (r.function_code is None and r.register_type == "holding")]
        input_regs = [r for r in device.registers if r.function_code == 4 or (r.function_code is None and r.register_type == "input")]
        coil_regs = [r for r in device.registers if r.function_code == 1 or (r.function_code is None and r.register_type == "coil")]
        discrete_regs = [r for r in device.registers if r.function_code == 2 or (r.function_code is None and r.register_type == "discrete")]
        
        if not device.registers:
            conf += f"# Skipped '{device.name}': no registers configured\n\n"
            continue
        
        # ── Device header ──
        conf += f"# ── {device.name} ({device.device_type}) ──\n"
        conf += f"[[inputs.modbus]]\n"
        conf += f'  name = "{device.measurement_name}"\n'
        conf += f'  slave_id = {device.slave_id}\n'
        conf += f'  timeout = "{device.timeout}"\n'
        conf += f'  name_override = "modbus"\n'
        conf += f'  configuration_type = "register"\n'
        
        if device.protocol == "tcp":
            conf += f'  controller = "tcp://{device.ip_address}:{device.port}"\n'
        else:
            conf += f'  controller = "file:///dev/ttyUSB0"\n'
            conf += f'  baud_rate = {device.baud_rate}\n'
            conf += f'  data_bits = 8\n'
            conf += f'  parity = "N"\n'
            conf += f'  stop_bits = 1\n'
        
        conf += f'\n'
        
        # ── Holding registers as inline table array ──
        if holding_regs:
            conf += '  holding_registers = [\n'
            for reg in holding_regs:
                dt = DATA_TYPE_MAP.get(reg.data_type, reg.data_type)
                bo = BYTE_ORDER_MAP.get(reg.byte_order, "ABCD")
                scale = reg.scale
                if scale == 0.0:
                    scale = 1.0  # Safety fallback: Telegraf fails on scale=0.0
                # Use 2-char byte_order for 16-bit types, 4-char for 32/64-bit
                if dt in ("INT16", "UINT16", "FLOAT16-IEEE"):
                    bo = bo[:2] if len(bo) >= 2 else bo
                addr = _build_address_list(reg.address, reg.data_type)
                conf += f'    {{ name = "{reg.field_name}", byte_order = "{bo}", data_type = "{dt}", scale = {scale}, address = {addr} }},\n'
            conf += '  ]\n\n'
        
        # ── Input registers as inline table array ──
        if input_regs:
            conf += '  input_registers = [\n'
            for reg in input_regs:
                dt = DATA_TYPE_MAP.get(reg.data_type, reg.data_type)
                bo = BYTE_ORDER_MAP.get(reg.byte_order, "ABCD")
                scale = reg.scale
                if scale == 0.0:
                    scale = 1.0
                if dt in ("INT16", "UINT16", "FLOAT16-IEEE"):
                    bo = bo[:2] if len(bo) >= 2 else bo
                addr = _build_address_list(reg.address, reg.data_type)
                conf += f'    {{ name = "{reg.field_name}", byte_order = "{bo}", data_type = "{dt}", scale = {scale}, address = {addr} }},\n'
            conf += '  ]\n\n'
        
        # ── Coils ──
        if coil_regs:
            conf += '  coils = [\n'
            for reg in coil_regs:
                conf += f'    {{ name = "{reg.field_name}", address = [{reg.address}] }},\n'
            conf += '  ]\n\n'
        
        # ── Discrete inputs ──
        if discrete_regs:
            conf += '  discrete_inputs = [\n'
            for reg in discrete_regs:
                conf += f'    {{ name = "{reg.field_name}", address = [{reg.address}] }},\n'
            conf += '  ]\n\n'
        
        # Tags
        conf += f'  [inputs.modbus.tags]\n'
        conf += f'    device_name = "{device.name}"\n'
        conf += f'    device_type = "{device.device_type}"\n'
        conf += f'    rig_id = "E-1400-1"\n'
        conf += f'\n'
    
    return conf


def sync_telegraf_config():
    """Read DB, generate telegraf.conf, write it, and restart Telegraf container."""
    db = SessionLocal()
    try:
        conf_content = generate_telegraf_conf(db)
        
        # Write to the shared volume
        os.makedirs(os.path.dirname(TELEGRAF_CONF_PATH), exist_ok=True)
        with open(TELEGRAF_CONF_PATH, 'w') as f:
            f.write(conf_content)
        
        print(f"TELEGRAF SYNC: Config written to {TELEGRAF_CONF_PATH}", flush=True)
        
        # Also write to the host-visible path
        try:
            os.makedirs(os.path.dirname(HOST_TELEGRAF_CONF_PATH), exist_ok=True)
            with open(HOST_TELEGRAF_CONF_PATH, 'w') as f:
                f.write(conf_content)
            print(f"TELEGRAF SYNC: Config also written to {HOST_TELEGRAF_CONF_PATH}", flush=True)
        except Exception as e:
            print(f"TELEGRAF SYNC: Could not write host copy: {e}", flush=True)
        
        # Restart logic removed: The new secure Telegraf Reloader (reloader.sh) 
        # now handles this automatically by watching for file changes.
        print("TELEGRAF SYNC: Config updated. Reloader sidecar will restart Telegraf shortly.", flush=True)
        
    except Exception as e:
        print(f"TELEGRAF SYNC ERROR: {e}", flush=True)
        raise e
    finally:
        db.close()
