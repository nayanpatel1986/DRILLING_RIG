from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS
import os

class InfluxWrapper:
    def __init__(self):
        self.url = os.getenv("INFLUXDB_URL", "http://influxdb:8086")
        self.token = os.getenv("INFLUXDB_TOKEN")
        self.org = os.getenv("INFLUXDB_ORG", "nov_rig")
        self.bucket = os.getenv("INFLUXDB_BUCKET", "rig_data")
        
        if not self.token:
            raise RuntimeError("INFLUXDB_TOKEN environment variable is mandatory.")
        
        self.client = InfluxDBClient(url=self.url, token=self.token, org=self.org)
        self.write_api = self.client.write_api(write_options=SYNCHRONOUS)
        self.query_api = self.client.query_api()
        self.delete_api = self.client.delete_api()

    def delete_measurement_data(self, start_iso: str, stop_iso: str, measurement: str):
        """Delete all data for a measurement between two ISO timestamps."""
        try:
            self.delete_api.delete(
                start=start_iso,
                stop=stop_iso,
                predicate=f'_measurement="{measurement}"',
                bucket=self.bucket,
                org=self.org
            )
            print(f"Deleted {measurement} data from {start_iso} to {stop_iso}")
        except Exception as e:
            print(f"InfluxDB Delete Error ({measurement}): {e}")

    def delete_all_well_data(self, start_iso: str, stop_iso: str):
        """Delete all rig data (both WITSML and Modbus) for a well's time range."""
        for m in ["realtime_drilling", "modbus"]:
            self.delete_measurement_data(start_iso, stop_iso, m)

    def write_point(self, point):
        try:
            self.write_api.write(bucket=self.bucket, org=self.org, record=point)
        except Exception as e:
            print(f"InfluxDB Write Error: {e}")

    def write_dataframe(self, df, measurement_name, tag_columns=None):
        try:
            self.write_api.write(bucket=self.bucket, org=self.org, record=df, 
                               data_frame_measurement_name=measurement_name,
                               data_frame_tag_columns=tag_columns)
        except Exception as e:
            print(f"InfluxDB DataFrame Write Error: {e}")

    def query_latest(self, measurement="realtime_drilling"):
        """Get the latest values for all fields in a measurement (Secure & Compatible)."""
        try:
            # Validate measurement to prevent injection
            if measurement not in ["realtime_drilling", "modbus", "witsml"]:
                measurement = "realtime_drilling"

            query = f'''
                from(bucket: "{self.bucket}")
                |> range(start: -10m)
                |> filter(fn: (r) => r._measurement == "{measurement}")
                |> last()
            '''
            tables = self.query_api.query(query, org=self.org)
            result = {}
            
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc)
            
            for table in tables:
                for record in table.records:
                    field = record.get_field()
                    value = record.get_value()
                    
                    # Capture the record time precisely
                    rt_dt = record.get_time()
                    rt_str = rt_dt.isoformat().replace("Z", "+00:00")
                    
                    # Store latest time found across all fields
                    if "_time" not in result or rt_str > result["_time"]:
                        result["_time"] = rt_str
                    
                    # Per-field timeout check: 120s is plenty for 1s polling
                    is_stale = (now - rt_dt).total_seconds() > 120
                    
                    if is_stale and isinstance(value, (int, float)):
                        result[field] = 0.0
                    else:
                        result[field] = round(float(value), 2) if isinstance(value, (int, float)) else value
            
            return result
        except Exception as e:
            print(f"InfluxDB Latest Query Error: {e}")
            return {}

    # Keys to exclude from chart data output
    _SKIP_KEYS = {"result", "table", "_start", "_stop", "_measurement",
                  "device_name", "device_type", "host", "name",
                  "rig_id", "slave_id", "type"}

    def _merge_records(self, tables):
        """Parse query results, merge rows by timestamp, strip tag columns."""
        merged = {}
        for table in tables:
            for record in table.records:
                t = record.get_time().isoformat()
                if t not in merged:
                    merged[t] = {"time": t}
                row = merged[t]
                for key, val in record.values.items():
                    if key.startswith("_") or key in self._SKIP_KEYS:
                        continue
                    if isinstance(val, (int, float)):
                        row[key] = round(float(val), 2)
                    elif key != "_time":
                        row[key] = val
        return sorted(merged.values(), key=lambda r: r.get("time", ""))

    def query_range(self, range_str="-5m", measurement="realtime_drilling"):
        """Get time-series data for a given range (Secure & Compatible)."""
        try:
            # 1. Strict validation of parameters
            import re
            if not re.match(r'^-?[0-9]+[smhdwy]$', range_str):
                range_str = "-5m"
            if measurement not in ["realtime_drilling", "modbus", "witsml"]:
                measurement = "realtime_drilling"

            # 2. Construction using validated variables
            agg_window = ""
            match = re.match(r'^-?([0-9]+)([smhdwy])$', range_str)
            if match:
                val = int(match.group(1))
                unit = match.group(2)
                # Convert to approximate minutes
                minutes = val
                if unit == 'h': minutes = val * 60
                elif unit == 'd': minutes = val * 24 * 60
                elif unit == 'w': minutes = val * 7 * 24 * 60
                elif unit == 'y': minutes = val * 365 * 24 * 60
                
                if minutes <= 5: # -5m
                    agg_window = ""
                elif minutes <= 15: # -15m
                    agg_window = '|> aggregateWindow(every: 3s, fn: mean, createEmpty: false)'
                elif minutes <= 60: # -1h
                    agg_window = '|> aggregateWindow(every: 10s, fn: mean, createEmpty: false)'
                elif minutes <= 360: # -6h
                    agg_window = '|> aggregateWindow(every: 30s, fn: mean, createEmpty: false)'
                elif minutes <= 1440: # -24h
                    agg_window = '|> aggregateWindow(every: 2m, fn: mean, createEmpty: false)'
                elif minutes <= 4320: # -72h (3d)
                    agg_window = '|> aggregateWindow(every: 10m, fn: mean, createEmpty: false)'
                elif minutes <= 10080: # -7d
                    agg_window = '|> aggregateWindow(every: 30m, fn: mean, createEmpty: false)'
                elif minutes <= 43200: # -30d
                    agg_window = '|> aggregateWindow(every: 2h, fn: mean, createEmpty: false)'
                else: # -180d or more
                    agg_window = '|> aggregateWindow(every: 12h, fn: mean, createEmpty: false)'

            drop_tags = ""
            if measurement == "modbus":
                drop_tags = '|> drop(columns: ["device_name", "device_type", "host", "name", "rig_id", "slave_id", "type"])'

            query = f'''
                from(bucket: "{self.bucket}")
                |> range(start: {range_str})
                |> filter(fn: (r) => r._measurement == "{measurement}")
                {drop_tags}
                {agg_window}
                |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
                |> sort(columns: ["_time"], desc: false)
            '''
            tables = self.query_api.query(query, org=self.org)
            return self._merge_records(tables)
        except Exception as e:
            print(f"InfluxDB Range Query Error: {e}")
            return []

    def query_custom_range(self, start_iso, stop_iso, measurement="realtime_drilling", fields=None):
        """Get time-series data between two absolute ISO timestamps (Secure & Compatible)."""
        try:
            # Strict validation
            import re
            from datetime import datetime
            # Check ISO-like format (simple check)
            if not re.match(r'^\d{4}-\d{2}-\d{2}.*', start_iso): start_iso = "2024-01-01T00:00:00Z"
            if not re.match(r'^\d{4}-\d{2}-\d{2}.*', stop_iso): stop_iso = "2026-01-01T00:00:00Z"
            if measurement not in ["realtime_drilling", "modbus", "witsml"]:
                measurement = "realtime_drilling"

            field_filter = ""
            if fields:
                clauses = " or ".join([f'r._field == "{f}"' for f in fields])
                field_filter = f'|> filter(fn: (r) => {clauses})'

            drop_tags = ""
            if measurement == "modbus":
                drop_tags = '|> drop(columns: ["device_name", "device_type", "host", "name", "rig_id", "slave_id", "type"])'

            def parse_iso(ts):
                return datetime.fromisoformat(ts.replace("Z", "+00:00"))

            agg_window = ""
            try:
                start_dt = parse_iso(start_iso)
                stop_dt = parse_iso(stop_iso)
                duration_seconds = max((stop_dt - start_dt).total_seconds(), 0)

                if duration_seconds <= 15 * 60:
                    every = "3s"
                elif duration_seconds <= 60 * 60:
                    every = "10s"
                elif duration_seconds <= 6 * 60 * 60:
                    every = "30s"
                elif duration_seconds <= 24 * 60 * 60:
                    every = "2m"
                elif duration_seconds <= 7 * 24 * 60 * 60:
                    every = "10m"
                elif duration_seconds <= 30 * 24 * 60 * 60:
                    every = "2h"
                elif duration_seconds <= 90 * 24 * 60 * 60:
                    every = "6h"
                else:
                    every = "12h"

                agg_window = f'|> aggregateWindow(every: {every}, fn: mean, createEmpty: false)'
            except Exception:
                agg_window = ""

            query = f'''
                from(bucket: "{self.bucket}")
                |> range(start: {start_iso}, stop: {stop_iso})
                |> filter(fn: (r) => r._measurement == "{measurement}")
                {field_filter}
                {drop_tags}
                {agg_window}
                |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
                |> sort(columns: ["_time"], desc: false)
            '''
            tables = self.query_api.query(query, org=self.org)
            return self._merge_records(tables)
        except Exception as e:
            print(f"InfluxDB Custom Range Query Error: {e}")
            return []

    def query_sensors_latest(self, measurement="rig_sensors"):
        """Get the latest sensor readings from Telegraf (pivoted for easy access)."""
        try:
            query = f'''
                from(bucket: "{self.bucket}")
                |> range(start: -5m)
                |> filter(fn: (r) => r._measurement == "{measurement}")
                |> last()
            '''
            tables = self.query_api.query(query, org=self.org)
            if not tables or len(tables) == 0:
                # Fallback to broad query to retrieve last recorded timestamp when rig is offline
                query = f'''
                    from(bucket: "{self.bucket}")
                    |> range(start: -365d)
                    |> filter(fn: (r) => r._measurement == "{measurement}")
                    |> last()
                '''
                tables = self.query_api.query(query, org=self.org)
            result = {}
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc)
            
            for table in tables:
                for record in table.records:
                    field = record.get_field()
                    value = record.get_value()
                    
                    rt_dt = record.get_time()
                    rt_str = rt_dt.isoformat().replace("Z", "+00:00")
                    
                    if "_time" not in result or rt_str > result["_time"]:
                        result["_time"] = rt_str
                    
                    is_stale = (now - rt_dt).total_seconds() > 120
                    
                    if is_stale and isinstance(value, (int, float)):
                        result[field] = 0.0
                    else:
                        result[field] = round(float(value), 2) if isinstance(value, (int, float)) else value
            
            return result
        except Exception as e:
            print(f"InfluxDB Sensors Query Error: {e}")
            return {}
