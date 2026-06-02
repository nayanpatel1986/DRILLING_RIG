import os
import sys
import traceback

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from database import SessionLocal
from db_models import WitsmlConfig, WitsmlChannelMapping

try:
    db = SessionLocal()
    mappings = db.query(WitsmlChannelMapping).all()
    with open('/app/maps.log', 'w') as f:
        f.write("ALL MAPPINGS:\n")
        for m in mappings:
            f.write(f"  Mnemonic: {m.witsml_mnemonic} -> App Param: {m.app_parameter}\n")
        
        if not mappings:
            f.write("No mappings found in the database.\n")
            
        config = db.query(WitsmlConfig).filter(WitsmlConfig.is_active == True).first()
        if config:
            f.write(f"\nActive Config: {config.name} (ID: {config.id})\n")
            f.write(f"  Server: {config.server_url}\n")
            f.write(f"  Well UID: {config.well_uid}, Wellbore UID: {config.wellbore_uid}, Log UID: {config.log_uid}\n")
        else:
            f.write("\nNo active WITSML configuration found.\n")
    print("SUCCESS: Wrote mappings to /app/maps.log")
    db.close()
except Exception:
    with open('/app/maps.log', 'w') as f:
        f.write("ERROR DURING DB ACCESS:\n")
        traceback.print_exc(file=f)
    print("FAILED: Check /app/maps.log for traceback")
