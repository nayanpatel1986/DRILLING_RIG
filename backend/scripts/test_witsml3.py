import time, requests
from requests.auth import HTTPBasicAuth

url = 'http://10.1.0.130/WitsmlService/WitsmlService.asmx'
q = '<logs xmlns="http://www.witsml.org/schemas/131" version="1.3.1"><log uidWell="f3557708-afda-493a-b2e4-eedfe93c9861" uidWellbore="f3557708-afda-493a-b2e4-eedfe93c9861" uid="Time_1Sec"><startDateTimeIndex>2026-03-05T10:00:00Z</startDateTimeIndex><logData><data/></logData></log></logs>'

namespaces = [
    'http://www.nov.com/witsml/',
    'http://www.witsml.org/message/120',
    'http://www.witsml.org/wsdl/120',
    'http://www.witsml.org/wsdl/120/'
]

for ns in namespaces:
    soap_req = f'''<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wits="{ns}">
  <soap:Body>
    <wits:WMLS_GetFromStore>
      <wits:WMLtypeIn>log</wits:WMLtypeIn>
      <wits:QueryIn>{q.replace('<', '&lt;').replace('>', '&gt;')}</wits:QueryIn>
      <wits:OptionsIn>returnElements=data-only</wits:OptionsIn>
      <wits:CapabilitiesIn></wits:CapabilitiesIn>
    </wits:WMLS_GetFromStore>
  </soap:Body>
</soap:Envelope>'''

    headers = {'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': '"http://www.nov.com/witsml/WMLS_GetFromStore"'}
    
    print(f"\\nTesting namespace: {ns}")
    t0 = time.time()
    try:
        s = requests.Session()
        s.auth = HTTPBasicAuth('witsml', 'witsml')
        r = s.post(url, data=soap_req, headers=headers)
        print(f'Raw HTTP POST took: {time.time()-t0:.2f}s, length: {len(r.content)}')
        if 'Result' in r.text or 'WMLS_GetFromStoreResult' in r.text:
            print("SUCCESS! Data returned.")
        else:
            print("Error parsing response. First 150 chars:", r.text[:150])
    except Exception as e:
        print('error', e)
