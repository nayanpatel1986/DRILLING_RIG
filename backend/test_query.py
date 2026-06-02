import sys
from services.influx import InfluxWrapper

def main():
    influx = InfluxWrapper()
    
    print("Testing query_sensors_latest('modbus'):")
    res = influx.query_sensors_latest("modbus")
    print(res)
    
    # Query all measurements in the bucket
    print("\nListing all measurements in bucket:")
    query = f'''
        import "influxdata/influxdb/schema"
        schema.measurements(bucket: "{influx.bucket}")
    '''
    try:
        tables = influx.query_api.query(query, org=influx.org)
        for table in tables:
            for record in table.records:
                print("Measurement:", record.get_value())
    except Exception as e:
        print("Error listing measurements:", e)

    # Let's run a query to get the very last record of anything in the bucket to see what timestamps we have!
    print("\nGetting latest record of anything in bucket:")
    query2 = f'''
        from(bucket: "{influx.bucket}")
        |> range(start: -365d)
        |> last()
        |> limit(n: 5)
    '''
    try:
        tables = influx.query_api.query(query2, org=influx.org)
        for table in tables:
            for record in table.records:
                print(f"Time: {record.get_time()}, Measurement: {record.get_measurement()}, Field: {record.get_field()}, Value: {record.get_value()}")
    except Exception as e:
        print("Error querying latest records:", e)

if __name__ == "__main__":
    main()
