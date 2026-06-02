import os
os.environ["DATABASE_URL"] = "postgresql://admin:password123@postgres:5432/rig_manager"
from database import SessionLocal
from db_models import WitsmlConfig
from witsml.client import WitsmlClient

db = SessionLocal()
config = db.query(WitsmlConfig).filter(WitsmlConfig.is_active == True).first()
if config:
    print(f"Active Config: {config.name}, Well: {config.well_uid}, Wellbore: {config.wellbore_uid}, Log: {config.log_uid}")
    client = WitsmlClient(config.server_url, config.username, config.password)
    if client.is_connected:
        print("Connected.")
        
        # Test Query
        query = f'''<logs xmlns="http://www.witsml.org/schemas/131" version="1.3.1">
            <log uidWell="{config.well_uid}" uidWellbore="{config.wellbore_uid}" uid="{config.log_uid}">
                <name/>
                <startDateTimeIndex/>
                <endDateTimeIndex/>
            </log>
        </logs>'''
        try:
            out = client._zeep_client.service.WMLS_GetFromStore(
                WMLtypeIn='log',
                QueryIn=query,
                OptionsIn='returnElements=all',
                CapabilitiesIn=''
            )
            print("Query Result Code:", getattr(out, 'Result', 'N/A'))
            print("XML:")
            print(out.XMLout[:500] if hasattr(out, 'XMLout') and out.XMLout else "None")
            print("SuppMsgOut:", getattr(out, 'SuppMsgOut', 'N/A'))
        except Exception as e:
            print("Exception:", e)
    else:
        print("Failed to connect.")
db.close()
