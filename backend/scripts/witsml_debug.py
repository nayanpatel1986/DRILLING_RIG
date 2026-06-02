from database import SessionLocal
from db_models import WitsmlConfig
from witsml.client import WitsmlClient
import xml.etree.ElementTree as ET

db = SessionLocal()
config = db.query(WitsmlConfig).filter(WitsmlConfig.is_active == True).first()

c = WitsmlClient(config.server_url, config.username, config.password)
q = f'<logs xmlns="http://www.witsml.org/schemas/131" version="1.3.1"><log uidWell="{config.well_uid}" uidWellbore="{config.wellbore_uid}" uid="Time_1Sec"><name/><logCurveInfo/></log></logs>'

res, xml, msg = c._soap_call('log', q, 'returnElements=header-only')

if xml:
    root = ET.fromstring(xml)
    ns = {'w': 'http://www.witsml.org/schemas/131'}
    l = root.find('.//w:log', ns)
    if l:
        curves = [v.find('w:mnemonic', ns).text for v in l.findall('.//w:logCurveInfo', ns) if v.find('w:mnemonic', ns) is not None]
        print(f"Total curves: {len(curves)}")
        
        drilling_params = [mn for mn in curves if any(k in mn.upper() for k in ['BIT_', 'DEPTH', 'WOB', 'RPM', 'ROP', 'BLOCK', 'PRESS', 'FLOW', 'TORQUE'])]
        print(f"Drilling params found: {drilling_params}")
