import sqlite3
import os

db_path = "backend/database.db"

if os.path.exists(db_path):
    print(f"Migrating database: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Add min_value column
        cursor.execute("ALTER TABLE modbus_registers ADD COLUMN min_value FLOAT")
        print("- Added column 'min_value' to 'modbus_registers'")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("- Column 'min_value' already exists.")
        else:
            print(f"- Error adding 'min_value': {e}")
            
    try:
        # Add max_value column
        cursor.execute("ALTER TABLE modbus_registers ADD COLUMN max_value FLOAT")
        print("- Added column 'max_value' to 'modbus_registers'")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("- Column 'max_value' already exists.")
        else:
            print(f"- Error adding 'max_value': {e}")
            
    conn.commit()
    conn.close()
    print("Migration complete.")
else:
    print(f"Database not found at {db_path}. Skipping migration (SQLAlchemy will create it on startup).")
