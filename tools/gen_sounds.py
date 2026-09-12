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


def shotgun(dur=0.55):
    """The weapon: a pump shotgun. Dull and long, not a crack.

    blast  noise through a low-pass that never opens above 700 Hz - the muffled
           thump of a shell, with no bright transient to make it a zap
    body   180 Hz falling to 60, the punch you feel in the room
    sub    90 Hz falling to 35 over a long decay, the weight
    tail   noise through a slowly closing filter, 400 ms of room

    Longer than the fire cooldown (0.32 s) on purpose: at sustained fire the tails
    overlap in the six-voice pool, which is what a shotgun in a corridor sounds like.

    Uses its own RNG: the module seeds `random` once, so consuming from that stream
    here would shift every sound generated after this one.
    """
    rng = random.Random(11)
    n = int(SR * dur)
    out = []
    ph_body = ph_sub = 0.0
    lp_blast = lp_tail = 0.0
    for i in range(n):
        t = i / SR

        # The blast's filter opens briefly and shuts: that shape is what makes it
        # read as muffled rather than as a snare.
        cut_b = 700.0 * math.exp(-t * 30.0) + 70.0
        k_b = 1.0 - math.exp(-2.0 * math.pi * cut_b / SR)
        lp_blast += (rng.uniform(-1.0, 1.0) - lp_blast) * k_b
        blast = lp_blast * 4.2 * math.exp(-t * 14.0)

        f_body = 180.0 * math.pow(60.0 / 180.0, min(1.0, t / 0.16))
        ph_body += 2.0 * math.pi * f_body / SR
        body = math.sin(ph_body) * 0.7 * math.exp(-t * 7.0)

        f_sub = 90.0 * math.pow(35.0 / 90.0, min(1.0, t / 0.30))
        ph_sub += 2.0 * math.pi * f_sub / SR
        sub = math.sin(ph_sub) * 0.9 * math.exp(-t * 3.6)

        cut_t = 450.0 * math.exp(-t * 4.5) + 55.0
        k_t = 1.0 - math.exp(-2.0 * math.pi * cut_t / SR)
        lp_tail += (rng.uniform(-1.0, 1.0) - lp_tail) * k_t
        tail = lp_tail * 2.1 * math.exp(-t * 3.8)

        s = math.tanh((blast + body + sub + tail) * 1.35) * 0.82
        out.append(s * env(t, dur, attack=0.001, release=0.12))
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
    """Low station hum with a slow, uneasy pulse. Looped in-game.

    Seamless by construction, which it was not: 48.7 Hz completes 292.2 cycles in
    six seconds, and the filtered noise starts at zero and ends wherever it ends, so
    the loop point was a step discontinuity - an audible click every six seconds for
    the whole run. Each tone is now snapped to a whole number of cycles in `dur`, and
    the noise, which cannot be, is cross-faded from an overrun tail into the head.

    Uses its own RNG so the module-seeded stream stays untouched (see shotgun()).
    """
    rng = random.Random(17)
    n = int(SR * dur)
    fade = int(SR * 0.25)

    def cycles(f):
        """Nearest frequency completing a whole number of cycles in dur."""
        return round(f * dur) / dur

    f_low, f_beat, f_harm = cycles(48.0), cycles(48.7), cycles(96.0)
    buf = []
    lp = 0.0
    for i in range(n + fade):
        t = i / SR
        pulse = 0.6 + 0.4 * math.sin(2 * math.pi * t / dur)
        lp += (rng.uniform(-1, 1) - lp) * 0.01
        s = math.sin(2 * math.pi * f_low * t) * 0.18 + math.sin(2 * math.pi * f_beat * t) * 0.12
        s += lp * 1.2 * pulse
        s += math.sin(2 * math.pi * f_harm * t) * 0.05 * pulse
        buf.append(s)

    out = buf[:n]
    # The tail continues past the loop point; fading it in over the head makes the
    # last sample lead into the first one.
    for i in range(fade):
        w = i / fade
        out[i] = out[i] * w + buf[n + i] * (1.0 - w)
    return out


if __name__ == "__main__":
    write("shotgun.wav", shotgun())
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
