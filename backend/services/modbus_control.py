import asyncio
import logging
import struct
from pymodbus.client import AsyncModbusTcpClient
from pymodbus.exceptions import ModbusException

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModbusWriteControl:
    """
    A service to handle Modbus write operations (Registers and Coils).
    Supports Modbus TCP specifically for PLCs like Schneider M241.
    """

    # Safety filters to prevent accidental writes to critical registers/coils
    FORBIDDEN_COILS = []      # List of coil addresses that cannot be written via API
    FORBIDDEN_REGISTERS = []  # List of register addresses that cannot be written via API

    @staticmethod
    def _is_safe(address: int, is_coil: bool = False) -> (bool, str):
        """Check if an address is blocked by safety filters."""
        if is_coil and address in ModbusWriteControl.FORBIDDEN_COILS:
            return False, f"Coil address {address} is reserved and cannot be written via API."
        if not is_coil and address in ModbusWriteControl.FORBIDDEN_REGISTERS:
            return False, f"Register address {address} is reserved and cannot be written via API."
        return True, ""

    @staticmethod
    async def write_coil(ip: str, port: int, slave_id: int, address: int, value: bool) -> dict:
        """Write a single boolean value to a Modbus Coil (0x)."""
        # Safety check
        safe, msg = ModbusWriteControl._is_safe(address, is_coil=True)
        if not safe:
            return {"success": False, "error": msg}

        client = AsyncModbusTcpClient(ip, port=port)
        try:
            await client.connect()
            if not client.connected:
                return {"success": False, "error": f"Could not connect to PLC at {ip}:{port}"}
            
            # Write Single Coil (0x05)
            result = await client.write_coil(address, value, device_id=slave_id)
            
            if result.isError():
                return {"success": False, "error": str(result)}
            
            logger.info(f"Modbus WRITE: Coil {address} = {value} on {ip}:{port} (Slave {slave_id})")
            return {"success": True, "address": address, "value": value}
            
        except ModbusException as e:
            logger.error(f"Modbus Error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Unexpected Error: {e}")
            return {"success": False, "error": str(e)}
        finally:
            client.close()

    @staticmethod
    async def write_register(ip: str, port: int, slave_id: int, address: int, value: int) -> dict:
        """Write a single 16-bit integer to a Modbus Holding Register (4x)."""
        # Safety check
        safe, msg = ModbusWriteControl._is_safe(address, is_coil=False)
        if not safe:
            return {"success": False, "error": msg}
        
        # Range check for 16-bit register
        if not (0 <= value <= 65535):
            return {"success": False, "error": f"Value {value} out of 16-bit range (0-65535)"}

        client = AsyncModbusTcpClient(ip, port=port)
        try:
            await client.connect()
            if not client.connected:
                return {"success": False, "error": f"Could not connect to PLC at {ip}:{port}"}
            
            # Write Single Holding Register (0x06)
            result = await client.write_register(address, value, device_id=slave_id)
            
            if result.isError():
                return {"success": False, "error": str(result)}
            
            logger.info(f"Modbus WRITE: Register {address} = {value} on {ip}:{port} (Slave {slave_id})")
            return {"success": True, "address": address, "value": value}
            
        except ModbusException as e:
            logger.error(f"Modbus Error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Unexpected Error: {e}")
            return {"success": False, "error": str(e)}
        finally:
            client.close()

    @staticmethod
    async def write_registers(ip: str, port: int, slave_id: int, address: int, values: list) -> dict:
        """Write multiple 16-bit integers to Modbus Holding Registers (4x)."""
        # Safety check
        for i in range(len(values)):
            safe, msg = ModbusWriteControl._is_safe(address + i, is_coil=False)
            if not safe:
                return {"success": False, "error": msg}
            
            if not (0 <= values[i] <= 65535):
                return {"success": False, "error": f"Value at index {i} ({values[i]}) out of 16-bit range"}

        client = AsyncModbusTcpClient(ip, port=port)
        try:
            await client.connect()
            if not client.connected:
                return {"success": False, "error": f"Could not connect to PLC at {ip}:{port}"}
            
            logger.info(f"Modbus WRITE Attempt: Address {address}, Slave {slave_id} on {ip}:{port}")
            # Write Multiple Holding Registers (0x10)
            result = await client.write_registers(address, values, device_id=slave_id)
            
            if result.isError():
                return {"success": False, "error": str(result)}
            
            logger.info(f"Modbus WRITE: Registers {address} count {len(values)} on {ip}:{port} (Slave {slave_id})")
            return {"success": True, "address": address, "count": len(values)}
            
        except ModbusException as e:
            logger.error(f"Modbus Error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Unexpected Error: {e}")
            return {"success": False, "error": str(e)}
        finally:
            client.close()

    @staticmethod
    async def write_float(ip: str, port: int, slave_id: int, address: int, value: float) -> dict:
        """
        Write a 32-bit floating point value (REAL) to Modbus Holding Registers (4x).
        Uses Function Code 16 (Write Multiple Registers) to send two 16-bit words.
        """
        try:
            # Pack float as IEEE 754 (Big Endian ABCD)
            packed = struct.pack('>f', float(value))
            # Split into two 16-bit words
            words = struct.unpack('>HH', packed)
            
            # The PLC requires Little Endian Byte Swap (CDAB)
            # which means Word 1 and Word 2 must be swapped
            cdab_words = [words[1], words[0]]
            
            # Send the two 16-bit words starting at 'address'
            return await ModbusWriteControl.write_registers(
                ip=ip, 
                port=port, 
                slave_id=slave_id, 
                address=address, 
                values=cdab_words
            )
        except Exception as e:
            logger.error(f"Float Conversion Error: {e}")
            return {"success": False, "error": f"Value conversion error: {str(e)}"}

    @staticmethod
    async def write_register_bit(ip: str, port: int, slave_id: int, address: int, bit_index: int, value: bool) -> dict:
        """
        Write a single bit (0-15) within a 16-bit Modbus Holding Register.
        Performs a Read-Modify-Write cycle.
        """
        if not (0 <= bit_index <= 15):
            return {"success": False, "error": f"Bit index {bit_index} out of range (0-15)"}

        client = AsyncModbusTcpClient(ip, port=port)
        try:
            await client.connect()
            if not client.connected:
                return {"success": False, "error": f"Could not connect to PLC at {ip}:{port}"}

            # 1. Read the current register value
            read_result = await client.read_holding_registers(address, count=1, device_id=slave_id)
            if read_result.isError():
                return {"success": False, "error": f"Read failed: {str(read_result)}"}
            
            current_val = read_result.registers[0]

            # 2. Modify the specific bit
            if value:
                new_val = current_val | (1 << bit_index)
            else:
                new_val = current_val & ~(1 << bit_index)

            # 3. Write it back
            if new_val == current_val:
                return {"success": True, "address": address, "bit": bit_index, "value": value, "status": "no change needed"}

            write_result = await client.write_register(address, new_val, device_id=slave_id)
            if write_result.isError():
                return {"success": False, "error": f"Write failed: {str(write_result)}"}

            logger.info(f"Modbus BIT WRITE: Reg {address}.{bit_index} = {value} (New Val: {new_val}) on {ip}:{port}")
            return {"success": True, "address": address, "bit": bit_index, "value": value}

        except Exception as e:
            logger.error(f"Bit Write Error: {e}")
            return {"success": False, "error": str(e)}
        finally:
            client.close()

# Singleton instance
modbus_writer = ModbusWriteControl()
