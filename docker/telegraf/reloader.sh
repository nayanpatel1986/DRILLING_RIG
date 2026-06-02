#!/bin/sh
# Telegraf Config Reloader
# Watches for changes in telegraf.conf and sends a SIGHUP to telegraf
# This replaces the need for mounting docker.sock in the backend.

CONFIG_FILE="/etc/telegraf/telegraf.conf"
LAST_MOD=$(stat -c %Y "$CONFIG_FILE")

echo "[Reloader] Starting config monitor for $CONFIG_FILE..."

# Start telegraf in the background
telegraf "$@" &
TELEGRAF_PID=$!

while true; do
  sleep 5
  CURRENT_MOD=$(stat -c %Y "$CONFIG_FILE")
  
  if [ "$CURRENT_MOD" != "$LAST_MOD" ]; then
    echo "[Reloader] Configuration change detected! Reloading Telegraf..."
    # Telegraf supports SIGHUP for graceful reload of most plugins
    kill -HUP $TELEGRAF_PID
    LAST_MOD=$CURRENT_MOD
  fi
  
  # Check if telegraf is still running
  if ! kill -0 $TELEGRAF_PID 2>/dev/null; then
    echo "[Reloader] Telegraf process died. Exiting..."
    exit 1
  fi
done
