from services.influx import InfluxWrapper

try:
    influx = InfluxWrapper()
    query = f'''
        from(bucket: "{influx.bucket}")
        |> range(start: -7d)
        |> filter(fn: (r) => r._measurement == "realtime_drilling")
        |> filter(fn: (r) => r._field == "Depth")
    '''
    tables = influx.query_api.query(query, org=influx.org)
    if tables and tables[0].records:
        print('Latest 10 Depth points in Influx:')
        for record in tables[0].records[-10:]:
            print(f"{record.get_time()} - {record.get_value()}")
    else:
        print("No Depth records found in InfluxDB!")
            
except Exception as e:
    print(f"Error: {e}")
