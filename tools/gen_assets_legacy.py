"""Procedural pixel-art asset generator for H11.

Run:  python3 tools/gen_assets.py
Writes 64x64 wall textures and RGBA sprites into assets/.
Everything is drawn with plain PIL primitives so it is easy to tweak
or replace with hand-made art later. Mood: dark, rusted, Doom-like.
"""
import math
import os
import random
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "..", "assets")
os.makedirs(OUT, exist_ok=True)
random.seed(11)

# Palette (dark station)
STEEL = (58, 60, 66)
STEEL_D = (36, 38, 44)
STEEL_L = (84, 88, 96)
SEAM = (18, 19, 23)
RIVET = (110, 114, 122)
RUST = (96, 52, 30)
RUST_D = (62, 32, 20)
BLOOD = (110, 14, 14)
BLOOD_D = (66, 8, 8)
RED = (200, 40, 30)
RED_GLOW = (255, 90, 60)
AMBER = (200, 130, 40)
GREEN = (60, 170, 80)
BLACK = (8, 8, 10)
WHITE = (200, 200, 205)
FLESH = (104, 50, 58)
FLESH_D = (70, 30, 40)
FLESH_L = (140, 76, 84)
BONE = (190, 180, 160)

FONT = ImageFont.load_default()


def noise(img, amount=6, alpha_aware=False):
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            p = px[x, y]
            if alpha_aware and p[3] == 0:
                continue
            n = random.randint(-amount, amount)
            px[x, y] = tuple(max(0, min(255, c + n)) for c in p[:3]) + tuple(p[3:])
    return img


def grime(d, w=64, h=64, n=14):
    """Dark smudges and rust flecks."""
    for _ in range(n):
        x, y = random.randint(0, w - 1), random.randint(0, h - 1)
        r = random.randint(1, 4)
        col = random.choice([RUST_D, RUST, SEAM, STEEL_D])
        d.ellipse([x - r, y - r, x + r, y + r], fill=col)


def drips(d, x, y, count=3, color=BLOOD, maxlen=18):
    for i in range(count):
        dx = x + random.randint(-6, 6)
        ln = random.randint(4, maxlen)
        d.line([(dx, y), (dx, y + ln)], fill=color)
        d.point((dx, y + ln + 1), fill=BLOOD_D)


def base_panel(w=64, h=64):
    img = Image.new("RGB", (w, h), STEEL)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w - 1, h - 1], outline=SEAM)
    d.line([(0, 31), (w - 1, 31)], fill=SEAM)
    d.line([(0, 32), (w - 1, 32)], fill=STEEL_L)
    d.line([(0, 1), (w - 1, 1)], fill=STEEL_L)
    d.line([(1, 0), (1, h - 1)], fill=STEEL_L)
    d.line([(w - 2, 0), (w - 2, h - 1)], fill=STEEL_D)
    d.line([(0, h - 2), (w - 1, h - 2)], fill=STEEL_D)
    for x in (5, w - 6):
        for y in (5, 26, 37, h - 6):
            d.point((x, y), fill=RIVET)
            d.point((x + 1, y + 1), fill=SEAM)
    grime(d)
    return img


def wall_panel():
    img = base_panel()
    return noise(img)


def wall_blood():
    img = base_panel()
    d = ImageDraw.Draw(img)
    # splatter
    cx, cy = random.randint(20, 44), random.randint(14, 30)
    for _ in range(40):
        a = random.uniform(0, 2 * math.pi)
        r = random.gauss(0, 7)
        x, y = int(cx + math.cos(a) * r), int(cy + math.sin(a) * r * 0.7)
        s = random.randint(0, 2)
        d.ellipse([x - s, y - s, x + s, y + s], fill=random.choice([BLOOD, BLOOD_D]))
    drips(d, cx, cy + 4, 4, maxlen=26)
    return noise(img)


def wall_vent():
    img = base_panel()
    d = ImageDraw.Draw(img)
    d.rectangle([14, 38, 49, 58], fill=STEEL_D, outline=SEAM)
    for y in range(41, 57, 3):
        d.line([(17, y), (46, y)], fill=BLACK)
        d.line([(17, y + 1), (46, y + 1)], fill=STEEL_L)
    # something dark leaking out of the vent
    drips(d, 30, 58, 2, color=BLOOD_D, maxlen=5)
    return noise(img)


