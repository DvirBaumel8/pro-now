#!/usr/bin/env python3
"""
THE GROUND, AS A MATERIAL, GENERATED RATHER THAN WAITED FOR.

---------------------------------------------------------------------
WHY THIS FILE EXISTS AT ALL
---------------------------------------------------------------------
ChatGPT's answer to the tiling seams was the right one and it was a
request for art: four seamless 1024 tiles of stone with nothing
recognisable in them, so the props can be scattered in code and the same
palm stops appearing every 108 metres.

Art arrives through Amit — I cannot pull files out of that chat — and he
then said the thing that decided this file:

    "תוריד אתה הכל ותעשה הכל, לא צריך אותי."

A procedural paving is not as good as a painted one and it does not need
to be. What it has to be is SEAMLESS, UNIFORMLY LIT and EMPTY, and those
three are arithmetic rather than taste — which is exactly the part a
generator can guarantee and a painting keeps getting wrong. The first
delivered tile had a warm vignette baked into it, and a baked highlight
in a tile that repeats every fourteen metres is a lighting grid across
the whole city.

So this unblocks the city now, and a painted set drops into the same four
ids later without a line changing.

---------------------------------------------------------------------
HOW THE SEAM IS GUARANTEED RATHER THAN CHECKED
---------------------------------------------------------------------
Everything is generated on a TORUS. The noise is built from sines whose
periods divide the tile exactly, so it wraps; the flagstones are laid on
a grid that wraps, and a stone crossing an edge is drawn again on the
opposite edge; the wear and the cracks are placed modulo the tile.

There is no blending, no mirroring and no offset trick, because all three
are ways of hiding a seam rather than not having one. `verify` at the
bottom measures the discontinuity across the wrap and fails if it is
larger than the discontinuity inside the tile — which is the only
definition of seamless that means anything.
"""
import math
import random
import numpy as np
from PIL import Image, ImageFilter

S = 1024

# The plate's own pavement, sampled: warm lit stone under sodium light.
# Cream rather than the brown that came back from the first painted
# attempt — our shopfronts stand ON this, and against a dark floor they
# read as bright stickers, which is the one thing Amit will not have.
# Lit stone, but STONE AT NIGHT: the lamps in the code above it are what
# make it bright, not the file. Generated at 196 first and the city came
# out looking like noon — a material that carries its own daylight cannot
# be put under a night sky, and Amit's whole note was about the mood.
BASE = np.array([150.0, 134.0, 114.0])
# HOW MUCH ONE FLAG MAY DIFFER FROM ITS NEIGHBOUR.
#
# 26 first, drawn from an independent normal per stone, and the result
# was a mosaic: every flag a different tone from the one beside it, which
# at a distance reads as a QR code rather than as paving. Real paving is
# laid from a few batches of stone, so tone varies across a WHOLE AREA
# and only slightly between adjacent flags. The field below does that —
# a smooth wrapped noise sampled once per stone, plus a small independent
# jitter — and the spread comes down to something a quarry would produce.
STONE_SPREAD = 9.0
STONE_JITTER = 3.0
GROUT = np.array([104.0, 92.0, 79.0])


def wrapped_noise(size, octaves, seed):
    """Value noise on a torus: sums of sines with integer frequencies."""
    rng = random.Random(seed)
    y, x = np.mgrid[0:size, 0:size].astype(np.float64)
    u = x / size * 2 * math.pi
    v = y / size * 2 * math.pi
    out = np.zeros((size, size))
    amp = 1.0
    total = 0.0
    for o in range(octaves):
        f = 2 ** o
        # Four phases per octave so it does not read as a plaid.
        for _ in range(4):
            a = rng.uniform(0, 2 * math.pi)
            b = rng.uniform(0, 2 * math.pi)
            fx = rng.randint(1, 2) * f
            fy = rng.randint(1, 2) * f
            out += amp * np.sin(u * fx + a) * np.sin(v * fy + b)
        total += amp * 4
        amp *= 0.55
    return out / total


def flagstones(size, seed, cols):
    """
    An irregular running-bond paving, laid on a torus.

    `cols` stones across; each row offset by a fraction of a stone so the
    joints do not line up, and the offsets chosen to wrap exactly.
    """
    rng = random.Random(seed)
    idx = np.zeros((size, size), dtype=np.int32)
    rows = cols
    cell = size / cols
    stone = 0
    for r in range(rows):
        # Offsets are k/cols of a cell, which wraps by construction.
        shift = (rng.randint(0, cols - 1) / cols) * cell
        y0 = int(round(r * cell))
        y1 = int(round((r + 1) * cell))
        for c in range(cols):
            x0 = r_shift(c * cell + shift, size)
            x1 = r_shift((c + 1) * cell + shift, size)
            stone += 1
            if x1 > x0:
                idx[y0:y1, x0:x1] = stone
            else:
                # The stone straddles the wrap: draw both halves.
                idx[y0:y1, x0:size] = stone
                idx[y0:y1, 0:x1] = stone
    return idx


def r_shift(x, size):
    return int(round(x)) % size


def wrap_blur(arr, radius):
    """
    Gaussian blur that knows the image is a torus.

    PIL clamps at the edge, so a joint blurred normally is half as wide
    at the tile boundary as it is anywhere else — a faint bright line
    down every fourteen metres of city. Tiling three by three, blurring
    the middle and cropping costs nine times the pixels for a few
    milliseconds and removes the whole class of edge artefact.
    """
    h, w = arr.shape
    big = np.tile(arr, (3, 3))
    im = Image.fromarray(big.astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius))
    return np.asarray(im).astype(np.float64)[h : 2 * h, w : 2 * w]


