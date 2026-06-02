import pandas as pd
from witsml.client import WitsmlClient
from database import SessionLocal
from db_models import WitsmlConfig

db = SessionLocal()
config = db.query(WitsmlConfig).first()
c = WitsmlClient(config.server_url, config.username, config.password)
keys = [m.witsml_mnemonic.upper() for m in config.channel_mappings]

# Let's see if 10 curves works, 20 curves works, etc
for batch_size in [10, 20, 30, len(keys)]:
    test_keys = keys[:batch_size]
    df = c.get_latest_log_data(config.well_uid, config.wellbore_uid, config.log_uid, test_keys)
    print(f"Batch {batch_size} requested.")
    if not df.empty:
        print(f"  Returned {len(df.columns)} columns")
    else:
        print(f"  Returned EMPTY!")
