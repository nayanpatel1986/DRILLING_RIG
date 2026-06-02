import sys
import os
sys.path.append(os.getcwd())

from main import convert_units_to_metric

def test_setpoints_mapping():
    print("Testing Twinstop Setpoints Mapping...")
    
    # Mock data rows (dict and list of dicts)
    mock_row = {
        "CROWNOMATIC": 12.3456,
        "FLOOROMATIC": 1.2,
        "ALARAMOFFSET": 3.456,
        "BitDepth": 1000.123,
    }
    
    # Process
    result = convert_units_to_metric(mock_row)
    
    # Asserts
    assert result["Crownomatic"] == 12.35, f"Expected 12.35, got {result.get('Crownomatic')}"
    assert result["Flooromatic"] == 1.20, f"Expected 1.20, got {result.get('Flooromatic')}"
    assert result["AlarmOffset"] == 3.46, f"Expected 3.46, got {result.get('AlarmOffset')}"
    assert result["BitDepth"] == 1000.12
    
    # Check list version
    mock_list = [
        {"CROWNOMATIC": 20.016, "FLOOROMATIC": 5.004, "ALARAMOFFSET": 1.111},
        {"CROWNOMATIC": None, "FLOOROMATIC": 0.0, "ALARAMOFFSET": 0.0}
    ]
    result_list = convert_units_to_metric(mock_list)
    assert result_list[0]["Crownomatic"] == 20.02
    assert result_list[0]["Flooromatic"] == 5.0
    assert result_list[0]["AlarmOffset"] == 1.11
    
    assert "Crownomatic" not in result_list[1] or result_list[1]["Crownomatic"] is None
    assert result_list[1]["Flooromatic"] == 0.0
    assert result_list[1]["AlarmOffset"] == 0.0
    
    print("Twinstop Setpoints Mapping: PASSED")

if __name__ == "__main__":
    test_setpoints_mapping()
