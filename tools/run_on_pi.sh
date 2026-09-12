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
STATE="$XDG_RUNTIME_DIR/h11-desktop-scale"
OUTPUT="" OLD_SCALE=""

sway_output() {
  swaymsg -t get_outputs 2>/dev/null | python3 -c '
import json, sys
for o in json.load(sys.stdin):
    if o.get("active"):
        print(o["name"], o.get("scale", 1)); break
' 2>/dev/null
}

restore_scale() {
  [ -n "$OUTPUT" ] && [ -n "$OLD_SCALE" ] && swaymsg output "$OUTPUT" scale "$OLD_SCALE" >/dev/null 2>&1
  rm -f "$STATE"
}

if [ -n "$SWAYSOCK" ] && command -v swaymsg >/dev/null 2>&1; then
  # A previous run that was SIGKILLed, or lost power, never restored the desktop
  # scale and left its note behind. Honour that note before reading the current
  # value, or we would save 1 as "the desktop scale" and lose 1.25 permanently.
  if [ -f "$STATE" ]; then
    read -r SAVED_OUTPUT SAVED_SCALE < "$STATE" || true
    if [ -n "${SAVED_OUTPUT:-}" ] && [ -n "${SAVED_SCALE:-}" ]; then
      echo "note: a previous run left the panel at game scale; restoring $SAVED_SCALE" >&2
      swaymsg output "$SAVED_OUTPUT" scale "$SAVED_SCALE" >/dev/null 2>&1 || true
    fi
    rm -f "$STATE"
  fi
  read -r OUTPUT OLD_SCALE <<<"$(sway_output)"
fi

if [ -n "$OUTPUT" ] && [ "$OLD_SCALE" != "1.000000" ] && [ "$OLD_SCALE" != "1" ]; then
  # Persist BEFORE changing anything: the trap covers a clean exit, the file covers
  # everything else - SIGKILL, a power cut, a second launch stepping on the first.
  printf '%s %s\n' "$OUTPUT" "$OLD_SCALE" > "$STATE"
  trap restore_scale EXIT INT TERM
  swaymsg output "$OUTPUT" scale 1 >/dev/null 2>&1
fi

# Not exec: the trap above has to run when the game exits.
./h11.arm64 --display-driver wayland --fullscreen "$@"
