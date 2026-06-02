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
q = f'<logs xmlns="http://www.witsml.org/schemas/131" version="1.3.1"><log uidWell="{config.well_uid}" uidWellbore="{config.wellbore_uid}" uid="{config.log_uid}"><name/><logCurveInfo/></log></logs>'

res, xml_out, msg = client._soap_call("log", q, "returnElements=header-only")
if xml_out:
    root = ET.fromstring(xml_out)
    ns = {'w': 'http://www.witsml.org/schemas/131'}
    curves = [c.find('w:mnemonic', ns).text for c in root.findall('.//w:logCurveInfo', ns) if c.find('w:mnemonic', ns) is not None]
    print("CURVES AVAILABLE IN THE LOG:")
    print(curves)
    spp_matches = [c for c in curves if 'PUMP' in c.upper() or 'PRESS' in c.upper() or 'SPP' in c.upper() or 'STP' in c.upper()]
    print("POTENTIAL PUMP PRESSURE MATCHES:")
    print(spp_matches)
else:
    print("Failed to get log header.", msg)
