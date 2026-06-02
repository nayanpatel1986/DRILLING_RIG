import time
import os
import struct
from pymodbus.client import ModbusTcpClient
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS

# Configuration
PLC_IP = "192.168.1.10"
INFLUX_URL = "http://influxdb:8086"
INFLUX_TOKEN = "my-super-secret-auth-token"
INFLUX_ORG = "nov_rig"
INFLUX_BUCKET = "rig_data"

def poll_and_push():
    client_plc = ModbusTcpClient(PLC_IP, port=502)
    client_influx = InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG)
    write_api = client_influx.write_api(write_options=SYNCHRONOUS)

    print(f"Starting Modbus-to-Influx Poller for {PLC_IP}...")
    
    while True:
        try:
            if not client_plc.is_socket_open():
                client_plc.connect()
            
            # Read Registers for Accumulator (417-418) and Annular (209-210)
            # We'll read from 200 to 420 in one go if possible, or two separate reads
            # To be safe, two separate reads
            
            # 1. Accumulator
            res_acc = client_plc.read_holding_registers(417, 2, slave=1)
            # 2. Annular
            res_ann = client_plc.read_holding_registers(209, 2, slave=1)
            
            if not res_acc.isError() and not res_ann.isError():
                # Acc: Register 417-418 | Order ABCD
                ba_acc = struct.pack(">H", res_acc.registers[0]) + struct.pack(">H", res_acc.registers[1])
                acc_val = struct.unpack(">f", ba_acc)[0]
                
                # Ann: Register 209-210 | Order ABCD
                ba_ann = struct.pack(">H", res_ann.registers[0]) + struct.pack(">H", res_ann.registers[1])
                ann_val = struct.unpack(">f", ba_ann)[0]
                
                # Create InfluxDB Point
                point = Point("modbus") \
                    .tag("device_name", "TWINSTOP") \
                    .tag("device_type", "twinstop") \
                    .tag("rig_id", "E-1400-1") \
                    .field("AccumulatorPress", float(acc_val)) \
                    .field("AnnularPressure", float(ann_val)) \
                    .time(time.time_ns(), WritePrecision.NS)
                
                write_api.write(bucket=INFLUX_BUCKET, org=INFLUX_ORG, record=point)
                # print(f"PUSHED: Accum={acc_val:.2f}, Ann={ann_val:.2f}")
            
        except Exception as e:
            print(f"POLLING ERROR: {e}")
            time.sleep(5) # Wait before retry
            
        time.sleep(1) # Poll interval

if __name__ == "__main__":
    poll_and_push()
