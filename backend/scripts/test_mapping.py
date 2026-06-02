from database import SessionLocal
from db_models import WitsmlConfig
from witsml.client import WitsmlClient
from witsml.mapper import MnemonicMapper
import xml.etree.ElementTree as ET

db = SessionLocal()
config = db.query(WitsmlConfig).first()
c = WitsmlClient(config.server_url, config.username, config.password)

# Get mapped mnemonics
custom_mappings = {}
for mapping in config.channel_mappings:
    custom_mappings[mapping.witsml_mnemonic.upper()] = mapping.app_parameter

# Query recent WITSML data
df = c.get_latest_log_data(config.well_uid, config.wellbore_uid, "Time_1Sec", list(custom_mappings.keys()))

if df is not None and not df.empty:
    print(f"Parsed DataFrame columns: {list(df.columns)}")
    print(f"Data types:\n{df.dtypes}")
    
    # Check if mappings are applied correctly
    print("\nBefore mapping:")
    for col in ['ROT_SPEED', 'Standpipe Pressure 1']:
        if col in df.columns:
            print(f"{col}: {df[col].iloc[0]}")
            
    df_mapped = MnemonicMapper.map_dataframe(df, custom_mappings)
    
    print("\nAfter mapping:")
    print(f"Mapped DataFrame columns: {list(df_mapped.columns)}")
    for col in ['RPM', 'StandpipePressure']:
        if col in df_mapped.columns:
            print(f"{col}: {df_mapped[col].iloc[0]}")
    
else:
    print("No data fetched.")