def wall_light():
    """Red emergency light strip (flickers in-game)."""
    img = base_panel()
    d = ImageDraw.Draw(img)
    d.rectangle([8, 12, 55, 19], fill=BLOOD_D, outline=SEAM)
    d.rectangle([10, 14, 53, 17], fill=RED)
    d.line([(12, 15), (51, 15)], fill=RED_GLOW)
    # glow bleed under the strip
    for i in range(6):
        d.line([(10 + i, 20 + i), (53 - i, 20 + i)], fill=(STEEL[0] + 30 - i * 5, STEEL[1] + 4, STEEL[2] + 4))
    return noise(img, 4)


def wall_screen():
    img = base_panel()
    d = ImageDraw.Draw(img)
    d.rectangle([6, 6, 57, 29], fill=BLACK, outline=STEEL_L)
    d.text((9, 7), "H11 CYC 7", fill=RED, font=FONT)
    d.text((9, 17), "MUTATE ON", fill=GREEN, font=FONT)
    for y in range(8, 28, 2):
        d.line([(7, y), (56, y)], fill=(0, 0, 0))  # scanlines (drawn over text, faint)
    d.rectangle([24, 40, 39, 52], fill=STEEL_D, outline=SEAM)
    d.point((31, 46), fill=RED)
    return noise(img, 3)


def stencil_h11(d, x0, y0, scale=3, color=None):
    """Block-letter H11 stencil, faded red paint."""
    color = color or (140, 30, 26)
    glyphs = {
        "H": ["101", "101", "111", "101", "101"],
        "1": ["010", "110", "010", "010", "111"],
    }
    x = x0
    for ch in "H11":
        rows = glyphs[ch]
        for ry, row in enumerate(rows):
            for rx, c in enumerate(row):
                if c == "1" and random.random() > 0.08:  # worn paint
                    d.rectangle([x + rx * scale, y0 + ry * scale,
                                 x + rx * scale + scale - 1, y0 + ry * scale + scale - 1], fill=color)
        x += 4 * scale


def wall_h11():
    img = base_panel()
    d = ImageDraw.Draw(img)
    stencil_h11(d, 14, 38, 3)
    drips(d, 32, 53, 2, color=(120, 26, 22), maxlen=8)
    return noise(img, 5)


def wall_hazard():
    img = base_panel()
    d = ImageDraw.Draw(img)
    d.rectangle([0, 44, 63, 55], fill=(150, 130, 40))
    for x in range(-12, 76, 12):
        d.polygon([(x, 44), (x + 6, 44), (x - 6, 55), (x - 12, 55)], fill=BLACK)
    d.line([(0, 44), (63, 44)], fill=SEAM)
    d.line([(0, 55), (63, 55)], fill=SEAM)
    d.text((8, 6), "H11 ZONE", fill=(150, 130, 40), font=FONT)
    grime(d, n=8)
    return noise(img, 4)


def wall_exit():
    img = base_panel()
    d = ImageDraw.Draw(img)
    d.rectangle([12, 10, 51, 30], fill=BLACK, outline=STEEL_L)
    letters = {
        "E": ["111", "100", "111", "100", "111"],
        "X": ["101", "101", "010", "101", "101"],
        "I": ["111", "010", "010", "010", "111"],
        "T": ["111", "010", "010", "010", "010"],
    }
    x0 = 16
    for ch in "EXIT":
        rows = letters[ch]
        for ry, row in enumerate(rows):
            for rx, c in enumerate(row):
                if c == "1":
                    d.rectangle([x0 + rx * 2, 14 + ry * 2, x0 + rx * 2 + 1, 14 + ry * 2 + 1], fill=GREEN)
        x0 += 9
    d.ellipse([24, 38, 39, 53], fill=(20, 60, 30), outline=SEAM)
    d.ellipse([27, 41, 36, 50], fill=GREEN)
    return noise(img, 3)


def door(locked=False):
    img = Image.new("RGB", (64, 64), STEEL_D)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 63, 63], outline=SEAM)
    d.rectangle([2, 2, 61, 61], outline=STEEL_L)
    d.rectangle([4, 4, 30, 59], fill=STEEL, outline=SEAM)
    d.rectangle([33, 4, 59, 59], fill=STEEL, outline=SEAM)
    for y in range(8, 58, 6):
        d.line([(6, y), (28, y)], fill=STEEL_D)
        d.line([(35, y), (57, y)], fill=STEEL_D)
    stripe = RED if locked else AMBER
    d.rectangle([30, 4, 33, 59], fill=stripe)
    d.rectangle([10, 14, 24, 24], fill=BLACK, outline=SEAM)
    d.rectangle([39, 14, 53, 24], fill=BLACK, outline=SEAM)
    if locked:
        d.rectangle([12, 38, 22, 46], fill=RED, outline=SEAM)
        d.rectangle([41, 38, 51, 46], fill=RED, outline=SEAM)
        d.text((16, 49), "LOCK", fill=RED, font=FONT)
    else:
        d.rectangle([12, 38, 22, 46], fill=RUST_D, outline=SEAM)
        d.rectangle([41, 38, 51, 46], fill=RUST_D, outline=SEAM)
    grime(d, n=10)
    return noise(img, 4)


