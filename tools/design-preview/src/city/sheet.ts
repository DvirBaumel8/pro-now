import * as THREE from "three";

/**
 * SLICING A WALK CYCLE THAT IS NOT A GRID.
 *
 * ---------------------------------------------------------------------
 * WHY THIS IS ITS OWN FILE
 * ---------------------------------------------------------------------
 * It was written inside the street, for the crowd, and the player did
 * not use it — the player kept dividing its sheet into eight equal
 * slices. Amit, twice, with a screenshot both times: *"לא מבין לאן
 * הדמות הלכה ומה הכתם הזה שנשאר פה"*, and then *"עדיין לא רואים את
 * הדמות."*
 *
 * He was looking at his own character cut into ribbons and laid on the
 * pavement. One rule, one place, both callers — that is the whole
 * reason this moved out here.
 *
 * ---------------------------------------------------------------------
 * THE SHEETS ARE NOT GRIDS
 * ---------------------------------------------------------------------
 * Measured on the delivered files: `avatar_01_back` is 1302 x 1800 and
 * `avatar_02_back` is 1287 — not even the same width. `avatar_02`'s one
 * visible gap is at 391..414, and an eighth of 1287 is 160.9, so the
 * gap is nowhere near a frame boundary. `walk_man` holds seven figures
 * between 254 and 305 pixels wide with gaps from 1 to 25.
 *
 * Dividing any of that by eight cuts through the drawings: some slices
 * hold most of a figure, some hold two halves, and one or two hold
 * almost nothing — which is the frame where the character "disappears"
 * and leaves the pale edge of the cut-out behind. That pale edge is the
 * stain in his screenshot.
 *
 * So the frames are FOUND. A column belongs to a figure if anything in
 * it is opaque; a run of such columns is a figure; a run much wider
 * than the median is two figures touching and is split in half.
 */
export interface Cycle {
  frames: THREE.Texture[];
  /** Width of one frame's sampling window over its height. */
  aspect: number;
}

export function measureCycle(
  tex: THREE.Texture | undefined,
  /**
   * For the one sheet whose figures cannot be told apart by the run
   * rule: `walk_dogwalker` is a person AND a dog per pose, and the gap
   * between the two is as wide as the gap between poses.
   */
  forceEven = 0
): Cycle | null {
  if (!tex) return null;
  const img = tex.image as HTMLImageElement | undefined;
  if (!img || !img.width) return null;
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const x2 = c.getContext("2d", { willReadFrequently: true });
  if (!x2) return null;
  x2.drawImage(img, 0, 0);
  const data = x2.getImageData(0, 0, c.width, c.height).data;
  const opaque = (x: number, y: number) => (data[(y * c.width + x) * 4 + 3] ?? 0) > 40;

  const rects: Array<[number, number]> = [];
  if (forceEven > 0) {
    const w = c.width / forceEven;
    for (let i = 0; i < forceEven; i += 1) {
      rects.push([Math.round(i * w), Math.round((i + 1) * w) - 1]);
    }
  } else {
    const col = new Int32Array(c.width);
    for (let x = 0; x < c.width; x += 1) {
      let n = 0;
      for (let y = 0; y < c.height; y += 1) if (opaque(x, y)) n += 1;
      col[x] = n;
    }
    const runs: Array<[number, number]> = [];
    let start = -1;
    for (let x = 0; x < c.width; x += 1) {
      if (col[x]! > 2 && start < 0) start = x;
      else if (col[x]! <= 2 && start >= 0) {
        runs.push([start, x - 1]);
        start = -1;
      }
    }
    if (start >= 0) runs.push([start, c.width - 1]);
    const keep = runs.filter(([a, z]) => z - a > 40);
    if (keep.length === 0) return null;
    const widths = keep.map(([a, z]) => z - a + 1).sort((a, b) => a - b);
    const median = widths[Math.floor(widths.length / 2)]!;
    for (const [a, z] of keep) {
      const w = z - a + 1;
      const parts = Math.max(1, Math.round(w / median));
      for (let i = 0; i < parts; i += 1) {
        rects.push([
          Math.round(a + (w * i) / parts),
          Math.round(a + (w * (i + 1)) / parts) - 1,
        ]);
      }
    }
  }
  if (rects.length === 0) return null;

  /*
   * -------------------------------------------------------------------
   * ANCHORED ON THE FEET, NOT ON THE MIDDLE OF THE SILHOUETTE
   * -------------------------------------------------------------------
   * Amit: *"שאר הדמויות לא מושלמות, מרצדות וקופצות."*
   *
   * Centring each pose on the middle of its own outline looks obviously
   * right and is wrong: in a walk cycle an arm swings forward and a leg
   * swings back, so the outline's centre moves from pose to pose — and
   * the body slides sideways under the walker as they walk. That is the
   * "jumping".
   *
   * The feet barely move sideways across a cycle, which is what makes
   * them the anchor. So the window is centred on the middle of the
   * bottom eighth of each figure, and the figure stays where it is
   * while its limbs do the moving.
   */
  const unit = Math.max(...rects.map(([a, z]) => z - a + 1));
  const footTop = Math.floor(c.height * 0.88);
  const frames = rects.map(([a, z]) => {
    let lo = z;
    let hi = a;
    for (let y = footTop; y < c.height; y += 1) {
      for (let x = a; x <= z; x += 1) {
        if (!opaque(x, y)) continue;
        if (x < lo) lo = x;
        if (x > hi) hi = x;
      }
    }
    /* No feet found — a sheet cropped tight, or a prop rather than a
       person. The outline's centre is then the best there is. */
    const centre = hi >= lo ? (lo + hi + 1) / 2 : (a + z + 1) / 2;
    const t = tex.clone();
    t.needsUpdate = true;
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.repeat.set(unit / c.width, 1);
    t.offset.set((centre - unit / 2) / c.width, 0);
    return t;
  });
  return { frames, aspect: unit / c.height };
}
