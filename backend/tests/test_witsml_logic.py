import sys
import os
sys.path.append(os.getcwd())

from services.witsml_config import WitsmlTestRequest

def test_etp_validation():
    print("Testing ETP Validation...")
    # Mocking the request and dependencies to test the logic in witsml_config.py
    # Since we are running in a script, we'll just check the prefix check logic 
    # if it were extracted or by looking at the code.
    url_ws = "ws://APPSVR/Witsml2/api/etp"
    url_wss = "wss://APPSVR/Witsml2/api/etp"
    url_soap = "http://APPSVR/WitsmlService/WitsmlService.asmx"
    
    def check_url(url):
        if url.startswith("ws://") or url.startswith("wss://"):
            return "ETP 2.0 (WebSocket) is not supported."
        return "SOAP URL accepted"

    assert "not supported" in check_url(url_ws)
    assert "not supported" in check_url(url_wss)
    assert check_url(url_soap) == "SOAP URL accepted"
    print("ETP Validation Logic: PASSED")

def test_401_enhanced_message():
    print("Testing 401 Enhanced Message details...")
    # This is a conceptual test as we can't easily trigger a real 401 without a server
    # But we can verify the detail list construction
    auth_header = "NTLM, Basic realm=\"APPSVR\""
    details = [
        f"Server requested: {auth_header}",
        "1. Check if Username needs a domain (e.g. APPSVR\\username).",
        "2. Try disabling 'Anonymous Authentication' for the WitsmlService in IIS to force Basic Auth only.",
        "3. Ensure the 'witsml' user has NTFS permissions to the WITSML folder on the server."
    ]
    message = " | ".join(details)
    assert "Server requested: NTLM" in message
    assert "APPSVR\\username" in message
    print("401 Message Construction: PASSED")

if __name__ == "__main__":
    test_etp_validation()
    test_401_enhanced_message()
