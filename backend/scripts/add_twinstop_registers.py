import sqlite3
import os

db_path = r"c:\Users\NOVCAL\Drilling-Rig\backend\database.db"

new_registers = [
    {"field_name": "C1", "register_type": "holding", "function_code": 3, "address": 440, "data_type": "FLOAT32", "scale": 1.0, "unit": ""},
    {"field_name": "H1", "register_type": "holding", "function_code": 3, "address": 448, "data_type": "FLOAT32", "scale": 1.0, "unit": ""},
    {"field_name": "C2", "register_type": "holding", "function_code": 3, "address": 456, "data_type": "FLOAT32", "scale": 1.0, "unit": ""},
    {"field_name": "H2", "register_type": "holding", "function_code": 3, "address": 464, "data_type": "FLOAT32", "scale": 1.0, "unit": ""},
    {"field_name": "C3", "register_type": "holding", "function_code": 3, "address": 472, "data_type": "FLOAT32", "scale": 1.0, "unit": ""},
    {"field_name": "H3", "register_type": "holding", "function_code": 3, "address": 480, "data_type": "FLOAT32", "scale": 1.0, "unit": ""},
]

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Find the twinstop device
    cursor.execute("SELECT id FROM modbus_devices WHERE device_type = 'twinstop'")
    devices = cursor.fetchall()
    
    if not devices:
        print("No 'twinstop' device found in database.")
    else:
        for (device_id,) in devices:
            print(f"Adding registers to twinstop device (ID: {device_id})...")
            for reg in new_registers:
                # Check if it already exists
                cursor.execute("SELECT id FROM modbus_registers WHERE device_id = ? AND field_name = ?", (device_id, reg["field_name"]))
                if cursor.fetchone():
                    print(f"  - {reg['field_name']} already exists. Skipping.")
                else:
                    cursor.execute("""
                        INSERT INTO modbus_registers 
                        (device_id, field_name, register_type, function_code, address, data_type, scale, unit, byte_order)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ABCD')
                    """, (device_id, reg["field_name"], reg["register_type"], reg["function_code"], reg["address"], reg["data_type"], reg["scale"], reg["unit"]))
                    print(f"  - Added {reg['field_name']} at address {reg['address']}")
        
        conn.commit()
        print("Done.")
    
    conn.close()
else:
    print(f"Database not found at {db_path}")
