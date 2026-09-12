"""Conformance check for the generated audio in assets/sfx/.

Run:  python3 tools/check_audio.py [--stats]

Three rules:
  1. every WAV decodes, is 16-bit mono at the project rate
  2. no file clips — a peak at full scale means write()'s clamp was reached
  3. a looping file joins itself — the step across the loop point must be no larger
     than the steps inside the file

Rule 3 is the one that has actually bitten: ambient.wav is looped continuously in
game, and a seam discontinuity there is an audible click every six seconds for the
whole run. The threshold is relative, not absolute: the jump from the last sample to
the first is compared against the 99.9th-percentile jump within the file, so a loud
sound is allowed a loud seam and a quiet hum is not.

Pure stdlib, like tools/gen_sounds.py. Exits 0 if every file passes, 1 otherwise.
"""
import os
import struct
import sys
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SFX = os.path.join(ROOT, "assets", "sfx")
RATE = 22050
# Files the game loops. Everything else is one-shot and its seam never plays.
LOOPING = {"ambient.wav"}
SEAM_TOLERANCE = 1.5  # seam jump may be at most this * the file's own p99.9 jump


def read_wav(path):
    with wave.open(path, "rb") as w:
        if w.getnchannels() != 1 or w.getsampwidth() != 2:
            raise ValueError("expected 16-bit mono, got %dch/%dB" % (w.getnchannels(), w.getsampwidth()))
        if w.getframerate() != RATE:
            raise ValueError("expected %d Hz, got %d" % (RATE, w.getframerate()))
        n = w.getnframes()
        return list(struct.unpack("<%dh" % n, w.readframes(n)))


def percentile(values, q):
    if not values:
        return 0
    s = sorted(values)
    return s[min(len(s) - 1, int(len(s) * q))]


def check(name, want_stats):
    path = os.path.join(SFX, name)
    try:
        d = read_wav(path)
    except (ValueError, wave.Error, struct.error) as e:
        return ["unreadable: %s" % e], ""
    if not d:
        return ["empty file"], ""

    problems = []
    peak = max(abs(x) for x in d)
    if peak >= 32767:
        problems.append("clips (peak %d at full scale)" % peak)

    steps = [abs(d[i] - d[i - 1]) for i in range(1, len(d))]
    typical = percentile(steps, 0.999)
    seam = abs(d[0] - d[-1])
    if name in LOOPING:
        allowed = max(64, int(typical * SEAM_TOLERANCE))
        if seam > allowed:
            problems.append("loop seam jumps %d, allowed %d (p99.9 step inside the file is %d)"
                            % (seam, allowed, typical))

    stats = ""
    if want_stats:
        rms = (sum(x * x for x in d) / len(d)) ** 0.5
        stats = "%5.2fs  peak %5.1f%%  rms %4.1f%%%s" % (
            len(d) / RATE, 100.0 * peak / 32768, 100.0 * rms / 32768,
            "  seam %d vs p99.9 step %d" % (seam, typical) if name in LOOPING else "")
    return problems, stats


def main():
    want_stats = "--stats" in sys.argv[1:]
    names = sorted(f for f in os.listdir(SFX) if f.endswith(".wav"))
    if not names:
        print("no WAVs in %s" % SFX)
        return 1
    failed = 0
    for name in names:
        problems, stats = check(name, want_stats)
        if problems:
            failed += 1
            print("FAIL %-16s %s" % (name, "; ".join(problems)))
        else:
            print("ok   %-16s %s" % (name, stats))
    print("\n%d/%d sounds decode, stay under full scale, and loop cleanly"
          % (len(names) - failed, len(names)))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
