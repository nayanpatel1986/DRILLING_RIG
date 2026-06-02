from database import SessionLocal
from db_models import WitsmlConfig
from witsml.client import WitsmlClient
import xml.etree.ElementTree as ET

db = SessionLocal()
config = db.query(WitsmlConfig).first()
c = WitsmlClient(config.server_url, config.username, config.password)

q = f'<logs xmlns="http://www.witsml.org/schemas/131" version="1.3.1"><log uidWell="{config.well_uid}" uidWellbore="{config.wellbore_uid}" uid="Time_1Sec"><name/><logCurveInfo/></log></logs>'

res, xml, msg = c._soap_call('log', q, 'returnElements=header-only')
if xml:
    root = ET.fromstring(xml)
    ns = {'w': 'http://www.witsml.org/schemas/131'}
    curves = [c.find('w:mnemonic', ns).text for c in root.findall('.//w:logCurveInfo', ns) if c.find('w:mnemonic', ns) is not None]
    
    matches = [c for c in curves if 'STANDPIPE' in c.upper()]
    print('Raw Server Mnemonics for Standpipe:', matches)
