from services.influx import InfluxWrapper
import datetime

w = InfluxWrapper()
res = w.query_api.query(f'''
    from(bucket: "{w.bucket}")
    |> range(start: -1d, stop: 1d)
    |> filter(fn: (r) => r._measurement == "realtime_drilling")
    |> last()
''', org=w.org)

print(f"Rows found: {len(res)}")
if res:
    print(f"Latest record time: {res[0].records[0].get_time()}")
    print(f"Current docker UTC time: {datetime.datetime.utcnow().isoformat()}Z")
