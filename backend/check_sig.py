import inspect
from pymodbus.client import AsyncModbusTcpClient

client = AsyncModbusTcpClient('localhost')
print("write_registers signature:", inspect.signature(client.write_registers))
print("write_coil signature:", inspect.signature(client.write_coil))
