import requests
from requests.auth import HTTPBasicAuth

url = 'http://10.1.0.130/WitsmlService/WitsmlService.asmx'
q = '<logs xmlns="http://www.witsml.org/schemas/131" version="1.3.1"><log uidWell="f3557708-afda-493a-b2e4-eedfe93c9861" uidWellbore="f3557708-afda-493a-b2e4-eedfe93c9861" uid="Time_1Sec"><startDateTimeIndex>2026-03-05T10:00:00Z</startDateTimeIndex><logData><data/></logData></log></logs>'

soap_req = f'''<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wits="http://www.nov.com/witsml/">
  <soap:Body>
    <wits:WMLS_GetFromStore>
      <wits:WMLtypeIn>log</wits:WMLtypeIn>
      <wits:QueryIn>{q.replace('<', '&lt;').replace('>', '&gt;')}</wits:QueryIn>
      <wits:OptionsIn>returnElements=data-only</wits:OptionsIn>
      <wits:CapabilitiesIn></wits:CapabilitiesIn>
    </wits:WMLS_GetFromStore>
  </soap:Body>
</soap:Envelope>'''

actions = [
    '"http://www.nov.com/witsml/WMLS_GetFromStore"',
    '"http://www.witsml.org/message/120/WMLS_GetFromStore"',
    '""'
]

for act in actions:
    print(f"\\nTesting SOAPAction: {act}")
    headers = {'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': act}
    try:
        s = requests.Session()
        s.auth = HTTPBasicAuth('witsml', 'witsml')
        r = s.post(url, data=soap_req, headers=headers)
        if 'Result' in r.text or 'WMLS_GetFromStoreResult' in r.text or 'XMLout' in r.text:
            print(f"SUCCESS! Length: {len(r.content)}")
            print(r.text[:200])
        else:
            if 'Server did not recognize' not in r.text:
                print("Error:", r.status_code, r.text[:100])
            else:
                print("Server did not recognize SOAPAction.")
    except Exception as e:
        print("Exception:", e)
