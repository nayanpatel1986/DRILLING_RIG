from database import SessionLocal
from db_models import WitsmlConfig
from zeep.transports import Transport
from requests import Session
from requests.auth import HTTPBasicAuth
from zeep import Client
import xml.etree.ElementTree as ET

db = SessionLocal()
config = db.query(WitsmlConfig).filter(WitsmlConfig.id == 1).first()

session = Session()
session.auth = HTTPBasicAuth(config.username, config.password)
client = Client(config.server_url + '?WSDL', transport=Transport(session=session))

# Try querying exactly since the known latest data time
start_time = "2026-02-27T06:15:20.0000000+05:30"
print(f"Testing startDateTimeIndex: {start_time}")

query = f'<logs xmlns="http://www.witsml.org/schemas/131" version="1.3.1"><log uidWell="{config.well_uid}" uidWellbore="{config.wellbore_uid}" uid="{config.log_uid}"><startDateTimeIndex>{start_time}</startDateTimeIndex><logData><data/></logData></log></logs>'

result = client.service.WMLS_GetFromStore(
    WMLtypeIn='log',
    QueryIn=query,
    OptionsIn='',
    CapabilitiesIn=''
)

if result.XMLout:
    root = ET.fromstring(result.XMLout)
    ns = {'w': 'http://www.witsml.org/schemas/131'}
    data_nodes = root.findall('.//w:data', ns)
    print(f"Rows returned: {len(data_nodes)}")
    if data_nodes:
        print("First row:", data_nodes[0].text)
        print("Last row:", data_nodes[-1].text)
else:
    print("No data found.")
