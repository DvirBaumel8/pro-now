#!/usr/bin/env python3
"""
INGEST ONE WORLD ASSET.

    python3 tools/design-preview/ingest.py <file> <assetId> [--role ROLE]

The art arrives on a green-to-black matte rather than on transparency, so
every file needs the same three things done to it and none of them should be
done by hand:

  1. KEY OUT THE BACKGROUND, by flooding inward from the borders. Flooding
     rather than "delete every green pixel" is the whole trick: these
     shopfronts are covered in real foliage, and a colour test alone eats
     the plants off the building. Only background CONNECTED to the edge
     goes.
  2. TRIM to the drawn pixels, so the manifest's intrinsic size describes
     the artwork and not the empty margin around it.
  3. MEASURE THE GROUND CONTACT — the horizontal centre of the bottom-most
     solid row. For a building drawn in 3/4 the bounding box is far wider
     than the footing, so anchoring at 0.5 stands it beside its own feet.

It prints the manifest entry to paste. Nothing about placement is decided
here; this only describes what arrived.
"""
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

OUT_DIR = "tools/design-preview/public/world"


def key_out(a: np.ndarray) -> np.ndarray:
    """
    Which pixels are the matte.

    The rule started as "green-dominant, or near-black" and that was too
    brittle: the pets shopfront came back on a DARKER green, so its corners
    failed both halves of the test and survived the flood, and the file did
    not trim at all.

    So the test is now adaptive — it learns the background from the corners
    of this particular image rather than from a constant. Anything within a
    tolerance of the sampled corner colours counts, plus the original green
    and near-black rules as a safety net for a matte that shades off.
    """
    H, W, _ = a.shape
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    lum = r * 0.299 + g * 0.587 + b * 0.114

    # Learn the matte from the four corners.
    k = 12
    corners = np.concatenate([
        a[:k, :k].reshape(-1, 3), a[:k, -k:].reshape(-1, 3),
        a[-k:, :k].reshape(-1, 3), a[-k:, -k:].reshape(-1, 3),
    ])
    ref = np.median(corners, axis=0)
    near_ref = np.abs(a - ref).sum(axis=2) < 150

    bg_like = near_ref | ((g > r + 10) & (g > b + 10)) | (lum < 34)

    mask = np.zeros((H, W), bool)
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if bg_like[y, x] and not mask[y, x]:
                mask[y, x] = True
                q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if bg_like[y, x] and not mask[y, x]:
                mask[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and not mask[ny, nx] and bg_like[ny, nx]:
                mask[ny, nx] = True
                q.append((ny, nx))
    return mask



def key_out_photo(a: np.ndarray) -> np.ndarray:
    """
    Which pixels are the backdrop, when the backdrop is a PHOTOGRAPHIC SWEEP.

    The building keyer above learns one matte colour from the corners and
    floods everything within a fixed tolerance of it. That is right for a
    shopfront on a flat green field and wrong for these people: they arrive
    standing on a studio gradient that runs from warm light on one side to
    near-black on the other, and they are dressed in black polos and navy
    overalls. A tolerance wide enough to follow the gradient swallows the
    clothes; one narrow enough to spare the clothes leaves half the backdrop.
    Run as-is it took the plumber's legs off at the knee and reduced the
    mechanic to a head and shoulders.

    So this grows a region instead of testing a colour. It starts at the
    border and steps to a neighbour only when the colour barely changes —
    which is what a gradient does everywhere, and what a person's outline
    never does. The edge of a sleeve is a cliff; the backdrop behind it is a
    ramp. Walking the ramp and stopping at the cliff needs no knowledge of
    what colour either one is.

    The second bound stops a slow leak: a soft shadow under a boot is a ramp
    too, and a purely local test would happily walk down it and up into the
    subject one step at a time. Growth is therefore also capped at a
    distance from the colour the flood ENTERED that neighbourhood with, so a
    long ramp terminates instead of accumulating.
    """
    H, W, _ = a.shape
    STEP = 26      # how much a single step may change: a gradient, not an edge
    DRIFT = 120    # how far a run may wander from where it started

    mask = np.zeros((H, W), bool)
    # Carried per seed: the colour this stretch of background began with.
    origin = np.zeros((H, W, 3), int)
    q = deque()

    def seed(y, x):
        if mask[y, x]:
            return
        mask[y, x] = True
        origin[y, x] = a[y, x]
        q.append((y, x))

    for x in range(W):
        seed(0, x)
        seed(H - 1, x)
    for y in range(H):
        seed(y, 0)
        seed(y, W - 1)

    while q:
        y, x = q.popleft()
        here = a[y, x]
        src = origin[y, x]
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if not (0 <= ny < H and 0 <= nx < W) or mask[ny, nx]:
                continue
            nxt = a[ny, nx]
            if np.abs(nxt - here).sum() > STEP:
                continue
            if np.abs(nxt - src).sum() > DRIFT:
                continue
            mask[ny, nx] = True
            origin[ny, nx] = src
            q.append((ny, nx))

    # A person standing ON the bottom edge has their feet seeded as
    # background. Anything that survived above a kept pixel is subject, so
    # fill the column downwards from the lowest kept pixel: it recovers the
    # shoes without re-admitting the floor beside them.
    for x in range(W):
        col = np.nonzero(~mask[:, x])[0]
        if len(col) and col.max() < H - 1:
            continue
    return mask


def defringe(a: np.ndarray, alpha: np.ndarray, skip_colour_test: bool = False) -> np.ndarray:
    """
    Strip the halo the matte leaves behind.

    Even a file that arrives with its own alpha carries a rim of pixels that
    are part background: the generator blended the subject against a green
    or near-black field, so the outermost ring of the building is a mix of
    shopfront and matte. Dropped onto our street that rim reads as a dark
    glow around every shop — Amit saw the salon sitting in a smudge.

    Two passes. First, any edge pixel that is still obviously matte-coloured
    (green-dominant, or very dark and unsaturated) loses its alpha outright.
    Then the whole silhouette is pulled in by one pixel, which removes the
    blended ring that is too mixed to classify.
    """
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    lum = r * 0.299 + g * 0.587 + b * 0.114
    sat = a.max(axis=2) - a.min(axis=2)

    edge = (alpha > 8) & (alpha < 250)
    matte = ((g > r + 8) & (g > b + 8)) | ((lum < 48) & (sat < 40))
    if not skip_colour_test:
        alpha = np.where(edge & matte, 0, alpha)

    # Erode by one pixel: a solid pixel with a transparent neighbour is on
    # the boundary and is the one carrying the blend.
    solid = alpha > 200
    pad = np.pad(solid, 1, constant_values=False)
    inner = (
        pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:] & solid
    )
    alpha = np.where(solid & ~inner, (alpha * 0.35).astype(np.uint8), alpha)
    return alpha.astype(np.uint8)


