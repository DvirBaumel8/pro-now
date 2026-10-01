import * as THREE from "three";

const ROOM_W = 4.6;
const ROOM_D = 5.0;
const ROOM_H = 3.2;

/**
 * Build a box room with back wall, side walls, floor, and a procedural
 * ceiling with downlights — matching the demo's boxRoom approach.
 */
export function createRoom(backTexture: THREE.Texture): THREE.Group {
  const room = new THREE.Group();

  const backMat = new THREE.MeshBasicMaterial({ map: backTexture, side: THREE.FrontSide });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_H), backMat);
  back.position.set(0, ROOM_H / 2, -ROOM_D / 2);
  room.add(back);

  const wallColour = "#1a1520";
  const sideMat = new THREE.MeshStandardMaterial({ color: wallColour, roughness: 0.9, side: THREE.FrontSide });

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, ROOM_H), sideMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-ROOM_W / 2, ROOM_H / 2, 0);
  room.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, ROOM_H), sideMat.clone());
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(ROOM_W / 2, ROOM_H / 2, 0);
  room.add(rightWall);

  const floorMat = new THREE.MeshStandardMaterial({ color: "#2a2030", roughness: 0.7, metalness: 0.1 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0.01, 0);
  room.add(floor);

  const ceilMat = new THREE.MeshStandardMaterial({ color: "#1e1828", roughness: 0.95 });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, ROOM_H, 0);
  room.add(ceil);

  const downlightPositions = [
    [-ROOM_W * 0.25, ROOM_H - 0.05, -ROOM_D * 0.2],
    [ROOM_W * 0.25, ROOM_H - 0.05, -ROOM_D * 0.2],
    [0, ROOM_H - 0.05, ROOM_D * 0.15],
  ] as const;

  for (const [lx, ly, lz] of downlightPositions) {
    const light = new THREE.PointLight("#ffeedd", 1.8, 6, 1.5);
    light.position.set(lx, ly, lz);
    room.add(light);
  }

  const ambient = new THREE.AmbientLight("#d8c8e0", 0.6);
  room.add(ambient);

  addDust(room, ROOM_W, ROOM_H, ROOM_D);

  return room;
}

function addDust(parent: THREE.Group, w: number, h: number, d: number): void {
  const count = 160;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * w;
    positions[i * 3 + 1] = Math.random() * h;
    positions[i * 3 + 2] = (Math.random() - 0.5) * d;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: "#ffe8cc",
    size: 0.025,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  parent.add(new THREE.Points(geo, mat));
}
