import logging.config
import requests
from requests.auth import HTTPBasicAuth
from zeep import Client
from zeep.transports import Transport

logging.config.dictConfig({
    'version': 1,
    'formatters': {'verbose': {'format': '%(name)s: %(message)s'}},
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'zeep.transports': {
            'level': 'DEBUG',
            'propagate': True,
            'handlers': ['console'],
        },
    }
})

url = 'http://10.1.0.130/WitsmlService/WitsmlService.asmx'
session = requests.Session()
session.auth = HTTPBasicAuth('witsml', 'witsml')

# Intercept and print headers
original_send = session.send
def new_send(request, **kwargs):
    print("\\n--- REQUEST HEADERS ---")
    for k, v in request.headers.items():
        print(f"{k}: {v}")
    print("-----------------------\\n")
    return original_send(request, **kwargs)
session.send = new_send

transport = Transport(session=session)
client = Client(url + '?WSDL', transport=transport)

q = '<logs xmlns="http://www.witsml.org/schemas/131" version="1.3.1"><log uidWell="f3557708-afda-493a-b2e4-eedfe93c9861" uidWellbore="f3557708-afda-493a-b2e4-eedfe93c9861" uid="Time_1Sec"><startDateTimeIndex>2026-03-05T10:00:00Z</startDateTimeIndex><logData><data/></logData></log></logs>'

print("\\n--- STARTING ZEEP CALL ---")
try:
    client.service.WMLS_GetFromStore(
        WMLtypeIn='log',
        QueryIn=q,
        OptionsIn='returnElements=data-only',
        CapabilitiesIn=''
    )
except Exception as e:
    print('err', e)
