"""Tiny procedural sound effects (16-bit mono WAV, 22050 Hz).

Run:  python3 tools/gen_sounds.py
Writes assets/sfx/*.wav. No numpy needed.
"""
import math
import os
import random
import struct
import wave

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "sfx")
os.makedirs(OUT, exist_ok=True)
SR = 22050
random.seed(3)


def write(name, samples):
    path = os.path.join(OUT, name)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        frames = b"".join(struct.pack("<h", int(max(-1.0, min(1.0, s)) * 32000)) for s in samples)
        w.writeframes(frames)
    print("wrote", name)


def env(t, dur, attack=0.005, release=0.05):
    if t < attack:
        return t / attack
    if t > dur - release:
        return max(0.0, (dur - t) / release)
    return 1.0


def laser(dur=0.18):
    out = []
    n = int(SR * dur)
    for i in range(n):
        t = i / SR
        f = 1400 - 1100 * (t / dur)
        s = math.sin(2 * math.pi * f * t) * 0.6 + (1 if math.sin(2 * math.pi * f * 2 * t) > 0 else -1) * 0.15
        out.append(s * env(t, dur) * (1 - t / dur))
    return out


def hit(dur=0.22):
    out = []
    n = int(SR * dur)
    for i in range(n):
        t = i / SR
        s = random.uniform(-1, 1) * 0.5 + math.sin(2 * math.pi * 120 * t) * 0.5
        out.append(s * env(t, dur) * (1 - t / dur) ** 2)
    return out


def explode(dur=0.6):
    out = []
    n = int(SR * dur)
    lp = 0.0
    for i in range(n):
        t = i / SR
        noise = random.uniform(-1, 1)
        lp += (noise - lp) * 0.08
        s = lp * 2.5 + math.sin(2 * math.pi * 55 * t) * 0.4
        out.append(s * env(t, dur, release=0.3) * (1 - t / dur))
    return out


def pickup(dur=0.25):
    out = []
    n = int(SR * dur)
    for i in range(n):
        t = i / SR
        f = 660 if t < dur / 2 else 990
        s = (1 if math.sin(2 * math.pi * f * t) > 0 else -1) * 0.25
        out.append(s * env(t, dur))
    return out


def door(dur=0.5):
    out = []
    n = int(SR * dur)
    lp = 0.0
    for i in range(n):
        t = i / SR
        noise = random.uniform(-1, 1)
        lp += (noise - lp) * 0.02
        s = lp * 3.0 + math.sin(2 * math.pi * 90 * t) * 0.15
        out.append(s * env(t, dur, attack=0.05, release=0.15))
    return out


def hurt(dur=0.3):
    out = []
    n = int(SR * dur)
    for i in range(n):
        t = i / SR
        f = 220 - 120 * (t / dur)
        s = (1 if math.sin(2 * math.pi * f * t) > 0 else -1) * 0.3 + random.uniform(-1, 1) * 0.15
        out.append(s * env(t, dur))
    return out


def locked(dur=0.3):
    out = []
    n = int(SR * dur)
    for i in range(n):
        t = i / SR
        on = (int(t * 12) % 2) == 0
        s = (1 if math.sin(2 * math.pi * 200 * t) > 0 else -1) * 0.25 if on else 0.0
        out.append(s * env(t, dur))
    return out


def drone_shot(dur=0.2):
    out = []
    n = int(SR * dur)
    for i in range(n):
        t = i / SR
        f = 300 + 500 * (t / dur)
        s = math.sin(2 * math.pi * f * t) * 0.5 + random.uniform(-1, 1) * 0.1
        out.append(s * env(t, dur) * (1 - t / dur))
    return out


def level_done(dur=0.9):
    out = []
    n = int(SR * dur)
    notes = [523, 659, 784, 1046]
    for i in range(n):
        t = i / SR
        f = notes[min(3, int(t / dur * 4))]
        s = (1 if math.sin(2 * math.pi * f * t) > 0 else -1) * 0.2 + math.sin(2 * math.pi * f * t) * 0.2
        out.append(s * env(t, dur, release=0.2))
    return out


def growl(dur=0.7):
    out = []
    n = int(SR * dur)
    lp = 0.0
    for i in range(n):
        t = i / SR
        f = 70 + 25 * math.sin(2 * math.pi * 6 * t) - 20 * (t / dur)
        noise = random.uniform(-1, 1)
        lp += (noise - lp) * 0.15
        s = (1 if math.sin(2 * math.pi * f * t) > 0 else -1) * 0.25 + math.sin(2 * math.pi * f * 1.5 * t) * 0.2 + lp * 0.35
        out.append(s * env(t, dur, attack=0.05, release=0.25))
    return out


def ambient(dur=6.0):
    """Low station hum with a slow, uneasy pulse. Looped in-game."""
    out = []
    n = int(SR * dur)
    lp = 0.0
    for i in range(n):
        t = i / SR
        pulse = 0.6 + 0.4 * math.sin(2 * math.pi * t / dur)
        noise = random.uniform(-1, 1)
        lp += (noise - lp) * 0.01
        s = math.sin(2 * math.pi * 48 * t) * 0.18 + math.sin(2 * math.pi * 48.7 * t) * 0.12 + lp * 1.2 * pulse
        s += math.sin(2 * math.pi * 96 * t) * 0.05 * pulse
        out.append(s)
    return out


if __name__ == "__main__":
    write("laser.wav", laser())
    write("hit.wav", hit())
    write("explode.wav", explode())
    write("pickup.wav", pickup())
    write("door.wav", door())
    write("hurt.wav", hurt())
    write("locked.wav", locked())
    write("drone_shot.wav", drone_shot())
    write("level_done.wav", level_done())
    write("growl.wav", growl())
    write("ambient.wav", ambient())
