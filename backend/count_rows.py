from services.influx import InfluxWrapper

def main():
    influx = InfluxWrapper()
    query = f'''
        from(bucket: "{influx.bucket}")
        |> range(start: -365d)
        |> filter(fn: (r) => r._measurement == "modbus")
        |> count()
    '''
    try:
        tables = influx.query_api.query(query, org=influx.org)
        print("Total count tables:", len(tables))
        for table in tables:
            for record in table.records:
                print(f"Field: {record.get_field()}, Count: {record.get_value()}")
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    main()
