from database import SessionLocal
from db_models import WitsmlConfig
from witsml.client import WitsmlClient
import xml.etree.ElementTree as ET

db = SessionLocal()
config = db.query(WitsmlConfig).filter(WitsmlConfig.is_active == True).first()

c = WitsmlClient(config.server_url, config.username, config.password)

# Requesting specific curves!
q = f"""<logs xmlns="http://www.witsml.org/schemas/131" version="1.3.1">
  <log uidWell="{config.well_uid}" uidWellbore="{config.wellbore_uid}" uid="Time_1Sec">
    <logCurveInfo><mnemonic>RIGTIME</mnemonic></logCurveInfo>
    <logCurveInfo><mnemonic>BIT_DEPTH</mnemonic></logCurveInfo>
    <logCurveInfo><mnemonic>WOB</mnemonic></logCurveInfo>
    <logCurveInfo><mnemonic>BLOCK_POS</mnemonic></logCurveInfo>
    <logCurveInfo><mnemonic>ROT_SPEED</mnemonic></logCurveInfo>
    <logData><data/></logData>
  </log>
</logs>"""

res, xml, msg = c._soap_call('log', q, 'requestLatestValues=1')

if xml:
    root = ET.fromstring(xml)
    ns = {'w': 'http://www.witsml.org/schemas/131'}
    l = root.find('.//w:log', ns)
    if l:
        curves = [v.find('w:mnemonic', ns).text for v in l.findall('.//w:logCurveInfo', ns) if v.find('w:mnemonic', ns) is not None]
        print(f"Returned curves: {curves}")
        data_nodes = l.findall('.//w:data', ns)
        if data_nodes:
            print(f"Data row: {data_nodes[0].text}")
