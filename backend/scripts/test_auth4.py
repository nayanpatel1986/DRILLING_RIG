import requests
from requests.auth import HTTPBasicAuth
from requests.auth import HTTPDigestAuth
import os
import sys

sys.path.append('/app')
from database import SessionLocal
from db_models import WitsmlConfig

db = SessionLocal()
config = db.query(WitsmlConfig).filter(WitsmlConfig.id == 1).first()

url = "http://10.1.0.130/witsmlservice/witsmlservice.asmx"
headers = {"Content-Type": "text/xml; charset=utf-8", "SOAPAction": "http://www.witsml.org/action/120/Store.WMLS_GetFromStore"}
soap_body = """<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <WMLS_GetFromStore xmlns="http://www.witsml.org/message/120">
      <WMLtypeIn>log</WMLtypeIn>
      <XMLin></XMLin>
      <OptionsIn>requestLatestValues=1</OptionsIn>
      <CapabilitiesIn></CapabilitiesIn>
    </WMLS_GetFromStore>
  </soap:Body>
</soap:Envelope>"""

passwords = ["", "admin123", "password", "123456", "admin", "witsml"]
for pw in passwords:
    try:
        res = requests.post(url, data=soap_body, headers=headers, auth=HTTPBasicAuth(config.username, pw), timeout=3)
        print(f"Testing Basic pass='{pw}' -> Code: {res.status_code}")
    except Exception as e:
        pass
        
    try:
        res = requests.post(url, data=soap_body, headers=headers, auth=HTTPDigestAuth(config.username, pw), timeout=3)
        print(f"Testing Digest pass='{pw}' -> Code: {res.status_code}")
    except Exception as e:
        pass
