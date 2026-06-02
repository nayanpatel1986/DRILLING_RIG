from services.influx import InfluxWrapper
db = InfluxWrapper()
tables = db.query_api.query('from(bucket: " rig_data\)
