import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.influx import InfluxWrapper
import time

def test_query(range_str, measurement="realtime_drilling"):
    print(f"Testing query for range: {range_str}, measurement: {measurement}...")
    start_time = time.time()
    try:
        influx = InfluxWrapper()
        rows = influx.query_range(range_str, measurement)
        end_time = time.time()
        print(f"Query returned {len(rows)} rows in {end_time - start_time:.2f} seconds")
        if rows:
            print("First row Sample:", rows[0])
    except Exception as e:
        print(f"Error during query: {e}")

def check_bucket_summary():
    print("Checking bucket summary...")
    try:
        influx = InfluxWrapper()
        query = f'from(bucket: "{influx.bucket}") |> range(start: -30d) |> count()'
        tables = influx.query_api.query(query, org=influx.org)
        for table in tables:
            for record in table.records:
                print(f"Measurement: {record.get_measurement()}, Field: {record.get_field()}, Count: {record.get_value()}")
    except Exception as e:
        print(f"Error checking bucket: {e}")

if __name__ == "__main__":
    check_bucket_summary()
    test_query("-5m", "realtime_drilling")
    test_query("-5m", "modbus")
    test_query("-12h", "realtime_drilling")
