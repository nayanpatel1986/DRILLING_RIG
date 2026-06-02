import time
from witsml.client import WitsmlClient

url = 'http://10.1.0.130/WitsmlService/WitsmlService.asmx'
try:
    client = WitsmlClient(url, username='witsml', password='witsml')
    
    well_uid = 'f3557708-afda-493a-b2e4-eedfe93c9861'
    wb_uid = 'f3557708-afda-493a-b2e4-eedfe93c9861'
    log_uid = 'Time_1Sec'
    
    q1 = f'<logs xmlns="http://www.witsml.org/schemas/131" version="1.3.1"><log uidWell="{well_uid}" uidWellbore="{wb_uid}" uid="{log_uid}"><logData><data/></logData></log></logs>'
    
    print("Testing requestLatestValues=1...")
    t0 = time.time()
    r, x, s = client._soap_call('log', q1, 'requestLatestValues=1')
    print(f"requestLatestValues=1 took: {time.time()-t0:.2f}s, len={len(x)}")
    
    print("\nTesting requestLatestValues=100...")
    t0 = time.time()
    r, x, s = client._soap_call('log', q1, 'requestLatestValues=100')
    print(f"requestLatestValues=100 took: {time.time()-t0:.2f}s, len={len(x)}")
    
    print("\nTesting empty options with startDateTimeIndex...")
    last_time = '2026-03-05T09:00:00Z'
    q2 = f'<logs xmlns="http://www.witsml.org/schemas/131" version="1.3.1"><log uidWell="{well_uid}" uidWellbore="{wb_uid}" uid="{log_uid}"><startDateTimeIndex>{last_time}</startDateTimeIndex><logData><data/></logData></log></logs>'
    t0 = time.time()
    r, x, s = client._soap_call('log', q2, '')
    print(f"startDateTimeIndex ONLY took: {time.time()-t0:.2f}s, len={len(x)}")
    
except Exception as e:
    print("Error:", e)
