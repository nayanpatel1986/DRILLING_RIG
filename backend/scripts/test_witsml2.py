import time
from witsml.client import WitsmlClient

url = 'http://10.1.0.130/WitsmlService/WitsmlService.asmx'
client = WitsmlClient(url, username='witsml', password='witsml')

well_uid = 'f3557708-afda-493a-b2e4-eedfe93c9861'
wb_uid = 'f3557708-afda-493a-b2e4-eedfe93c9861'
log_uid = 'Time_1Sec'
last_time = '2026-03-05T10:00:00Z'

q = f'<logs xmlns="http://www.witsml.org/schemas/131" version="1.3.1"><log uidWell="{well_uid}" uidWellbore="{wb_uid}" uid="{log_uid}"><startDateTimeIndex>{last_time}</startDateTimeIndex><logData><data/></logData></log></logs>'

print("1) default options (headers + data)")
t0 = time.time()
r, x, s = client._soap_call('log', q, '')
print(f"took {time.time()-t0:.2f}s, header size={len(x)}")

print("\n2) returnElements=data-only options")
t0 = time.time()
r, x, s = client._soap_call('log', q, 'returnElements=data-only')
print(f"took {time.time()-t0:.2f}s, header size={len(x) if x else 0}")
