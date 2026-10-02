import * as THREE from "three";

import { glow } from "./textures";

/**
 * THE PERSON YOU ARE.
 *
 * ---------------------------------------------------------------------
 * A DRAWN CYCLE IN A LIT SCENE
 * ---------------------------------------------------------------------
 * Amit had sixteen poses of his character drawn from behind — eight
 * walking, eight running — and `slice-walkcycle.mjs` cut them out. They
 * are drawings, so the figure is a plane that turns to face the camera;
 * and because the poses are BACK views and a third-person camera is
 * behind you, that is not a compromise, it is the correct picture.
 *
 * ---------------------------------------------------------------------
 * WHY IT IS NOT LIT BY THE SCENE'S LIGHTS
 * ---------------------------------------------------------------------
 * The obvious thing is a `MeshStandardMaterial` so the lamps light it.
 * On a plane that always faces the camera, they do not: the surface
 * normal points at the viewer, so a lamp BEHIND the figure — which is
 * every lamp it walks towards — contributes almost nothing, and the
 * character walks down a lit street in the dark.
 *
 * So the tint is computed instead: how close the nearest warm light is,
 * turned into a colour multiplier on an unlit material. It costs one
 * distance check a frame and it does the thing the lighting was for —
 * the figure warms as it passes under a lamp and cools between them.
 *
 * The cycle is driven by GROUND COVERED, not by a clock. A timer plays
 * the same poses at the same rate whether you are running, walking or
 * standing still, and the feet slide along the pavement.
 */

export interface PlayerHandles {
  group: THREE.Group;
  /** Called with the distance walked so far, in metres. */
  setDistance: (metres: number, running: boolean) => void;
  /** Warmed by the nearest light. Pass the lamp positions once. */
  light: (lamps: readonly THREE.Vector3[]) => void;
  dispose: () => void;
}

/** How far one complete cycle carries you, in metres. */
const STRIDE = { walk: 2.1, run: 3.4 } as const;

export function buildPlayer(
  walk: readonly THREE.Texture[],
  run: readonly THREE.Texture[],
  height = 1.78,
  /**
   * The shape of ONE FRAME, not of the file.
   *
   * Amit, the moment he walked into the street: *"כבר באג איך שנכנסתי"*
   * — and the screenshot showed three enormous smeared rectangles lying
   * flat on the pavement where the character should be.
   *
   * The twelve delivered walk cycles are ONE image with eight poses in
   * a row: 1302 × 1800, so a frame is 162 wide. The engine slices them
   * at load with a texture offset, which costs one download instead of
   * eight — but the quad was still being sized from `image.width`,
   * which is the whole sheet. A figure eight times too wide, with one
   * eighth of a drawing stretched across it.
   *
   * Amit's own cycle came as eight separate files, so for a year the
   * sheet and the frame were the same thing and this was invisible.
   * The caller knows which it has; it says so here.
   */
  frameAspect?: number
): PlayerHandles {
  const group = new THREE.Group();

  const first = walk[0]!;
  const img = first.image as { width: number; height: number };
  const w = height * (frameAspect ?? img.width / img.height);

  const material = new THREE.MeshBasicMaterial({
    map: first,
    transparent: true,
    alphaTest: 0.35,
    toneMapped: false,
    /* One quad. Culling it saves nothing and costs a whole session of
       wondering where the character went. */
    side: THREE.DoubleSide,
  });
  const sprite = new THREE.Mesh(new THREE.PlaneGeometry(w, height), material);
  sprite.position.y = height / 2;
  group.add(sprite);

  /*
   * A contact shadow rather than a cast one. A plane that faces the
   * camera casts a sheet, not a person — so the thing that plants the
   * figure on the pavement is drawn under its feet, where the eye
   * looks for it.
   */
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.95, w * 0.5),
    new THREE.MeshBasicMaterial({
      map: glow("0,0,0"),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  let lamps: readonly THREE.Vector3[] = [];
  const warm = new THREE.Color(0xffc98a);
  const cold = new THREE.Color(0x6e6a8c);
  const tint = new THREE.Color();

  return {
    group,
    setDistance(metres, running) {
      const frames = running && run.length ? run : walk;
      const stride = running ? STRIDE.run : STRIDE.walk;
      const phase = ((metres / stride) % 1 + 1) % 1;
      const i = Math.min(frames.length - 1, Math.floor(phase * frames.length));
      if (material.map !== frames[i]) {
        material.map = frames[i]!;
        material.needsUpdate = true;
      }
    },
    light(next) {
      lamps = next;
      /* Re-tint from wherever the group currently stands. */
      let nearest = Infinity;
      for (const l of lamps) {
        const d = Math.hypot(l.x - group.position.x, l.z - group.position.z);
        if (d < nearest) nearest = d;
      }
      /* Full warmth under a lamp, fading to the cold ambient by 14m. */
      const k = Math.max(0, Math.min(1, 1 - nearest / 14));
      tint.copy(cold).lerp(warm, k * k);
      /* Never fully dark: a silhouette you cannot see is not a figure. */
      material.color.copy(tint).multiplyScalar(0.55 + k * 0.75);
    },
    dispose() {
      sprite.geometry.dispose();
      material.dispose();
      shadow.geometry.dispose();
    },
  };
}
