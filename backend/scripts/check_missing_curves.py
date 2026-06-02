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
    curves = [c.find('w:mnemonic', ns).text.upper() for c in root.findall('.//w:logCurveInfo', ns) if c.find('w:mnemonic', ns) is not None]
    
    missing_targets = ['ROT_SPEED', 'Standpipe Pressure 1', 'GAS_H2S_MAX', 'FLOW_OUT_REL', 'MP3_SPM', 'RIG_ACTIVITY', 'SLIP_STAT', 'TD_SPEED', 'TD_TORQUE', 'TT2_VOL']
    
    print("Checking missing mnemonics in WITSML server:")
    for target in missing_targets:
        found = any(c == target.upper() for c in curves)
        if found:
            print(f"[FOUND] {target} exists in the WITSML log.")
        else:
            print(f"[MISSING] {target} is NOT in the WITSML log.")
            # find closest match
            matches = [c for c in curves if target.split('_')[0].upper() in c or target.upper() in c]
            if matches:
                print(f"  -> Closest matches: {matches[:5]}")
