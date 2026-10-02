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

  /*
   * ---------------------------------------------------------------------
   * FIRST THE BAND THE FIGURES STAND IN, NOT THE WHOLE CANVAS
   * ---------------------------------------------------------------------
   * Amit: *"האווטאר כפול 4 ולא מציאותי."* Measured: `avatar_01_back` is
   * four figures walking shoulder to shoulder, arms touching, with the
   * bottom of a palm trunk from the neighbouring drawing above their
   * heads. With no empty column between the bodies the sheet read as
   * ONE figure, so the player was all four people and a tree trunk,
   * squeezed into one person's space.
   *
   * So: the rows first. The band with the most drawing in it is the
   * figures; anything separated from it by an empty strip — a trunk, a
   * shadow, a label — is somebody else's.
   */
  const rowN = new Int32Array(c.height);
  for (let y = 0; y < c.height; y += 1) {
    let n = 0;
    for (let x = 0; x < c.width; x += 1) if (opaque(x, y)) n += 1;
    rowN[y] = n;
  }
  const gapRows = Math.max(2, Math.round(c.height * 0.01));
  let by0 = 0;
  let by1 = c.height - 1;
  {
    let best = -1;
    let s0 = -1;
    let mass = 0;
    let gap = 0;
    const close = (end: number) => {
      if (s0 >= 0 && mass > best) { best = mass; by0 = s0; by1 = end; }
    };
    for (let y = 0; y < c.height; y += 1) {
      if (rowN[y]! > 2) {
        if (s0 < 0) { s0 = y; mass = 0; }
        mass += rowN[y]!;
        gap = 0;
      } else if (s0 >= 0 && ++gap >= gapRows) {
        close(y - gap);
        s0 = -1;
      }
    }
    close(c.height - 1);
  }
  const bandH = by1 - by0 + 1;

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
      for (let y = by0; y <= by1; y += 1) if (opaque(x, y)) n += 1;
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

    /*
     * AND FIGURES THAT TOUCH ARE SPLIT AT THE WAIST, NOT IN HALF.
     *
     * Two bodies touching at the hands still have much less drawing in
     * the columns between them than through either torso. So a run is
     * cut wherever the column count falls to under half of the torsos
     * on both sides — a valley — and never closer than a fifth of the
     * figure's height to the last cut, which is narrower than any body.
     */
    const k = Math.max(2, Math.round(bandH * 0.015));
    const sm = new Float32Array(c.width);
    for (let x = 0; x < c.width; x += 1) {
      let t = 0;
      let n = 0;
      for (let j = Math.max(0, x - k); j <= Math.min(c.width - 1, x + k); j += 1) { t += col[j]!; n += 1; }
      sm[x] = t / n;
    }
    const reach = Math.round(bandH * 0.22);
    const minPart = Math.round(bandH * 0.2);
    const split: Array<[number, number]> = [];
    for (const [a, z] of runs) {
      let from = a;
      for (let x = a + minPart; x <= z - minPart; x += 1) {
        if (x - from < minPart) continue;
        if (!(sm[x]! <= sm[x - 1]! && sm[x]! < sm[x + 1]!)) continue;
        let left = 0;
        let right = 0;
        for (let j = Math.max(a, x - reach); j < x; j += 1) left = Math.max(left, sm[j]!);
        for (let j = x + 1; j <= Math.min(z, x + reach); j += 1) right = Math.max(right, sm[j]!);
        if (sm[x]! < 0.5 * Math.min(left, right)) {
          split.push([from, x - 1]);
          from = x;
        }
      }
      split.push([from, z]);
    }

    const keep = split.filter(([a, z]) => z - a > Math.max(12, bandH * 0.08));
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
  const footTop = Math.floor(by1 - bandH * 0.12);
  const frames = rects.map(([a, z]) => {
    let lo = z;
    let hi = a;
    for (let y = footTop; y <= by1; y += 1) {
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
    /* Only the band: a texture's v runs bottom-up, so the band's
       offset is measured from the bottom of the canvas. */
    t.repeat.set(unit / c.width, bandH / c.height);
    t.offset.set((centre - unit / 2) / c.width, (c.height - 1 - by1) / c.height);
    return t;
  });
  return { frames, aspect: unit / bandH };
}
