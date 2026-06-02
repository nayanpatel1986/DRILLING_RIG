import sqlite3
import os

db_path = "c:\\Users\\NOVCAL\\Drilling-Rig\\backend\\database.db"

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        # Add function_code column if it doesn't exist
        cursor.execute("ALTER TABLE modbus_registers ADD COLUMN function_code INTEGER")
        print("Column 'function_code' added successfully.")
        
        # Populate initial values based on register_type
        cursor.execute("UPDATE modbus_registers SET function_code = 1 WHERE register_type = 'coil'")
        cursor.execute("UPDATE modbus_registers SET function_code = 3 WHERE register_type = 'holding'")
        cursor.execute("UPDATE modbus_registers SET function_code = 4 WHERE register_type = 'input'")
        cursor.execute("UPDATE modbus_registers SET function_code = 2 WHERE register_type = 'discrete'")
        print("Initial function_code values populated.")
        
        conn.commit()
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column 'function_code' already exists.")
        else:
            print(f"Error: {e}")
    finally:
        conn.close()
else:
    print(f"Database not found at {db_path}")
