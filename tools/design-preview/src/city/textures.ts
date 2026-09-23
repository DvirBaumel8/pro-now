import * as THREE from "three";

/**
 * TEXTURES DRAWN RATHER THAN DOWNLOADED.
 *
 * A city needs paving, asphalt, plaster and glass, and none of those
 * exist in this project's art pack — it is full of shopfronts and
 * people, which is the expensive half. Canvas draws the cheap half at
 * build time, tiles it, and costs one file instead of eight.
 *
 * Everything here is made DARK. The instinct is to draw a material at
 * the brightness you want to see, and on a night street that is wrong
 * twice over: the lamps have nothing to add to a surface that is
 * already bright, and a surface with no dark in it cannot hold a
 * shadow. The pools of warm light under the lamps only exist because
 * the pavement between them is nearly black.
 */

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

function texture(c: HTMLCanvasElement, repeatX: number, repeatY: number): THREE.Texture {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Cut stone, laid in courses, with the grout darker than the stone. */
export function paving(repeat = 26): THREE.Texture {
  const [c, x] = canvas(512, 512);
  x.fillStyle = "#211c1a";
  x.fillRect(0, 0, 512, 512);
  const TILE = 128;
  for (let row = 0; row < 4; row += 1) {
    const offset = row % 2 ? TILE / 2 : 0;
    for (let col = -1; col < 5; col += 1) {
      const v = Math.random() * 14 - 7;
      x.fillStyle = `rgb(${54 + v},${48 + v},${43 + v})`;
      x.fillRect(col * TILE + offset + 2, row * TILE + 2, TILE - 4, TILE - 4);
      /* A little wear towards the edges of each stone. */
      const g = x.createRadialGradient(
        col * TILE + offset + TILE / 2, row * TILE + TILE / 2, TILE * 0.2,
        col * TILE + offset + TILE / 2, row * TILE + TILE / 2, TILE * 0.72
      );
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.28)");
      x.fillStyle = g;
      x.fillRect(col * TILE + offset + 2, row * TILE + 2, TILE - 4, TILE - 4);
    }
  }
  return texture(c, repeat, repeat * 2.4);
}

/** Asphalt, with a worn centre line and lane dashes. */
export function asphalt(): THREE.Texture {
  const [c, x] = canvas(256, 1024);
  x.fillStyle = "#1a181f";
  x.fillRect(0, 0, 256, 1024);
  for (let i = 0; i < 4200; i += 1) {
    x.fillStyle = `rgba(255,255,255,${Math.random() * 0.035})`;
    x.fillRect(Math.random() * 256, Math.random() * 1024, 2, 2);
  }
  x.fillStyle = "rgba(226,222,236,0.55)";
  for (let y = 0; y < 1024; y += 150) x.fillRect(122, y, 9, 78);
  return texture(c, 1, 9);
}

/** Plaster, for the walls the art does not cover. */
export function plaster(tint = "#241d2b"): THREE.Texture {
  const [c, x] = canvas(256, 256);
  x.fillStyle = tint;
  x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i += 1) {
    const a = Math.random() * 0.05;
    x.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a * 1.6})`;
    x.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }
  return texture(c, 3, 2);
}

/**
 * A NEON SIGN, DRAWN AS A SIGN IS DRAWN.
 *
 * Neon is a bright thin core inside a wide soft halo — which is exactly
 * what a canvas stroke with a shadow gives, three times over at
 * widening radii. Painted onto an additive plane it lights up against
 * the night the way the real thing does, and it costs one texture
 * rather than a bloom pass the mobile GPU would have to pay for on
 * every pixel of every frame.
 */
export function neon(
  draw: (x: CanvasRenderingContext2D, w: number, h: number) => void,
  colour = "#ff5f7a",
  size = 512,
  height = size
): THREE.Texture {
  const [c, x] = canvas(size, height);
  x.clearRect(0, 0, size, height);
  x.lineCap = "round";
  x.lineJoin = "round";
  /* Three passes: a wide dim halo, a tighter one, then the white core. */
  const passes: Array<[number, string, number]> = [
    [26, colour, 0.22],
    [12, colour, 0.5],
    [4.5, "#fff6f8", 1],
  ];
  for (const [width, stroke, alpha] of passes) {
    x.save();
    x.globalAlpha = alpha;
    x.strokeStyle = stroke;
    x.fillStyle = stroke;
    x.lineWidth = width;
    x.shadowColor = colour;
    x.shadowBlur = width * 2.4;
    draw(x, size, height);
    x.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** A soft round blob, for pools of light and glows. */
export function glow(colour = "255,180,94"): THREE.Texture {
  const [c, x] = canvas(256, 256);
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, `rgba(${colour},0.9)`);
  g.addColorStop(0.35, `rgba(${colour},0.35)`);
  g.addColorStop(1, `rgba(${colour},0)`);
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
