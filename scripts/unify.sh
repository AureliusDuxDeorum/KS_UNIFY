#!/bin/bash

PROJECT_ROOT="/home/prometheus/KS_UNIFY"
API_SETTINGS="$PROJECT_ROOT/configs/api_settings.json"

echo ""
echo "=================================="
echo "         KS UNIFY START"
echo "=================================="
echo ""

cd "$PROJECT_ROOT" || exit 1

source .venv/bin/activate

HOST=$(python3 - <<EOF2
import json
from pathlib import Path

path = Path("$API_SETTINGS")

if path.exists():
    data = json.loads(path.read_text())
    print(data.get("host", "0.0.0.0"))
else:
    print("0.0.0.0")
EOF2
)

PORT=$(python3 - <<EOF2
import json
from pathlib import Path

path = Path("$API_SETTINGS")

if path.exists():
    data = json.loads(path.read_text())
    print(data.get("port", 8000))
else:
    print(8000)
EOF2
)

echo "[1/1] Starting Backend..."
echo "Host: $HOST"
echo "Port: $PORT"
echo ""

uvicorn backend.api.main:app \
    --host "$HOST" \
    --port "$PORT" \
    --reload
