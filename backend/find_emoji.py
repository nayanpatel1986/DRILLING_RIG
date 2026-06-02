import sys, os

# Read the bundle from the host-mounted volume
filepath = '/app/dist/static/index-Cw3cqD19.js'

# The frontend volume is mounted at /app in the frontend container
# but we need to access it from the backend. Since volumes are separate,
# we'll modify the file on the host via PowerShell.
# This script is just a template for the replacements needed.

# Actually let's just print the exact byte sequences we need to find
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the Rig Activity pattern
idx = content.find('Rig Activity')
if idx >= 0:
    start = max(0, idx - 50)
    end = min(len(content), idx + 50)
    snippet = content[start:end]
    print(f"RIG ACTIVITY context: {repr(snippet)}")

# Find the stat label pattern  
idx = content.find('s.label')
while idx >= 0:
    start = max(0, idx - 80)
    end = min(len(content), idx + 30)
    snippet = content[start:end]
    if 'tracking' in snippet:
        print(f"STAT LABEL context: {repr(snippet)}")
        break
    idx = content.find('s.label', idx + 1)
