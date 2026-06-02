from database import SessionLocal
from db_models import WitsmlConfig
from witsml.client import WitsmlClient
import pandas as pd

db = SessionLocal()
config = db.query(WitsmlConfig).first()
if config is None:
    print("NO CONFIG FOUND")
    exit()

client = WitsmlClient(config.server_url, config.username, config.password)
df = client.get_latest_log_data(config.well_uid, config.wellbore_uid, config.log_uid, ['Standpipe Pressure 1', 'STP_PRS_1'])

if df is not None and not df.empty:
    print("LATEST DATA ROW:")
    print(df.iloc[-1].to_dict())
    print("\nCOLUMNS FOUND:")
    print(list(df.columns))
else:
    print("No data received from WITSML.")
