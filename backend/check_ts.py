from services.influx import InfluxWrapper

def main():
    influx = InfluxWrapper()
    query = f'''
        from(bucket: "{influx.bucket}")
        |> range(start: -365d)
        |> filter(fn: (r) => r._measurement == "modbus")
        |> last()
    '''
    try:
        tables = influx.query_api.query(query, org=influx.org)
        print("Total fields:", len(tables))
        records = []
        for table in tables:
            for record in table.records:
                records.append((record.get_time(), record.get_field(), record.get_value()))
        # Sort by time desc
        records.sort(key=lambda x: x[0], reverse=True)
        for r in records[:20]:
            print(f"Time: {r[0]}, Field: {r[1]}, Value: {r[2]}")
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    main()
