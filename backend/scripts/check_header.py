from database import SessionLocal
from db_models import WitsmlConfig
from witsml.client import WitsmlClient
from zeep.transports import Transport
from requests import Session
from requests.auth import HTTPBasicAuth
from zeep import Client
import datetime

db = SessionLocal()
config = db.query(WitsmlConfig).filter(WitsmlConfig.id == 1).first()

session = Session()
session.auth = HTTPBasicAuth(config.username, config.password)
client = Client(config.server_url + '?WSDL', transport=Transport(session=session))

query = f'<logs xmlns="http://www.witsml.org/schemas/131" version="1.3.1"><log uidWell="{config.well_uid}" uidWellbore="{config.wellbore_uid}" uid="{config.log_uid}"><endDateTimeIndex/></log></logs>'

result = client.service.WMLS_GetFromStore(
    WMLtypeIn='log',
    QueryIn=query,
    OptionsIn='returnElements=header-only',
    CapabilitiesIn=''
)
print('Header XMLout:')
print(result.XMLout)
