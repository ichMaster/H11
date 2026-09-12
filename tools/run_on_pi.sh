#!/usr/bin/env bash
# Start H11 on the PocketTerm35 from inside (or over ssh into) the Sway session.
cd "$(dirname "$0")"
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
if [ -z "${WAYLAND_DISPLAY:-}" ]; then
  export WAYLAND_DISPLAY="$(ls "$XDG_RUNTIME_DIR" | grep -m1 '^wayland-[0-9]*$')"
fi

# The desktop runs the panel at scale 1.25 (an effective 512x384) so terminal
# text stays readable at arm's length. That is right for the desktop and wrong
# for this game: it renders 640x480, exactly the panel's mode, and any non-unit
# scale resamples every pixel of hand-drawn pixel art. So drop to scale 1 for
# the duration of the game and put the desktop back exactly as it was.
SWAYSOCK="${SWAYSOCK:-$(ls "$XDG_RUNTIME_DIR"/sway-ipc.*.sock 2>/dev/null | head -1)}"
export SWAYSOCK
OUTPUT="" OLD_SCALE=""
if [ -n "$SWAYSOCK" ] && command -v swaymsg >/dev/null 2>&1; then
  read -r OUTPUT OLD_SCALE <<<"$(swaymsg -t get_outputs 2>/dev/null | python3 -c '
import json, sys
for o in json.load(sys.stdin):
    if o.get("active"):
        print(o["name"], o.get("scale", 1)); break
' 2>/dev/null)"
fi

restore_scale() {
  [ -n "$OUTPUT" ] && [ -n "$OLD_SCALE" ] && swaymsg output "$OUTPUT" scale "$OLD_SCALE" >/dev/null 2>&1
}

if [ -n "$OUTPUT" ] && [ "$OLD_SCALE" != "1.000000" ] && [ "$OLD_SCALE" != "1" ]; then
  trap restore_scale EXIT INT TERM
  swaymsg output "$OUTPUT" scale 1 >/dev/null 2>&1
fi

# Not exec: the trap above has to run when the game exits.
./h11.arm64 --display-driver wayland --fullscreen "$@"
