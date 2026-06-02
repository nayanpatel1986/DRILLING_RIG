import requests, time
from requests.auth import HTTPBasicAuth

url = 'http://10.10.10.100/WitsmlService/WitsmlService.asmx'

# First, test connectivity with WMLS_GetVersion
soap_version = '''<?xml version="1.0" encoding="utf-8"?>
<soap-env:Envelope xmlns:soap-env="http://schemas.xmlsoap.org/soap/envelope/">
  <soap-env:Body>
    <ns0:WMLS_GetVersion xmlns:ns0="http://www.witsml.org/message/120"/>
  </soap-env:Body>
</soap-env:Envelope>'''

headers = {
    'Content-Type': 'text/xml; charset=utf-8',
    'SOAPAction': '"http://www.witsml.org/action/120/Store.WMLS_GetVersion"'
}

print("1) Testing GetVersion (no auth)...")
t0 = time.time()
try:
    r = requests.post(url, data=soap_version, headers=headers, timeout=10)
    print(f"   took {time.time()-t0:.2f}s, status={r.status_code}, len={len(r.content)}")
    print(f"   response: {r.text[:300]}")
except Exception as e:
    print(f"   error: {e}")

print("\n2) Testing GetVersion (with auth witsml/witsml)...")
t0 = time.time()
try:
    s = requests.Session()
    s.auth = HTTPBasicAuth('witsml', 'witsml')
    r = s.post(url, data=soap_version, headers=headers, timeout=10)
    print(f"   took {time.time()-t0:.2f}s, status={r.status_code}, len={len(r.content)}")
    print(f"   response: {r.text[:300]}")
except Exception as e:
    print(f"   error: {e}")

# Test GetCap to discover supported options
soap_getcap = '''<?xml version="1.0" encoding="utf-8"?>
<soap-env:Envelope xmlns:soap-env="http://schemas.xmlsoap.org/soap/envelope/">
  <soap-env:Body>
    <ns0:WMLS_GetCap xmlns:ns0="http://www.witsml.org/message/120">
      <OptionsIn>dataVersion=1.3.1.1</OptionsIn>
    </ns0:WMLS_GetCap>
  </soap-env:Body>
</soap-env:Envelope>'''

headers_cap = {
    'Content-Type': 'text/xml; charset=utf-8',
    'SOAPAction': '"http://www.witsml.org/action/120/Store.WMLS_GetCap"'
}

print("\n3) Testing GetCap...")
t0 = time.time()
try:
    s = requests.Session()
    s.auth = HTTPBasicAuth('witsml', 'witsml')
    r = s.post(url, data=soap_getcap, headers=headers_cap, timeout=10)
    print(f"   took {time.time()-t0:.2f}s, status={r.status_code}, len={len(r.content)}")
    print(f"   response: {r.text[:500]}")
except Exception as e:
    print(f"   error: {e}")
