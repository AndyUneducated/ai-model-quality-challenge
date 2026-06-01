#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "[1/4] Task1 unit tests + build"
(cd task1-ui && npm ci && npm run test && npm run build)

echo "[2/4] Task2 unit/integration tests"
(cd evalscope_ext && python3 -m pip install -e ".[dev]" && python3 -m pytest tests/ -q)

echo "[3/4] Generate Task2 artifacts"
python3 -m evalscope_ext.tools.generate_artifacts

echo "[4/4] Build scorecard"
python3 scripts/build_scorecard.py

echo "Done. Evidence: artifacts/scorecard.json"
