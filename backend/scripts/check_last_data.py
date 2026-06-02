from database import SessionLocal
from db_models import WitsmlConfig
from witsml.client import WitsmlClient
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

# Query data from 10 minutes before the current time according to the server's own header
current_time = "2026-02-27T17:35:00.0000000+05:30"

query = f'<logs xmlns="http://www.witsml.org/schemas/131" version="1.3.1"><log uidWell="{config.well_uid}" uidWellbore="{config.wellbore_uid}" uid="{config.log_uid}"><startDateTimeIndex>{current_time}</startDateTimeIndex><logData><data/></logData></log></logs>'

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
    for node in data_nodes[-5:]:
        print(node.text)
else:
    print("No data found.")
