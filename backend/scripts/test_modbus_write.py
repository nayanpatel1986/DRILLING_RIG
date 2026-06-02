import asyncio
import unittest
from unittest.mock import MagicMock, patch, AsyncMock
from services.modbus_control import ModbusWriteControl

class TestModbusWrite(unittest.IsolatedAsyncioTestCase):
    
    def setUp(self):
        self.writer = ModbusWriteControl()
        # Reset forbidden lists for testing
        ModbusWriteControl.FORBIDDEN_COILS = [10]
        ModbusWriteControl.FORBIDDEN_REGISTERS = [100]

    async def test_write_coil_success(self):
        with patch('services.modbus_control.AsyncModbusTcpClient') as mock_client:
            instance = mock_client.return_value
            instance.connect = AsyncMock(return_value=True)
            instance.connected = True
            instance.write_coil = AsyncMock(return_value=MagicMock(isError=lambda: False))
            instance.close = AsyncMock()

            result = await self.writer.write_coil("127.0.0.1", 502, 1, 1, True)
            
            self.assertTrue(result["success"])
            self.assertEqual(result["address"], 1)
            instance.write_coil.assert_called_once_with(1, True, slave=1)

    async def test_write_coil_forbidden(self):
        result = await self.writer.write_coil("127.0.0.1", 502, 1, 10, True)
        self.assertFalse(result["success"])
        self.assertIn("reserved", result["error"])

    async def test_write_register_success(self):
        with patch('services.modbus_control.AsyncModbusTcpClient') as mock_client:
            instance = mock_client.return_value
            instance.connect = AsyncMock(return_value=True)
            instance.connected = True
            instance.write_register = AsyncMock(return_value=MagicMock(isError=lambda: False))
            instance.close = AsyncMock()

            result = await self.writer.write_register("127.0.0.1", 502, 1, 1, 1234)
            
            self.assertTrue(result["success"])
            instance.write_register.assert_called_once_with(1, 1234, slave=1)

    async def test_write_register_out_of_range(self):
        result = await self.writer.write_register("127.0.0.1", 502, 1, 1, 70000)
        self.assertFalse(result["success"])
        self.assertIn("out of 16-bit range", result["error"])

    async def test_write_register_forbidden(self):
        result = await self.writer.write_register("127.0.0.1", 502, 1, 100, 1234)
        self.assertFalse(result["success"])
        self.assertIn("reserved", result["error"])

    async def test_connection_failure(self):
        with patch('services.modbus_control.AsyncModbusTcpClient') as mock_client:
            instance = mock_client.return_value
            instance.connect = AsyncMock(return_value=True)
            instance.connected = False # Simulate connection failed after "connect()" call
            instance.close = AsyncMock()

            result = await self.writer.write_coil("127.0.0.1", 502, 1, 1, True)
            self.assertFalse(result["success"])
            self.assertIn("Could not connect", result["error"])

if __name__ == '__main__':
    unittest.main()
