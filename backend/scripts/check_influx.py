from services.influx import InfluxWrapper
import json

try:
    influx = InfluxWrapper()
    
    query = f'''
        from(bucket: "{influx.bucket}")
        |> range(start: 0)
        |> filter(fn: (r) => r._measurement == "realtime_drilling")
        |> last()
    '''
    
    tables = influx.query_api.query(query, org=influx.org)
    print(f"Found {len(tables)} tables")
    
    for table in tables:
        for record in table.records[:5]:
            print(f"Time: {record.get_time()}, Field: {record.get_field()}, Value: {record.get_value()}")
            
except Exception as e:
    print(f"Error: {e}")
