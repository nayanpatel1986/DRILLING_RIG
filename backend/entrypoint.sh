#!/bin/sh
# DrillBit Backend Entrypoint
# 1. Seeds permanent users (admin + any configured users) on first run
# 2. Seeds default Modbus devices on first run
# 3. Syncs Telegraf configuration from database (ensures restored configs are applied)
# 4. Starts Uvicorn

echo "[Entrypoint] Seeding database users..."
python /app/seed_users.py

echo "[Entrypoint] Seeding Modbus configurations..."
python /app/seed_modbus.py

echo "[Entrypoint] Syncing Telegraf configuration from database..."
python -c "import sys; sys.path.insert(0, '/app'); from services.telegraf_sync import sync_telegraf_config; sync_telegraf_config()"

echo "[Entrypoint] Starting Uvicorn..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
