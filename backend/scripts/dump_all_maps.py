import sqlite3

conn = sqlite3.connect('/app/database.db')
cursor = conn.cursor()

try:
    cursor.execute("SELECT witsml_mnemonic, app_parameter FROM witsml_channel_mappings;")
    rows = cursor.fetchall()
    print("ALL MAPPINGS:")
    for r in rows:
        print(f"  {r[0]} -> {r[1]}")
except Exception as e:
    print("Error:", e)

conn.close()
