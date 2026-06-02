import sys
import time
from services.influx import InfluxWrapper

def main():
    influx = InfluxWrapper()
    start_iso = "2026-04-21T09:00:00Z"
    stop_iso = "2026-04-23T11:00:00Z"
    
    # Let's test with drop_tags after agg_window (Current logic)
    print("Testing CURRENT logic (drop_tags AFTER agg_window):")
    query_current = f'''
        from(bucket: "{influx.bucket}")
        |> range(start: {start_iso}, stop: {stop_iso})
        |> filter(fn: (r) => r._measurement == "modbus")
        |> aggregateWindow(every: 10m, fn: mean, createEmpty: false)
        |> drop(columns: ["device_name", "device_type", "host", "name", "rig_id", "slave_id", "type"])
        |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> sort(columns: ["_time"], desc: false)
    '''
    start_time = time.time()
    try:
        tables = influx.query_api.query(query_current, org=influx.org)
        rows = influx._merge_records(tables)
        print(f"Completed in {time.time() - start_time:.4f} seconds, returned {len(rows)} rows")
    except Exception as e:
        print("Error:", e)

    # Let's test with drop_tags before agg_window (Optimized logic)
    print("\nTesting OPTIMIZED logic (drop_tags BEFORE agg_window):")
    query_opt = f'''
        from(bucket: "{influx.bucket}")
        |> range(start: {start_iso}, stop: {stop_iso})
        |> filter(fn: (r) => r._measurement == "modbus")
        |> drop(columns: ["device_name", "device_type", "host", "name", "rig_id", "slave_id", "type"])
        |> aggregateWindow(every: 10m, fn: mean, createEmpty: false)
        |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> sort(columns: ["_time"], desc: false)
    '''
    start_time = time.time()
    try:
        tables = influx.query_api.query(query_opt, org=influx.org)
        rows = influx._merge_records(tables)
        print(f"Completed in {time.time() - start_time:.4f} seconds, returned {len(rows)} rows")
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    main()
