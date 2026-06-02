from services.influx import InfluxWrapper
db = InfluxWrapper()
tables = db.query_api.query('from(bucket: "rig_data") |> range(start: -2m) |> filter(fn: (r) => r._measurement == "realtime_drilling")')
fields = set([r.get_field() for t in tables for r in t.records])
print("FIELDS WRITTEN:", fields)
