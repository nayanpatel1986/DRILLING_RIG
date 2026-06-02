import requests

try:
    # First, authenticate as admin since the endpoint requires it.
    # The default data is admin / admin123
    session = requests.Session()
    login_data = {"username": "admin", "password": "admin123"}
    r = session.post("http://localhost:8000/auth/login", data=login_data)
    r.raise_for_status()
    token = r.json().get("access_token")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Try creating a device to see default registers populated
    device_payload = {
        "name": "Test Engine Script",
        "device_type": "engine",
        "is_enabled": True
    }
    
    res = session.post("http://localhost:8000/modbus-config/", json=device_payload, headers=headers)
    
    if res.status_code == 200:
        device_data = res.json()
        print(f"Device created: ID {device_data['id']}, Name: {device_data['name']}")
        print(f"Number of generated registers: {len(device_data['registers'])}")
        
        has_new = any(r['field_name'] == 'TotalFuelCons' for r in device_data['registers'])
        print(f"Has new variables like TotalFuelCons?: {has_new}")
        
    else:
        print(f"Failed to create: {res.status_code} - {res.text}")
        
except Exception as e:
    print(f"Error: {e}")
