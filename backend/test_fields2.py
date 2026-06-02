from services.influx import InfluxWrapper
db = InfluxWrapper()
tables = db.query_api.query('from(bucket: "rig_data") |> range(start: -2m) |> filter(fn: (r) => r._measurement == "realtime_drilling")')
times = [r.get_time() for t in tables for r in t.records]
print("TIMES (first 5):", times[:5])
print("TIMES (last 5):", times[-5:])
