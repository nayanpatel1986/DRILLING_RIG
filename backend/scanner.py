from pymodbus.client import ModbusTcpClient
import struct

def find_exact_telegraf_map():
    client = ModbusTcpClient("192.168.1.10", port=502)
    client.connect()
    res = client.read_holding_registers(415, 5, slave=1)
    regs = res.registers
    client.close()
    
    print(f"RAW REGS: {regs}")
    # User's value is 29.55
    target = 29.55
    tolerance = 2.0
    
    for i in range(len(regs) - 1):
        a, b = regs[i], regs[i+1]
        addr = 415 + i
        ba = struct.pack(">H", a) + struct.pack(">H", b)
        
        # ABCD:
        f_abcd = struct.unpack(">f", ba)[0]
        # CDAB:
        ba_cdab = bytes([ba[2], ba[3], ba[0], ba[1]])
        f_cdab = struct.unpack(">f", ba_cdab)[0]
        
        if abs(f_abcd - target) < tolerance:
            print(f"SUCCESS! USE THIS IN TELEGRAF:")
            print(f"  address = {addr}, byte_order = 'ABCD'")
        if abs(f_cdab - target) < tolerance:
            print(f"SUCCESS! USE THIS IN TELEGRAF:")
            print(f"  address = {addr}, byte_order = 'CDAB'")

if __name__ == "__main__":
    find_exact_telegraf_map()
