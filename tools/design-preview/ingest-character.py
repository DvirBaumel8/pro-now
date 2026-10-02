"""
ONE PROFESSIONAL'S FIGURE, FROM THE CHAT TO THE APP.

Two of the trades (build, help) wore photographs while everybody else was
drawn — Amit: "יש כמה בעלי מקצוע ששמת להם תמונה אמיתית". The chat redraws
them full length on flat #00FF00; this keys the green out and writes the
two files the app reads:

  character_<id>_world.webp   full length, ~730px tall (street, welcome, shop)
  character_<id>_icon.webp    waist up, ~406px tall (cards, tracking)

The files they replace are kept under public/world/_retired/.

  python3 ingest-character.py <png> <id>
"""
import os, shutil, sys
from PIL import Image

src, cid = sys.argv[1], sys.argv[2]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public", "world")

im = Image.open(src).convert("RGBA")
px = im.load()
W, H = im.size
for y in range(H):
    for x in range(W):
        r, g, b, a = px[x, y]
        spill = g - max(r, b)
        if g > 190 and r < 110 and b < 110 and spill > 100:
            px[x, y] = (0, 0, 0, 0)
        elif spill > 20 and g > 150:
            px[x, y] = (r, max(r, b) + min(spill, 10), b, max(0, min(a, 255 - (spill - 20) * 4)))
body = im.crop(im.getbbox())

os.makedirs(os.path.join(OUT, "_retired"), exist_ok=True)
for kind in ("world", "icon"):
    f = os.path.join(OUT, f"character_{cid}_{kind}.webp")
    if os.path.exists(f):
        shutil.copy(f, os.path.join(OUT, "_retired", f"character_{cid}_{kind}.webp"))

world = body.resize((round(body.width * 730 / body.height), 730), Image.LANCZOS)
world.save(os.path.join(OUT, f"character_{cid}_world.webp"), quality=92)
top = body.crop((0, 0, body.width, round(body.height * 0.55)))
icon = top.crop(top.getbbox())
icon = icon.resize((round(icon.width * 406 / icon.height), 406), Image.LANCZOS)
icon.save(os.path.join(OUT, f"character_{cid}_icon.webp"), quality=92)
print(cid, "world", world.size, "icon", icon.size)
