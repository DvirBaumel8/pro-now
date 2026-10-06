import * as THREE from "three";

import { WALK_LIMIT, STREET_LENGTH, SPAWN } from "./street";

const WALK_STRIDE = 2.1;
const RUN_STRIDE = 3.4;
const PLAYER_HEIGHT = 1.78;
const STREET_Z_MIN = -(STREET_LENGTH / 2) - 6;
const STREET_Z_MAX = (STREET_LENGTH / 2) + 6;

export interface PlayerState {
  group: THREE.Sprite;
  x: number;
  z: number;
  distance: number;
  sprinting: boolean;
  walkTextures: THREE.Texture[];
  runTextures: THREE.Texture[];
  facing: number;
}

export function createPlayer(
  walkTextures: THREE.Texture[],
  runTextures: THREE.Texture[],
): PlayerState {
  const material = new THREE.SpriteMaterial({
    map: walkTextures[0],
    transparent: true,
    depthWrite: false,
  });
  const group = new THREE.Sprite(material);
  group.scale.set(2.2, PLAYER_HEIGHT * 1.74, 1);
  group.position.set(SPAWN.x, PLAYER_HEIGHT / 2 + 0.66, SPAWN.z);

  return {
    group,
    x: SPAWN.x,
    z: SPAWN.z,
    distance: 0,
    sprinting: false,
    walkTextures,
    runTextures,
    facing: 1,
  };
}

export function movePlayer(
  player: PlayerState,
  command: { x: number; z: number; sprint: boolean },
  deltaSeconds: number,
): void {
  const speed = command.sprint ? 4.4 : 2.7;
  const dx = command.x * speed * deltaSeconds;
  const dz = command.z * speed * deltaSeconds;
  player.x = THREE.MathUtils.clamp(player.x + dx, -WALK_LIMIT, WALK_LIMIT);
  player.z = THREE.MathUtils.clamp(player.z + dz, STREET_Z_MIN, STREET_Z_MAX);
  player.group.position.set(player.x, PLAYER_HEIGHT / 2 + 0.66, player.z);

  const moved = Math.hypot(dx, dz);
  if (moved > 0.001 && command.z !== 0) player.facing = command.z > 0 ? 1 : -1;
  stepWalkCycle(player, moved, command.sprint);
}

/** The walker covered `moved` metres: the cycle follows the ground, as the stick's walk does. */
export function stepWalkCycle(player: PlayerState, moved: number, sprint = false): void {
  if (moved <= 0.001) return;
  player.distance += moved;
  player.sprinting = sprint;
  const stride = sprint ? RUN_STRIDE : WALK_STRIDE;
  const frames = sprint ? player.runTextures : player.walkTextures;
  if (frames.length === 0) return;
  const frameIndex = Math.floor(player.distance / stride) % frames.length;
  const material = player.group.material as THREE.SpriteMaterial;
  const tex = frames[frameIndex] ?? null;
  if (material.map !== tex) {
    material.map = tex;
    material.needsUpdate = true;
  }
}

export function createContactShadow(): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(0,0,0,0.35)");
  g.addColorStop(0.5, "rgba(0,0,0,0.15)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const shadow = new THREE.Sprite(mat);
  shadow.scale.set(1.4, 0.4, 1);
  shadow.position.set(0, 0.01, 0);
  return shadow;
}