def floor_tex():
    img = Image.new("RGB", (64, 64), (44, 46, 52))
    d = ImageDraw.Draw(img)
    for y in range(0, 64, 16):
        d.line([(0, y), (63, y)], fill=(18, 19, 23))
    for x in range(0, 64, 16):
        d.line([(x, 0), (x, 63)], fill=(18, 19, 23))
    d.line([(0, 1), (63, 1)], fill=(56, 58, 66))
    grime(d, n=10)
    # faint stencil on some floor tiles
    stencil_h11(d, 20, 24, 2, color=(70, 22, 20))
    return noise(img, 5)


def ceiling_tex():
    img = Image.new("RGB", (64, 64), (30, 30, 36))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 63, 63], outline=(12, 12, 15))
    d.rectangle([20, 28, 43, 35], fill=(90, 60, 60))
    d.rectangle([22, 30, 41, 33], fill=(140, 80, 70))
    grime(d, n=6)
    return noise(img, 4)


def sprite(w=64, h=64):
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))


def mutant(frame=0, attack=False):
    """H11 mutant: a hunched fleshy thing with too many eyes."""
    img = sprite()
    d = ImageDraw.Draw(img)
    sway = 0 if frame == 0 else 2
    # legs
    d.polygon([(22, 44), (28, 44), (24 + sway, 62), (18 + sway, 62)], fill=FLESH_D)
    d.polygon([(36, 44), (42, 44), (46 - sway, 62), (40 - sway, 62)], fill=FLESH_D)
    # torso (lumpy)
    d.ellipse([16, 20, 48, 50], fill=FLESH, outline=FLESH_D)
    for _ in range(9):
        x, y = random.randint(19, 45), random.randint(23, 47)
        r = random.randint(1, 3)
        d.ellipse([x - r, y - r, x + r, y + r], fill=random.choice([FLESH_L, FLESH_D]))
    # arms
    if attack:
        d.polygon([(16, 30), (4, 20), (8, 18), (20, 26)], fill=FLESH)
        d.polygon([(48, 30), (60, 20), (56, 18), (44, 26)], fill=FLESH)
        for x in (4, 6, 8):
            d.line([(x, 20), (x - 2, 14)], fill=BONE)
        for x in (56, 58, 60):
            d.line([(x, 20), (x + 2, 14)], fill=BONE)
    else:
        d.polygon([(16, 32), (8, 46 + sway), (12, 48 + sway), (20, 36)], fill=FLESH)
        d.polygon([(48, 32), (56, 46 - sway), (52, 48 - sway), (44, 36)], fill=FLESH)
    # head, sunk into the torso
    d.ellipse([22, 10, 42, 28], fill=FLESH_L, outline=FLESH_D)
    # eyes: a cluster, red when attacking
    eye = RED_GLOW if attack else (230, 200, 60)
    for (x, y, r) in [(28, 17, 2), (35, 15, 3), (31, 22, 1), (38, 21, 2), (25, 22, 1)]:
        d.ellipse([x - r, y - r, x + r, y + r], fill=BLACK)
        d.ellipse([x - r + 1, y - r + 1, x + r - 1, y + r - 1], fill=eye)
    # mouth
    d.line([(26, 26), (38, 26)], fill=BLACK)
    for x in range(27, 38, 3):
        d.line([(x, 26), (x, 28)], fill=BONE)
    # exposed bone on the shoulder
    d.line([(44, 24), (47, 20)], fill=BONE)
    return noise(img, 8, alpha_aware=True)


