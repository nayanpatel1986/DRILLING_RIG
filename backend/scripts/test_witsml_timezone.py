import os
os.environ["DATABASE_URL"] = "postgresql://admin:password123@postgres:5432/rig_manager"
from database import SessionLocal
from db_models import WitsmlConfig

import zeep
from zeep.transports import Transport
import requests

db = SessionLocal()
config = db.query(WitsmlConfig).filter(WitsmlConfig.is_active == True).first()
if config:
    print(f"Active Config: {config.name}, Well: {config.well_uid}, Wellbore: {config.wellbore_uid}, Log: {config.log_uid}")
    
    session = requests.Session()
    session.auth = (config.username, config.password)
    transport = Transport(session=session)
    client = zeep.Client(config.server_url + "?WSDL", transport=transport)
    
    def test_query(start_time):
        query = f'''<logs xmlns="http://www.witsml.org/schemas/131" version="1.3.1"><log uidWell="{config.well_uid}" uidWellbore="{config.wellbore_uid}" uid="{config.log_uid}"><startDateTimeIndex>{start_time}</startDateTimeIndex><logData><data/></logData></log></logs>'''
        try:
            res = client.service.WMLS_GetFromStore(
                WMLtypeIn='log',
                QueryIn=query,
                OptionsIn='requestLatestValues=1',
                CapabilitiesIn=''
            )
            import xmltodict
            if res.XMLout:
                d = xmltodict.parse(res.XMLout)
                data = d.get('logs',{}).get('log',{}).get('logData',{}).get('data',[])
                if data:
                    if isinstance(data, list):
                        print(f"Query: {start_time}")
                        print(f"  First point: {data[0].split(',')[0]} (Count: {len(data)})")
                    else:
                        print(f"Query: {start_time}\n  Single point: {data.split(',')[0]}")
                else:
                    print(f"Query: {start_time} -> No logData")
            else:
                print(f"Query: {start_time} -> No XMLout")
        except Exception as e:
            print(f"Query: {start_time} -> Exception: {e}")

    # Latest record in DB was 2026-03-02 as of testing
    print("--- TESTING DIFFERENT TIMESTAMP FORMATS ---")
    
    # Try an exact matching timezone query
    test_query("2026-03-02T16:20:00.0000000+05:30")
    # Try a Z suffix
    test_query("2026-03-02T16:20:00Z")
    # Try no suffix (local time)
    test_query("2026-03-02T16:20:00")
    # Try different timezone suffix
    test_query("2026-03-02T10:50:00Z")
else:
    print("No active config.")
