from database import SessionLocal
from db_models import WitsmlConfig
from witsml.client import WitsmlClient
import xml.etree.ElementTree as ET

db = SessionLocal()
config = db.query(WitsmlConfig).filter(WitsmlConfig.is_active == True).first()

c = WitsmlClient(config.server_url, config.username, config.password)
q = f'<logs xmlns="http://www.witsml.org/schemas/131" version="1.3.1"><log uidWell="{config.well_uid}" uidWellbore="{config.wellbore_uid}" uid="Time_1Sec"><logData><data/></logData></log></logs>'

# mimic what get_latest_log_data does initially
res, xml, msg = c._soap_call('log', q, 'requestLatestValues=1')

if xml:
    print(f"Data XML length: {len(xml)}")
    # Just print the first 1000 chars and look at logCurveInfo
    print(xml[:2000])
else:
    print("Error:", msg)
