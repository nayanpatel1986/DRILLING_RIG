from services.influx import InfluxWrapper

try:
    influx = InfluxWrapper()
    data = influx.query_sensors_latest("modbus")
    print(f"Latest Modbus Sensor Data:\n{data}")
        
except Exception as e:
    print(f"Error: {e}")
