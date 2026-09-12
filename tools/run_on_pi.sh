#!/usr/bin/env bash
# Start H11 on the PocketTerm35 from inside (or over ssh into) the Sway session.
cd "$(dirname "$0")"
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
if [ -z "${WAYLAND_DISPLAY:-}" ]; then
  export WAYLAND_DISPLAY="$(ls "$XDG_RUNTIME_DIR" | grep -m1 '^wayland-[0-9]*$')"
fi
exec ./h11.arm64 --display-driver wayland --fullscreen "$@"
