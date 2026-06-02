import sqlite3

conn = sqlite3.connect('/app/database.db')
cursor = conn.cursor()

try:
    cursor.execute("SELECT witsml_mnemonic, app_parameter FROM witsml_channel_mappings;")
    rows = cursor.fetchall()
    with open('/app/maps.log', 'w') as f:
        f.write("MAPPINGS:\n")
        for r in rows:
            f.write(f"  {r[0]} -> {r[1]}\n")
except Exception as e:
    print("Error:", e)

conn.close()
