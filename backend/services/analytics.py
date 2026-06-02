import time
import threading
import asyncio
from services.influx import InfluxWrapper
from database import SessionLocal
from services.modbus_config import get_daq10_dashboard_mappings

class AnalyticsEngine:
    def __init__(self):
        self.running = False
        self.influx = InfluxWrapper()
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.ws_manager = None
    
    @property
    def is_witsml_connected(self):
        return False

    def start(self):
        self.running = True
        self.thread.start()

    def stop(self):
        self.running = False
        self.thread.join()

    def _run_loop(self):
        print("Analytics Engine Started (Modbus Broadcast Only)...")
        last_metadata_update = 0
        cached_metadata = {}
        daq10_mappings = {}

        while self.running:
            current_time = time.time()
            
            # Update mappings periodically
            if current_time - last_metadata_update > 10:
                last_metadata_update = current_time
                db = SessionLocal()
                try:
                    daq10_mappings, cached_metadata = get_daq10_dashboard_mappings(db)
                finally:
                    db.close()

            if self.ws_manager:
                try:
                    # Query latest modbus data from InfluxDB
                    sensor_data = self.influx.query_sensors_latest("modbus") or {}
                    
                    if sensor_data:
                        latest_data = sensor_data.copy()
                        # Apply DAQ-10 mappings to the WebSocket realtime data
                        for src_field, dashboard_key in daq10_mappings.items():
                            if latest_data.get(src_field) is not None:
                                latest_data[dashboard_key] = latest_data[src_field]

                        latest_data.update(cached_metadata)
                        latest_data['_type'] = 'realtime_data'
                        
                        # Apply fallback mappings and roundings for Block Height/Position
                        if "BlockPosition" in latest_data and latest_data["BlockPosition"] is not None:
                            latest_data["BlockPosition"] = round(latest_data["BlockPosition"], 2)
                            latest_data["BLOCK_HEIGHT"] = latest_data["BlockPosition"]
                            latest_data["BLOCK_POS"] = latest_data["BlockPosition"]

                        if "BH" in latest_data and latest_data["BH"] is not None:
                            latest_data["BLOCK_HEIGHT"] = round(latest_data["BH"], 2)
                            latest_data["BLOCK_POS"] = round(latest_data["BH"], 2)
                            latest_data["BlockPosition"] = round(latest_data["BH"], 2)

                        # Rounding other UI fields
                        for f in ["BitDepth", "Depth", "PitVolume1", "PitVolume2", "PitVolume3", "TripTank1"]:
                            if f in latest_data and latest_data[f] is not None:
                                latest_data[f] = round(latest_data[f], 2)

                        # DAQ-10 Twinstop setpoint mappings
                        if "CROWNOMATIC" in latest_data and latest_data["CROWNOMATIC"] is not None:
                            latest_data["Crownomatic"] = round(latest_data["CROWNOMATIC"], 2)
                        if "FLOOROMATIC" in latest_data and latest_data["FLOOROMATIC"] is not None:
                            latest_data["Flooromatic"] = round(latest_data["FLOOROMATIC"], 2)
                        if "ALARAMOFFSET" in latest_data and latest_data["ALARAMOFFSET"] is not None:
                            latest_data["AlarmOffset"] = round(latest_data["ALARAMOFFSET"], 2)
                        
                        if "PUMPPRESSURE" in latest_data and latest_data["PUMPPRESSURE"] is not None:
                            latest_data["StandpipePressure"] = latest_data["PUMPPRESSURE"]

                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                        loop.run_until_complete(self.ws_manager.broadcast(latest_data))
                        loop.close()
                except Exception as e:
                    print(f"WS Error: {e}")

            time.sleep(1.0) # Poll every 1 second

engine = AnalyticsEngine()
