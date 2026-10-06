#!/bin/bash
# Double-click this file to start the Brand Console on a Mac.
cd "$(dirname "$0")"
clear
echo ""
echo "  Brand Console"
echo "  -------------"
if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  Node.js is not installed yet."
  echo "  1. Your browser will open nodejs.org. Download the LTS version and install it."
  echo "  2. Then double-click this file again."
  open "https://nodejs.org/en/download"
  echo ""; read -n 1 -s -r -p "  Press any key to close this window."; exit 1
fi
# Vite, which runs Storybook, needs Node 20.19 or newer.
if ! node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>20||(a===20&&b>=19)?0:1)"; then
  echo ""
  echo "  Your Node.js is version $(node -v). The console needs version 20.19 or newer."
  echo "  Your browser will open nodejs.org. Install the LTS version, then double-click this file again."
  open "https://nodejs.org/en/download"
  echo ""; read -n 1 -s -r -p "  Press any key to close this window."; exit 1
fi
if ! node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=12)?0:1)"; then
  echo ""
  echo "  Your Node.js is version $(node -v). The console works, but the tests need version 22.12 or newer."
  echo "  When you have time, install the LTS version from nodejs.org."
fi
# Set up the first time, and again whenever the project gets new parts (package-lock.json is newer than the last setup).
if [ ! -d node_modules ] || [ ! -f node_modules/.package-lock.json ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  echo ""
  if [ -d node_modules ]; then echo "  The project has new parts. Setting them up. This takes a minute."; else echo "  Setting up for the first time. This takes a minute or two."; fi
  echo ""
  if ! npm install; then
    echo ""
    echo "  Setup did not finish. Copy the red lines above and paste them to Claude."
    echo ""; read -n 1 -s -r -p "  Press any key to close this window."; exit 1
  fi
  touch node_modules/.package-lock.json
fi
echo ""
echo "  Starting. The console opens in your browser in a few seconds."
echo "  To stop, close this window or press Control + C."
echo ""
npm start
