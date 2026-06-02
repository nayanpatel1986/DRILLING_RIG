import sys

filepath = r'c:\DS_E1400RIG\frontend\dist\static\index-Cw3cqD19.js'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_str = 'h(w.key).toFixed(w.key==="ROP"?1:w.key==="BlockPosition"?2:0)'
print(f"toFixed count in file: {content.count('toFixed')}")
print(f"Exact pattern found: {old_str in content}")

# Search for toFixed near relevant keys
idx = 0
found_any = False
while True:
    idx = content.find('.toFixed(', idx)
    if idx == -1:
        break
    start = max(0, idx - 60)
    end = min(len(content), idx + 120)
    snippet = content[start:end]
    if any(k in snippet for k in ['ROP', 'BlockPosition', 'PitVolume', 'kpi', 'KPI']):
        print(f"\nFOUND at pos {idx}:")
        print(f"  {snippet}")
        found_any = True
    idx += 1

if not found_any:
    print("\nNo KPI-related toFixed patterns found. Showing ALL toFixed occurrences:")
    idx = 0
    count = 0
    while True:
        idx = content.find('.toFixed(', idx)
        if idx == -1:
            break
        start = max(0, idx - 40)
        end = min(len(content), idx + 80)
        snippet = content[start:end]
        count += 1
        print(f"\n  [{count}] pos {idx}: {snippet}")
        idx += 1

if old_str in content:
    rep = '["PitVolume1","PitVolume2","PitVolume3","PitVolume4","TripTank1","TripTank2","TripTankGL","BlockPosition"].includes(w.key)?2:w.key==="ROP"?1:0'
    content = content.replace(old_str, f'h(w.key).toFixed({rep})')
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("\nSUCCESS: File patched!")
else:
    print("\nPattern not found - need to find the actual minified pattern.")
