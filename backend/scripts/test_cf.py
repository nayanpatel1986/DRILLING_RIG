import asyncio
import sys

# add current dir to path for imports
sys.path.insert(0, '/app')

from services.modbus_control import ModbusWriteControl

async def main():
    try:
        from pymodbus.client import AsyncModbusTcpClient
        client = AsyncModbusTcpClient('192.168.1.10', port=502)
        await client.connect()
        
        c = await client.read_holding_registers(496, 2, slave=1)
        if c.isError():
            print("Crownomatic 496 Error:", str(c))
        else:
            print("Crownomatic 496 Success:", c.registers)
            
        f = await client.read_holding_registers(502, 2, slave=1)
        if f.isError():
            print("Flooromatic 502 Error:", str(f))
        else:
            print("Flooromatic 502 Success:", f.registers)
            
        client.close()
    except Exception as e:
        print("Exception:", str(e))

asyncio.run(main())
