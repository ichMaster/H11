#!/usr/bin/env bash
# Build, copy and start H11 on the PocketTerm35.
#
#   tools/deploy_to_term35.sh              copy the existing build and start it
#   tools/deploy_to_term35.sh --build      export from source first
#   tools/deploy_to_term35.sh --no-run     copy only, do not start the game
#   tools/deploy_to_term35.sh --stop       stop whatever is running on the device
#   tools/deploy_to_term35.sh --log        tail the game log on the device
#   tools/deploy_to_term35.sh --setup-key  install an ssh key (asked once, then
#                                          every deploy runs without a password)
#
# Connection details are read at run time from .term35-connect.txt in the repo
# root ("ip:", "user:", "psswd:", one per line). That file is gitignored on
# purpose: nothing here hardcodes, echoes or logs the password.
#
# Compared with deploy_to_pi.sh this one reads the credentials file, can export
# the build itself and starts the game over ssh instead of asking you to.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONN_FILE="${TERM35_CONN_FILE:-$ROOT/.term35-connect.txt}"
PRESET="PocketTerm35 (Linux arm64)"
BIN="$ROOT/build/h11.arm64"
REMOTE_DIR="h11"
EXE="h11.arm64"

do_build=0 do_run=1 setup_key=0 stop_only=0 log_only=0
for arg in "$@"; do
	case "$arg" in
		--build) do_build=1 ;;
		--no-run) do_run=0 ;;
		--setup-key) setup_key=1 ;;
		--stop) stop_only=1 ;;
		--log) log_only=1 ;;
		-h|--help) sed -n '2,17p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
		*) echo "Unknown option: $arg (try --help)" >&2; exit 2 ;;
	esac
done

die() { echo "error: $*" >&2; exit 1; }

# --- credentials -------------------------------------------------------------

[ -f "$CONN_FILE" ] || die "no credentials file at $CONN_FILE
Create it with at least:
  ip: 192.168.1.105
  user: ich
  psswd: <device password>"

# Reads "key: value" from the credentials file. Tolerates spaces and CRLF.
cfg_get() {
	sed -n "s/^[[:space:]]*$1[[:space:]]*:[[:space:]]*//p" "$CONN_FILE" | head -1 | tr -d '\r' | sed 's/[[:space:]]*$//'
}

IP="$(cfg_get ip)"
DEV_USER="$(cfg_get user)"
DEV_PASS="$(cfg_get psswd)"
[ -n "$IP" ] || die "no 'ip:' line in $CONN_FILE"
[ -n "$DEV_USER" ] || die "no 'user:' line in $CONN_FILE"
TARGET="$DEV_USER@$IP"

# --- ssh transport -----------------------------------------------------------

SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=8)

key_auth_works() {
	ssh -o BatchMode=yes "${SSH_OPTS[@]}" "$TARGET" true 2>/dev/null
}

## Tell "the device is switched off" apart from "the key is not installed".
## Without this every unreachable host looks like an auth failure.
reachable() {
	if command -v nc >/dev/null 2>&1; then
		nc -z -G 5 "$IP" 22 >/dev/null 2>&1
	else
		(exec 3<>"/dev/tcp/$IP/22") >/dev/null 2>&1
	fi
}

reachable || die "no answer from $IP on port 22.
The PocketTerm is powered off, asleep, or on a different network.
Check it is on and reachable, then run this again."

if [ "$setup_key" = 1 ]; then
	[ -f "$HOME/.ssh/id_ed25519.pub" ] || [ -f "$HOME/.ssh/id_rsa.pub" ] || {
		echo "==> no ssh key yet, generating one"
		ssh-keygen -t ed25519 -N "" -f "$HOME/.ssh/id_ed25519"
	}
	echo "==> installing your public key on $TARGET"
	if command -v sshpass >/dev/null 2>&1 && [ -n "$DEV_PASS" ]; then
		sshpass -p "$DEV_PASS" ssh-copy-id "${SSH_OPTS[@]}" "$TARGET"
	else
		echo "    (the password is the 'psswd:' line in $CONN_FILE)"
		ssh-copy-id "${SSH_OPTS[@]}" "$TARGET"
	fi
	key_auth_works && echo "==> key auth works, deploys need no password now" \
		|| die "key installed but key auth still fails"
	exit 0
