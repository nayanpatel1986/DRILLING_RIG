import requests, time
from requests.auth import HTTPBasicAuth

url = 'http://10.1.0.130/WitsmlService/WitsmlService.asmx'
last_time = '2026-03-05T10:00:00Z'
q = f'<logs xmlns="http://www.witsml.org/schemas/131" version="1.3.1"><log uidWell="f3557708-afda-493a-b2e4-eedfe93c9861" uidWellbore="f3557708-afda-493a-b2e4-eedfe93c9861" uid="Time_1Sec"><startDateTimeIndex>{last_time}</startDateTimeIndex><logData><data/></logData></log></logs>'

soap_req = f'''<?xml version="1.0" encoding="utf-8"?>
<soap-env:Envelope xmlns:soap-env="http://schemas.xmlsoap.org/soap/envelope/">
  <soap-env:Body>
    <ns0:WMLS_GetFromStore xmlns:ns0="http://www.witsml.org/message/120">
      <WMLtypeIn>log</WMLtypeIn>
      <QueryIn>{q.replace('<', '&lt;').replace('>', '&gt;')}</QueryIn>
      <OptionsIn>maxReturnNodes=1</OptionsIn>
      <CapabilitiesIn></CapabilitiesIn>
    </ns0:WMLS_GetFromStore>
  </soap-env:Body>
</soap-env:Envelope>'''

headers = {
    'Content-Type': 'text/xml; charset=utf-8', 
    'SOAPAction': '"http://www.witsml.org/action/120/Store.WMLS_GetFromStore"'
}

t0 = time.time()
s = requests.Session()
s.auth = HTTPBasicAuth('witsml', 'witsml')
r = s.post(url, data=soap_req, headers=headers)
print(f'Time: {time.time()-t0:.2f}s, length: {len(r.content)}')
