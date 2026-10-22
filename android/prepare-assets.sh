#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
bash build-site.sh
mkdir -p android/app/src/main/assets
cp -R dist/. android/app/src/main/assets/
# Use system fonts offline instead of making a Google Fonts request.
python3 - <<'PY'
from pathlib import Path
p = Path('android/app/src/main/assets/style.css')
s = p.read_text()
p.write_text('\n'.join(line for line in s.splitlines() if not line.startswith('@import')))
PY
