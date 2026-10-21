#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p dist
cp index.html style.css menu.css script.js tutorial.js menu.js dist/
cp -R assets musicas dist/
