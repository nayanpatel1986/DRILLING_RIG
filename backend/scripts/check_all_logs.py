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

query = f'<logs xmlns="http://www.witsml.org/schemas/131" version="1.3.1"><log uidWell="{config.well_uid}" uidWellbore="{config.wellbore_uid}" uid=""><name/></log></logs>'

result = client.service.WMLS_GetFromStore(
    WMLtypeIn='log',
    QueryIn=query,
    OptionsIn='returnElements=id-only',
    CapabilitiesIn=''
)

if result.XMLout:
    root = ET.fromstring(result.XMLout)
    ns = {'w': 'http://www.witsml.org/schemas/131'}
    for log in root.findall('.//w:log', ns):
        name = log.find('w:name', ns)
        start = log.find('w:startDateTimeIndex', ns)
        end = log.find('w:endDateTimeIndex', ns)
        print(f"Log: {name.text if name is not None else 'N/A'}")
        print(f"  Start: {start.text if start is not None else 'N/A'}")
        print(f"  End:   {end.text if end is not None else 'N/A'}")
else:
    print("No logs found.")
