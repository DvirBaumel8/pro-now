import sys
from PIL import Image, ImageDraw
src, out = sys.argv[1], sys.argv[2]
y0 = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0
im = Image.open(src).convert('RGBA')
bg = Image.new('RGBA', im.size, (60, 60, 60, 255)); bg.alpha_composite(im); im = bg
W, H = im.size
im = im.crop((0, int(H * y0), W, H))
d = ImageDraw.Draw(im)
step = 50 if W < 2000 else 100
for x in range(0, W, step):
    d.line([(x, 0), (x, im.height)], fill=(255, 0, 0, 255) if x % (step * 4) == 0 else (255, 255, 0, 140), width=1)
    if x % (step * 2) == 0: d.text((x + 2, 2), str(x), fill=(255, 255, 255, 255))
for y in range(0, im.height, step):
    yy = y + int(H * y0)
    d.line([(0, y), (W, y)], fill=(255, 0, 0, 255) if yy % (step * 4) == 0 else (0, 255, 255, 140), width=1)
    d.text((2, y + 2), str(yy), fill=(255, 255, 255, 255))
im.convert('RGB').save(out)
