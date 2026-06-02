from services.influx import InfluxWrapper

def main():
    influx = InfluxWrapper()
    query = f'''
        from(bucket: "{influx.bucket}")
        |> range(start: -365d)
        |> filter(fn: (r) => r._measurement == "modbus")
        |> first()
    '''
    print("Finding first records:")
    try:
        tables = influx.query_api.query(query, org=influx.org)
        for table in tables:
            for record in table.records:
                print(f"Time: {record.get_time()}, Field: {record.get_field()}")
                break
            break
    except Exception as e:
        print("Error:", e)

    query2 = f'''
        from(bucket: "{influx.bucket}")
        |> range(start: -365d)
        |> filter(fn: (r) => r._measurement == "modbus")
        |> last()
    '''
    print("\nFinding last records:")
    try:
        tables = influx.query_api.query(query2, org=influx.org)
        for table in tables:
            for record in table.records:
                print(f"Time: {record.get_time()}, Field: {record.get_field()}")
                break
            break
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    main()
