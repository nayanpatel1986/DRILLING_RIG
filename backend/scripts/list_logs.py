from database import SessionLocal
from db_models import WitsmlConfig
from witsml.client import WitsmlClient
import xml.etree.ElementTree as ET

db = SessionLocal()
config = db.query(WitsmlConfig).first()
if config is None:
    print("NO CONFIG FOUND")
    exit()

client = WitsmlClient(config.server_url, config.username, config.password)
q = f'<logs xmlns="http://www.witsml.org/schemas/131" version="1.3.1"><log uidWell="{config.well_uid}" uidWellbore="{config.wellbore_uid}"><name/><serviceCompany/><creationDate/></log></logs>'

res, xml_out, msg = client._soap_call("log", q, "returnElements=header-only")
if xml_out:
    root = ET.fromstring(xml_out)
    ns = {'w': 'http://www.witsml.org/schemas/131'}
    logs = root.findall('.//w:log', ns)
    print(f"FOUND {len(logs)} LOGS:")
    for log in logs:
        uid = log.attrib.get('uid')
        name = log.find('w:name', ns).text if log.find('w:name', ns) is not None else "N/A"
        print(f"  - UID: {uid}, Name: {name}")
else:
    print("Failed to list logs.", msg)
