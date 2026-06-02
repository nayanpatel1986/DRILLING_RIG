import requests
from requests.auth import HTTPBasicAuth
import os
import sys

# Load from db
sys.path.append('/app')
from database import SessionLocal
from db_models import WitsmlConfig

db = SessionLocal()
config = db.query(WitsmlConfig).filter(WitsmlConfig.id == 1).first()
if not config:
    print("No config found")
    sys.exit()

url = "http://10.1.0.130/witsmlservice/witsmlservice.asmx"

usernames_to_test = [
    config.username,
    f"appsvr\\{config.username}",
    f"{config.username}@appsvr",
    "appsvr", # just in case
]

for uname in usernames_to_test:
    auth = HTTPBasicAuth(uname, config.password)
    res = requests.post(url, auth=auth, timeout=3)
    print(f"Testing {uname}: {res.status_code}")