fi

SSH=(ssh "${SSH_OPTS[@]}")
SCP=(scp "${SSH_OPTS[@]}")
if key_auth_works; then
	:
elif command -v sshpass >/dev/null 2>&1 && [ -n "$DEV_PASS" ]; then
	# Password from the credentials file; never printed, never in the argv of ssh.
	SSH=(sshpass -p "$DEV_PASS" "${SSH[@]}")
	SCP=(sshpass -p "$DEV_PASS" "${SCP[@]}")
else
	cat >&2 <<EOF
error: cannot log in to $TARGET without typing a password every time.

Fix it once with:
    tools/deploy_to_term35.sh --setup-key

(or install sshpass: brew install hudochenkov/sshpass/sshpass)
EOF
	exit 1
fi

# --- one-off actions ---------------------------------------------------------

if [ "$stop_only" = 1 ]; then
	"${SSH[@]}" "$TARGET" "pkill -x '$EXE' || true"
	echo "==> stopped"
	exit 0
fi

if [ "$log_only" = 1 ]; then
	exec "${SSH[@]}" "$TARGET" "tail -f ~/$REMOTE_DIR/$EXE.log"
fi

# --- build -------------------------------------------------------------------

if [ "$do_build" = 1 ]; then
	command -v godot >/dev/null 2>&1 || die "godot is not on PATH (brew install --cask godot)"
	mkdir -p "$(dirname "$BIN")"
	echo "==> exporting \"$PRESET\""
	if ! godot --headless --path "$ROOT" --export-release "$PRESET" "$BIN"; then
		die "export failed.
The Linux export templates are most likely missing. Install them once with
Godot open: Editor > Manage Export Templates > Download and Install."
	fi
fi

[ -f "$BIN" ] || die "no build at $BIN
Run with --build, or export from the editor: Project > Export > \"$PRESET\"."

# --- copy --------------------------------------------------------------------

echo "==> deploying $(du -h "$BIN" | cut -f1) to $TARGET:~/$REMOTE_DIR/"
"${SSH[@]}" "$TARGET" "mkdir -p ~/$REMOTE_DIR"
# Stop the running game first: a busy binary cannot be overwritten.
"${SSH[@]}" "$TARGET" "pkill -x '$EXE' || true"
"${SCP[@]}" "$BIN" "$TARGET:~/$REMOTE_DIR/$EXE"
"${SCP[@]}" "$ROOT/tools/run_on_pi.sh" "$TARGET:~/$REMOTE_DIR/"
"${SSH[@]}" "$TARGET" "chmod +x ~/$REMOTE_DIR/$EXE ~/$REMOTE_DIR/run_on_pi.sh"

if [ "$do_run" = 0 ]; then
	echo "==> copied. Start it on the device with:  ~/$REMOTE_DIR/run_on_pi.sh"
	exit 0
fi

# --- run ---------------------------------------------------------------------

echo "==> starting the game on the device"
# Two details, both learned the hard way:
#  * setsid, not just nohup - the game must leave this ssh session's process
#    group, or it dies the moment the connection closes.
#  * ssh -f - a surviving process keeps the ssh channel's fds open, so a normal
#    ssh call would hang forever waiting for EOF instead of returning.
#  * the trailing "&" plus >/dev/null here - otherwise the backgrounded ssh
#    keeps this script's own stdout open and any pipeline around it never ends.
"${SSH[@]}" -f "$TARGET" "cd ~/$REMOTE_DIR && setsid ./run_on_pi.sh >$EXE.log 2>&1 </dev/null &" >/dev/null 2>&1

# Separate connection: proves the game outlived the one that spawned it.
sleep 4
if "${SSH[@]}" "$TARGET" "pgrep -x '$EXE' >/dev/null" 2>/dev/null; then
	echo "==> running"
else
	echo "the game did not stay up, last log lines:" >&2
	"${SSH[@]}" "$TARGET" "tail -20 ~/$REMOTE_DIR/$EXE.log" >&2 || true
	exit 1
fi

echo "==> done.  logs: tools/deploy_to_term35.sh --log   stop: tools/deploy_to_term35.sh --stop"
