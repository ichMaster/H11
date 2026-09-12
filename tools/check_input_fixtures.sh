#!/usr/bin/env bash
# Prove that a broken input table fails at load with a named reason.
#
#   tools/check_input_fixtures.sh
#
# Five ways data/input.json can be wrong, each swapped in, run, and checked for its
# own message. This cannot live inside --smoke: the table is read by the Game autoload
# before any test code runs, so one process can only ever exercise one table. The
# harness is therefore a loop of processes, which is also how a person would do it.
#
# --smoke covers the positive contract (twelve actions, all bound, right profile);
# this covers the negative one. Exits 0 when every fixture fails as intended.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TABLE="$ROOT/data/input.json"
BACKUP="$(mktemp)"
cp "$TABLE" "$BACKUP"
# Always put the real table back, whatever happens - a half-swapped fixture left
# behind would break every later run in a way that looks like a code bug.
trap 'cp "$BACKUP" "$TABLE"; rm -f "$BACKUP"' EXIT INT TERM

# case name : substring its error must contain
CASES=(
	"unknown-action:unknown action"
	"unknown-key:unknown key"
	"conflict:bound to both"
	"empty:bound to nothing"
	"missing:never binds it"
)

fail=0
for entry in "${CASES[@]}"; do
	name="${entry%%:*}"
	want="${entry#*:}"
	python3 - "$name" "$BACKUP" "$TABLE" <<'PY'
import json, sys, pathlib
case, src, dst = sys.argv[1], sys.argv[2], sys.argv[3]
d = json.load(open(src))
b = d["profiles"]["desktop"]["bind"]
if case == "unknown-action": b["fly_up"] = ["J"]
elif case == "unknown-key":  b["fire"] = ["Spacebarr"]
elif case == "conflict":     b["use"] = ["F", "Space"]   # Space already on fire
elif case == "empty":        b["run"] = []
elif case == "missing":      del b["quit"]
pathlib.Path(dst).write_text(json.dumps(d, indent=2))
PY
	got="$(godot --headless --path "$ROOT" -- --smoke 2>&1 | grep -oE 'Invalid input table: .*' | head -1 || true)"
	if [ -z "$got" ]; then
		echo "FAIL $name: the table was accepted, no error raised"
		fail=1
	elif ! printf '%s' "$got" | grep -q "$want"; then
		echo "FAIL $name: expected a message containing '$want', got: $got"
		fail=1
	else
		echo "ok   $name: ${got#Invalid input table: }"
	fi
done

cp "$BACKUP" "$TABLE"
real="$(godot --headless --path "$ROOT" -- --smoke 2>&1 | grep -cE '^\[smoke\] ALL PASSED' || true)"
if [ "$real" != "1" ]; then
	echo "FAIL the real table no longer passes --smoke"
	fail=1
else
	echo "ok   the real table still passes --smoke"
fi

echo
[ "$fail" = 0 ] && echo "every malformed input table fails at load with its own reason" \
	|| echo "some fixtures did not fail as intended"
exit "$fail"
