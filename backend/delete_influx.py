from services.influx import InfluxWrapper
from influxdb_client import DeleteApi
import json

try:
    influx = InfluxWrapper()
    delete_api = influx.client.delete_api()
    
    # Delete data
    delete_api.delete(
        "2020-01-01T00:00:00Z",
        "2030-01-01T00:00:00Z",
        '_measurement="realtime_drilling"',
        bucket=influx.bucket,
        org=influx.org
    )
    print("Deleted all records for realtime_drilling successfully.")
    
except Exception as e:
    print(f"Error: {e}")
