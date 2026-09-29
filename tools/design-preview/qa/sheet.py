import sys, glob
from PIL import Image
tag = sys.argv[1]
fs = sorted(glob.glob(f'out/j_{tag}_*.png'))
ims = [Image.open(f).resize((195, 422)) for f in fs]
cols = 8
rows = (len(ims) + cols - 1) // cols
W = Image.new('RGB', (cols * 200, rows * 427), (20, 20, 20))
for i, im in enumerate(ims):
    W.paste(im, ((i % cols) * 200, (i // cols) * 427))
W.save(f'out/sheet_{tag}.jpg', quality=80)
print(len(fs))