def mutant_dead():
    img = sprite()
    d = ImageDraw.Draw(img)
    # pool
    d.ellipse([6, 50, 58, 62], fill=BLOOD_D)
    d.ellipse([12, 52, 52, 60], fill=BLOOD)
    # collapsed body
    d.ellipse([14, 40, 50, 58], fill=FLESH, outline=FLESH_D)
    d.ellipse([38, 44, 54, 56], fill=FLESH_L, outline=FLESH_D)
    d.line([(10, 48), (18, 42)], fill=FLESH_D, width=3)
    for (x, y) in [(44, 49), (48, 51)]:
        d.ellipse([x - 1, y - 1, x + 1, y + 1], fill=BLACK)
    d.line([(30, 42), (34, 36)], fill=BONE)
    return noise(img, 8, alpha_aware=True)


def medkit():
    img = sprite()
    d = ImageDraw.Draw(img)
    d.rectangle([18, 36, 45, 56], fill=WHITE, outline=SEAM)
    d.rectangle([18, 36, 45, 40], fill=STEEL_L)
    d.rectangle([29, 42, 34, 54], fill=GREEN)
    d.rectangle([24, 46, 39, 50], fill=GREEN)
    d.point((22, 52), fill=BLOOD)
    d.point((41, 39), fill=BLOOD)
    return img


def ammo_cell():
    img = sprite()
    d = ImageDraw.Draw(img)
    d.rectangle([24, 34, 39, 58], fill=STEEL_D, outline=SEAM)
    d.rectangle([27, 37, 36, 55], fill=(90, 60, 20))
    d.rectangle([29, 39, 34, 53], fill=AMBER)
    d.rectangle([28, 31, 35, 34], fill=STEEL_L)
    return img


def keycard():
    img = sprite()
    d = ImageDraw.Draw(img)
    d.rectangle([18, 42, 45, 58], fill=RED, outline=SEAM)
    d.rectangle([21, 45, 29, 51], fill=(220, 200, 80))
    d.line([(32, 47), (42, 47)], fill=WHITE)
    d.line([(32, 51), (42, 51)], fill=WHITE)
    return img


def weapon(frame=0):
    """96x72 first-person weapon, bottom-centre of a 320x240 screen."""
    img = Image.new("RGBA", (96, 72), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.polygon([(40, 20), (58, 20), (66, 72), (30, 72)], fill=STEEL_D, outline=SEAM)
    d.polygon([(44, 24), (54, 24), (60, 72), (36, 72)], fill=STEEL)
    d.rectangle([46, 14, 52, 22], fill=SEAM)
    d.rectangle([48, 30, 50, 60], fill=RUST_D)
    d.polygon([(30, 50), (68, 50), (80, 72), (18, 72)], fill=(110, 80, 66), outline=SEAM)
    d.rectangle([34, 40, 64, 52], fill=STEEL_L, outline=SEAM)
    d.point((40, 46), fill=RED)
    d.point((58, 46), fill=RED)
    if frame == 1:
        d.polygon([(49, 0), (58, 12), (70, 8), (60, 18), (64, 28), (49, 20),
                   (34, 28), (38, 18), (28, 8), (40, 12)], fill=(240, 180, 60))
        d.ellipse([41, 6, 57, 22], fill=(255, 240, 200))
    return img


def crosshair():
    img = Image.new("RGBA", (9, 9), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.line([(4, 0), (4, 2)], fill=WHITE)
    d.line([(4, 6), (4, 8)], fill=WHITE)
    d.line([(0, 4), (2, 4)], fill=WHITE)
    d.line([(6, 4), (8, 4)], fill=WHITE)
    return img


def save(img, name):
    img.save(os.path.join(OUT, name))
    print("wrote", name)


if __name__ == "__main__":
    save(wall_panel(), "wall_panel.png")
    save(wall_blood(), "wall_blood.png")
    save(wall_vent(), "wall_vent.png")
    save(wall_light(), "wall_light.png")
    save(wall_screen(), "wall_screen.png")
    save(wall_h11(), "wall_h11.png")
    save(wall_hazard(), "wall_hazard.png")
    save(wall_exit(), "wall_exit.png")
    save(door(False), "door.png")
    save(door(True), "door_locked.png")
    save(floor_tex(), "floor.png")
    save(ceiling_tex(), "ceiling.png")
    save(mutant(0), "mutant_0.png")
    save(mutant(1), "mutant_1.png")
    save(mutant(0, attack=True), "mutant_attack.png")
    save(mutant_dead(), "mutant_dead.png")
    save(medkit(), "medkit.png")
    save(ammo_cell(), "ammo.png")
    save(keycard(), "keycard.png")
    save(weapon(0), "weapon_0.png")
    save(weapon(1), "weapon_1.png")
    save(crosshair(), "crosshair.png")