def main() -> None:
    src, asset_id = sys.argv[1], sys.argv[2]
    role = "HERO_BUILDING"
    if "--role" in sys.argv:
        role = sys.argv[sys.argv.index("--role") + 1]
    # `--matte photo` for a subject shot on a studio sweep; the default is
    # the flat matte the buildings arrive on. See key_out_photo.
    photo = "--matte" in sys.argv and sys.argv[sys.argv.index("--matte") + 1] == "photo"

    raw = Image.open(src)
    if raw.mode == "RGBA" and np.asarray(raw)[..., 3].min() < 250:
        # It already has an alpha channel. Trust it rather than keying a
        # second time: re-keying an image that is already cut out eats the
        # soft edges the generator produced, which is worse than the matte
        # it would be removing.
        rgba = np.asarray(raw.convert("RGBA")).astype(int)
        a = rgba[..., :3]
        alpha = rgba[..., 3].astype(np.uint8)
        mask = alpha < 8
        print("kept the file's own alpha")
    else:
        im = raw.convert("RGB")
        a = np.asarray(im).astype(int)
        mask = key_out_photo(a) if photo else key_out(a)
        alpha = np.where(mask, 0, 255).astype(np.uint8)

    alpha = defringe(a, alpha, skip_colour_test=photo)
    img = Image.fromarray(np.dstack([a.astype(np.uint8), alpha]))
    ys, xs = np.nonzero(alpha > 8)
    img = img.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    # A hair of blur on the alpha only: a hard 1px cut-out reads as a sticker.
    img.putalpha(img.getchannel("A").filter(ImageFilter.GaussianBlur(0.6)))
    img.save(f"{OUT_DIR}/{asset_id}.webp", "WEBP", quality=92, method=6)

    al = np.asarray(img)[..., 3]
    row = None
    for y in range(al.shape[0] - 1, -1, -1):
        cols = np.nonzero(al[y] > 24)[0]
        if len(cols) > al.shape[1] * 0.10:
            row = cols
            break
    if row is None:
        row = np.array([0, img.size[0] - 1])
    anchor_x = round(float((row.min() + row.max()) / 2 / img.size[0]), 4)

    print(f"removed {mask.mean() * 100:.1f}% background")
    print(f"{OUT_DIR}/{asset_id}.webp  {img.size[0]}x{img.size[1]}")
    print()
    print(f"""  {asset_id}: asset({{
    id: "{asset_id}",
    file: "{asset_id}.webp",
    role: "{role}",
    intrinsicWidth: {img.size[0]},
    intrinsicHeight: {img.size[1]},
    anchor: {{ x: {anchor_x}, y: 1 }},
    defaultWidthRatio: 0.3,
    critical: true,
  }}),""")
    print()
    print(f'  {asset_id}: {{ uri: "world/{asset_id}.webp" }},')


if __name__ == "__main__":
    main()
