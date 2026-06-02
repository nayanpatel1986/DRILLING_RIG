import os
from influxdb_client import InfluxDBClient

def check_data():
    url = "http://influxdb:8086"
    token = "my-super-secret-auth-token"
    org = "nov_rig"
    bucket = "rig_data"
    
    client = InfluxDBClient(url=url, token=token, org=org)
    query_api = client.query_api()
    
    # Query last 10 minutes of ALL data in the bucket
    query = f'''
        from(bucket: "{bucket}")
        |> range(start: -10m)
        |> last()
    '''
    
    print(f"--- QUERYING INFLUXDB (Bucket: {bucket}) ---")
    try:
        tables = query_api.query(query, org=org)
        if not tables:
            print("NO DATA FOUND IN LAST 10 MINUTES.")
            return

        for table in tables:
            for record in table.records:
                measurement = record.get_measurement()
                field = record.get_field()
                value = record.get_value()
                time = record.get_time()
                print(f"Time: {time} | Measurement: {measurement} | Field: {field} | Value: {value}")
    except Exception as e:
        print(f"QUERY ERROR: {e}")

if __name__ == "__main__":
    check_data()
