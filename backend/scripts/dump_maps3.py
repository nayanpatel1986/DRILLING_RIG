import sqlite3

conn = sqlite3.connect('/app/database.db')
cursor = conn.cursor()

try:
    cursor.execute("SELECT witsml_mnemonic, app_parameter FROM witsml_channel_mappings;")
    rows = cursor.fetchall()
    print("PUMP PRESSURE MAPPINGS:")
    for r in rows:
        if 'PUMP' in r[1].upper() or 'PRESS' in r[1].upper() or 'STP' in r[1].upper() or 'SPP' in r[1].upper() or 'SPP' in r[0].upper():
            print(f"  Mnemonic: {r[0]} -> App Param: {r[1]}")
except Exception as e:
    print("Error:", e)

conn.close()
