import requests
from requests.auth import HTTPBasicAuth
from requests.auth import _basic_auth_str
import os
import sys

sys.path.append('/app')
from database import SessionLocal
from db_models import WitsmlConfig

db = SessionLocal()
config = db.query(WitsmlConfig).filter(WitsmlConfig.id == 1).first()

if not config:
    print("No config found")
    sys.exit()

url = "http://10.1.0.130/witsmlservice/witsmlservice.asmx"
headers = {
    "Content-Type": "text/xml; charset=utf-8",
    "SOAPAction": "http://www.witsml.org/action/120/Store.WMLS_GetFromStore",
    "Authorization": _basic_auth_str(config.username, config.password)
}

soap_body = """<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <WMLS_GetFromStore xmlns="http://www.witsml.org/message/120">
      <WMLtypeIn>log</WMLtypeIn>
      <XMLin>&lt;logs xmlns=&quot;http://www.witsml.org/schemas/131&quot; version=&quot;1.3.1.1&quot;&gt;&lt;log uidWell=&quot;ong ABCD&quot; uidWellbore=&quot;ong ABCD&quot; uid=&quot;Time_55sec&quot;&gt;&lt;logData&gt;&lt;data/&gt;&lt;/logData&gt;&lt;/log&gt;&lt;/logs&gt;</XMLin>
      <OptionsIn>requestLatestValues=1</OptionsIn>
      <CapabilitiesIn></CapabilitiesIn>
    </WMLS_GetFromStore>
  </soap:Body>
</soap:Envelope>"""

try:
    res = requests.post(url, data=soap_body, headers=headers, timeout=3)
    print("Test 1 - Force Basic Auth Header:", res.status_code)
except Exception as e:
    print("Error:", e)
    
try:
    headers2 = {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": "http://www.witsml.org/action/131/Store.WMLS_GetFromStore",
        "Authorization": _basic_auth_str(config.username, config.password)
    }
    
    soap_body2 = """<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <WMLS_GetFromStore xmlns="http://www.witsml.org/message/131">
      <WMLtypeIn>log</WMLtypeIn>
      <XMLin>&lt;logs xmlns=&quot;http://www.witsml.org/schemas/131&quot; version=&quot;1.3.1.1&quot;&gt;&lt;log uidWell=&quot;ong ABCD&quot; uidWellbore=&quot;ong ABCD&quot; uid=&quot;Time_55sec&quot;&gt;&lt;logData&gt;&lt;data/&gt;&lt;/logData&gt;&lt;/log&gt;&lt;/logs&gt;</XMLin>
      <OptionsIn>requestLatestValues=1</OptionsIn>
      <CapabilitiesIn></CapabilitiesIn>
    </WMLS_GetFromStore>
  </soap:Body>
</soap:Envelope>"""
    res2 = requests.post(url, data=soap_body2, headers=headers2, timeout=3)
    print("Test 2 - 131 XML Namespace:", res2.status_code)
except Exception as e:
    pass