def build(seed, cols, warmth, wear):
    rng = np.random.default_rng(seed)

    idx = flagstones(S, seed, cols)
    n_stones = int(idx.max()) + 1

    # Each flag's tone is read from a smooth field at the flag's own
    # position, so neighbours come from the same batch of stone, plus a
    # small jitter so no two are identical.
    field = wrapped_noise(S, 2, seed + 61)
    ys, xs = np.mgrid[0:S, 0:S]
    sum_f = np.bincount(idx.ravel(), weights=field.ravel(), minlength=n_stones)
    count = np.bincount(idx.ravel(), minlength=n_stones).astype(np.float64)
    count[count == 0] = 1.0
    batch = sum_f / count
    void_ = (ys, xs)
    del void_
    tone = batch * STONE_SPREAD + rng.normal(0.0, 1.0, n_stones) * STONE_JITTER
    per_pixel = tone[idx][..., None]

    grain = wrapped_noise(S, 5, seed + 11)[..., None] * 9.0
    blotch = wrapped_noise(S, 2, seed + 29)[..., None] * 7.0

    img = BASE + per_pixel + grain + blotch
    img = img + np.array([warmth, warmth * 0.45, -warmth * 0.35])

    # JOINTS. The grout is where the flag index changes — found by
    # comparing against shifted copies, WITH WRAP, so the joints continue
    # across the tile edge instead of stopping at it.
    edge = np.zeros((S, S), dtype=bool)
    for dy, dx in ((0, 1), (1, 0)):
        edge |= idx != np.roll(idx, dy, axis=0) if dy else idx != np.roll(idx, dx, axis=1)
    e = wrap_blur((edge * 255), 1.1)[..., None] / 255.0
    img = img * (1 - e * 0.55) + GROUT * (e * 0.55)

    # WEAR. Damp patches and dust, large and soft, never a hotspot: a
    # baked highlight repeats with the tile and becomes a grid.
    patch = wrapped_noise(S, 3, seed + 47)
    patch = np.clip(patch * 2.2, -1, 1)[..., None]
    img = img + patch * wear * np.array([-10.0, -8.0, -5.0])

    # A few hairline cracks, each wrapped.
    crack = Image.new("L", (S, S), 0)
    px = crack.load()
    r = random.Random(seed + 101)
    for _ in range(7):
        x, y = r.randrange(S), r.randrange(S)
        ang = r.uniform(0, 2 * math.pi)
        for _ in range(r.randrange(160, 420)):
            ang += r.uniform(-0.28, 0.28)
            x = (x + math.cos(ang)) % S
            y = (y + math.sin(ang)) % S
            px[int(x), int(y)] = 190
    c = wrap_blur(np.asarray(crack), 0.6)[..., None] / 255.0
    img = img * (1 - c * 0.45) + GROUT * (c * 0.45)

    """
    THE TILE BOUNDARY MUST NOT FALL ON A JOINT.

    Everything above is built on a torus, so it wraps — but the paving
    grid starts at zero, which puts a grout line exactly on the edge of
    every tile. That is seamless in the strict sense and wrong in the
    only sense that matters: laid out, the city gets a joint every
    fourteen metres in perfect alignment, which reads as a grid drawn
    over the ground.

    Rolling by half a cell moves the boundary into the middle of a stone.
    A roll on a torus changes nothing about the wrap, and the seam
    measure below drops from 2.9 to about 1.
    """
    half = int(S / cols / 2)
    img = np.roll(np.roll(img, half, axis=0), half, axis=1)

    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), "RGB")


def seam_error(im):
    """
    How much the tile disagrees with itself across the wrap, against how
    much it disagrees with itself one pixel in.

    A ratio near 1 means the join is as quiet as the material's own
    texture — which is what seamless means. Anything above ~1.6 is a line
    the eye will find.
    """
    a = np.asarray(im).astype(np.float64)
    across_h = np.abs(a[:, 0, :] - a[:, -1, :]).mean()
    inside_h = np.abs(a[:, 1, :] - a[:, 0, :]).mean()
    across_v = np.abs(a[0, :, :] - a[-1, :, :]).mean()
    inside_v = np.abs(a[1, :, :] - a[0, :, :]).mean()
    return (across_h / max(inside_h, 1e-6), across_v / max(inside_v, 1e-6))


if __name__ == "__main__":
    import sys

    out_dirs = sys.argv[1:] or ["tools/design-preview/public/world"]
    # Four variants: different stone sizes, warmth and wear, close enough
    # in tone to sit side by side without a jump in colour.
    # THE FOUR VARIANTS SIT SIDE BY SIDE, SO THEY MAY NOT DISAGREE ABOUT
    # SCALE. The first set went 7, 9, 11, 13 stones across and mixing them
    # put a visible change of stone size at every tile boundary — which is
    # a seam of a different kind and just as findable. Nine to twelve is
    # enough variety to break the repeat and close enough that the joins
    # read as the paving changing rather than the ground.
    recipes = [
        (7, 10, 0.9, 1.0),
        (13, 11, 2.4, 0.7),
        (23, 9, -1.2, 1.25),
        (31, 12, 1.6, 0.85),
    ]
    for i, (seed, cols, warmth, wear) in enumerate(recipes, start=1):
        im = build(seed, cols, warmth, wear)
        h, v = seam_error(im)
        status = "ok" if max(h, v) < 1.6 else "SEAM"
        print(f"world_ground_mat_{i}: {cols}x{cols} stones · seam {h:.2f}/{v:.2f} {status}")
        if max(h, v) >= 1.6:
            raise SystemExit(f"tile {i} has a visible seam")
        for d in out_dirs:
            im.save(f"{d}/world_ground_mat_{i}.webp", "WEBP", quality=90, method=5)
    print(f"wrote 4 tiles to: {', '.join(out_dirs)}")
