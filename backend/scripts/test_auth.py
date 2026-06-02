import requests

try:
    url = "http://10.1.0.130/witsmlservice/witsmlservice.asmx"
    res = requests.post(url, timeout=3)
    print("Status Code:", res.status_code)
    print("Headers:", res.headers)
except Exception as e:
    print("Error:", e)
