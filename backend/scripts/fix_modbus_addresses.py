import sqlite3

def update_db():
    try:
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        
        updates = [
            ("Point1Capture", 440),
            ("Point2Capture", 456),
            ("Point3Capture", 472),
            ("LiveEncounterCount", 408)
        ]
        
        for name, new_addr in updates:
            cursor.execute('''
                UPDATE modbus_registers 
                SET address = ? 
                WHERE name = ? AND device_id = 2
            ''', (new_addr, name))
            
            # Print feedback
            if cursor.rowcount > 0:
                print(f"Updated {name} to {new_addr}")
            else:
                print(f"Warning: {name} not found in database or no rows updated")
                
        conn.commit()
        print("\nDatabase updated successfully.")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    update_db()
