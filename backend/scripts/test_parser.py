import xmltodict
from witsml.parser import WitsmlParser

xml_data = """<?xml version="1.0" encoding="utf-8"?>
<logs xmlns="http://www.witsml.org/schemas/131" version="1.3.1.1">
    <log uidWell="ong ABCD" uidWellbore="ong ABCD" uid="Time_55sec">
        <nameWell>ong ABCD</nameWell>
        <logCurveInfo uid="1"><mnemonic>TIME</mnemonic></logCurveInfo>
        <logCurveInfo uid="2"><mnemonic>ROP</mnemonic></logCurveInfo>
        <logCurveInfo uid="3"><mnemonic>HKLD</mnemonic></logCurveInfo>
        <logData>
            <data>2026-02-26T12:00:00Z, 55.4, 120.5</data>
            <data>2026-02-26T12:00:05Z, 56.1, 119.2</data>
        </logData>
    </log>
</logs>
"""

df = WitsmlParser.parse_log(xml_data)
print("Parsed DF:")
print(df)
