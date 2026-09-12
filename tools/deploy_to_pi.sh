#!/usr/bin/env bash
# Copy the exported arm64 build to the PocketTerm and start it under Sway.
#   tools/deploy_to_pi.sh [user@host]
# Export first from the Godot editor (Project > Export > "PocketTerm35 (Linux arm64)")
# or from the command line:
#   godot --headless --path . --export-release "PocketTerm35 (Linux arm64)" build/h11.arm64
set -euo pipefail
HOST="${1:-pi@pocketterm.local}"
BIN="build/h11.arm64"
[ -f "$BIN" ] || { echo "No build at $BIN - export the project first."; exit 1; }
ssh "$HOST" 'mkdir -p ~/h11'
rsync -avz --progress "$BIN" "$HOST:~/h11/"
scp -q tools/run_on_pi.sh "$HOST:~/h11/"
ssh "$HOST" 'chmod +x ~/h11/h11.arm64 ~/h11/run_on_pi.sh'
echo "Deployed. On the device run:  ~/h11/run_on_pi.sh"
