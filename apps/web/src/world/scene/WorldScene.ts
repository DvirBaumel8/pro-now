import * as THREE from "three";

import type { WorldSceneFactoryArgs, WorldSceneHandle } from "../WorldCanvas";
import { WORLD_ASSETS, type WorldAssetId, worldAssetUrl } from "../assets";
import type { WorldMoveCommand, WorldSceneModel, WorldTrade } from "../types";
import {
  DESCENT_SECONDS,
  easeTowards,
  entryPose,
  followFactor,
  followPose,
  frameStreet,
  lookAtNow,
  shopPose,
  smoothstep01,
} from "./camera";
import {
  canEnterTrade,
  nearestShop,
  WORLD_SHOPS,
  FRONT_X,
  ROAD_HALF,
  STREET_LENGTH,
  KERB_X,
  PAVEMENT,
  SPAWN,
} from "./street";
import { createPlayer, movePlayer, createContactShadow, stepWalkCycle, type PlayerState } from "./player";
import { ROOM_FIGURE, buildBoxRoom, freshStand, stepInRoom, type BoxRoom, type RoomStand } from "./boxRoom";
import {
  ENTRY_MS,
  WALKER_AIM_Y,
  doorShot,
  entryProgress,
  entryVeil,
  faceFade,
  roomVeil,
  streetShot,
} from "./shopEntry";
import { createShopFront, facadeSize, type ShopFront } from "./shopFront";
import {
  LAMP_CLEARANCE,
  ROOM_PROPS,
  SHOP_WINDOWS,
  clearOfWindow, createShopWindow, punchWindow, roomArtIds, type RoomArt, type ShopWindow } from "./shopWindow";
import { WALKER_SHEETS, createWalker, cycleFromSheet, planWalkers, type Walker } from "./walkers";
import {
  BUILDING_KINDS,
  BUILDING_LAYERS,
  ROOF_IDS,
  carcassMaterial,
  createBuilding,
  createLayerMaterial,
  createShopCarcass,
  cropToCentrePiece,
  dressLayer,
  flatHeightMap,
  reliefNormalMap,
  terraceBays,
  type Building,
  type TerraceArt,
} from "./terrace";
import { paving, asphalt, glow, wordmark } from "./textures";
import {
  LANES,
  createVan,
  cutout,
  fleetSchedule,
  fleetTrade,
  imageAspect,
  parkedLayout,
  type Cutout,
  type FleetSlot,
  type FleetTrade,
  type ParkedSpot,
  type Van,
} from "./vans";
import {
  LABEL_HEIGHT,
  blocksHero,
  createDriveMarks,
  driveSpan,
  driveSpeed,
  driveTarget,
  droneFactor,
  droneShot,
  easeDrive,
  heroTrade,
  onScreen,
  type DriveSpan,
} from "./drive";
import {
  WORLD_LIGHTING,
  aimSun,
  configureSunShadow,
  shadowFocus,
  shadowForSprite,
  skyTexture,
} from "./lighting";
import {
  EVENING_LIGHT,
  LEND_INTERVAL_S,
  createLightPool,
  emitter,
  lendLights,
  type LightEmitter,
} from "./lightPool";
import { createFrameGovernor } from "./frameGovernor";
import {
  artLoader,
  buildDogPark,
  buildFurniture,
  buildKerbs,
  buildPlaces,
  buildSignWet,
  buildSteam,
  buildTrees,
  hideCanopies,
} from "./dressingScene";
import { ROOF_SIGN } from "./dressing";
import { createPostProcessing, type PostProcessingHandle } from "./postProcessing";

const LAMP_SPACING = 31;
const LAMP_HEIGHT = 4.2;

function loadTexture(loader: THREE.TextureLoader, id: WorldAssetId): THREE.Texture {
  return loader.load(worldAssetUrl(id));
}

function tiledPhoto(tex: THREE.Texture | null, repeatX: number, repeatY: number): THREE.Texture | null {
  if (!tex) return null;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function tryLoadTexture(loader: THREE.TextureLoader, id: string): THREE.Texture | null {
  if (id in WORLD_ASSETS) return loadTexture(loader, id as WorldAssetId);
  return null;
}

function disposeObject(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    mesh.customDepthMaterial?.dispose();
    const material = mesh.material;
    const materials = Array.isArray(material) ? material : material ? [material] : [];
    for (const item of materials) {
      const texture = (item as THREE.MeshBasicMaterial).map;
      texture?.dispose();
      item.dispose();
    }
  });
}

function tradeForShop(model: WorldSceneModel, shopId: string): WorldTrade | null {
  return model.trades[shopId] ?? null;
}

function isDaytime(): boolean {
  const h = new Date().getHours();
  return h >= 6 && h < 18;
}

type TickFn = (dt: number, elapsed: number) => void;

function buildStreetGeometry(
  root: THREE.Group,
  scene: THREE.Scene,
  loader: THREE.TextureLoader,
  ticking: TickFn[],
  camera: THREE.Camera,
): {
  lamps: THREE.Vector3[];
  /** Cut-outs the camera can stand in (trees, the layby, parked vehicles): hidden while it does. */
  canopies: THREE.Object3D[];
  emitters: LightEmitter[];
  parked: ParkedSpot[];
  /** The plaster behind the shops' drawings (the demo's wallMats[1]). */
  shopCarcass: THREE.Material;
  /** A roof piece by its index in ROOF_IDS, sized to its sheet once that is in. */
  roofPiece(pick: number, height: number): Cutout;
} {
  const day = isDaytime();
  const halfStreet = STREET_LENGTH / 2;

  // The demo's photographed stone and asphalt; the drawn ones if the art is missing.
  // Once a photograph is in, its relief is read from its brightness into a
  // normal map (the demo's `relief`), so a lamp finds the lip on every stone.
  const groundMaterials = { paving: [] as THREE.MeshStandardMaterial[], road: [] as THREE.MeshStandardMaterial[] };
  const reliefOnto = (which: keyof typeof groundMaterials, scale: number) => (loaded: THREE.Texture) => {
    const normal = reliefNormalMap(loaded);
    if (!normal) return;
    normal.repeat.copy(loaded.repeat);
    for (const material of groundMaterials[which]) {
      material.normalMap = normal;
      material.normalScale.set(scale, scale);
      material.needsUpdate = true;
    }
  };
  const pavingTex = tiledPhoto(loader.load(worldAssetUrl("mat_paving"), reliefOnto("paving", 0.55)), 12, 62) ?? paving(26);
  const asphaltTex = tiledPhoto(loader.load(worldAssetUrl("mat_road"), reliefOnto("road", 0.35)), 2, 34) ?? asphalt();

  const groundGeo = new THREE.PlaneGeometry(FRONT_X * 2, STREET_LENGTH);
  // The demo's ground: cut stone with a little sheen, so the sun finds it.
  const pavingMaterial = () => {
    const material = new THREE.MeshStandardMaterial({ map: pavingTex, roughness: 0.45, metalness: 0.08 });
    groundMaterials.paving.push(material);
    return material;
  };
  const leftPavement = new THREE.Mesh(
    groundGeo.clone(),
    pavingMaterial(),
  );
  leftPavement.rotation.x = -Math.PI / 2;
  leftPavement.position.set(-FRONT_X / 2 - ROAD_HALF / 2, -0.02, 0);
  leftPavement.receiveShadow = true;
  root.add(leftPavement);

  const rightPavement = new THREE.Mesh(
    groundGeo.clone(),
    pavingMaterial(),
  );
  rightPavement.rotation.x = -Math.PI / 2;
  rightPavement.position.set(FRONT_X / 2 + ROAD_HALF / 2, -0.02, 0);
  rightPavement.receiveShadow = true;
  root.add(rightPavement);

  const roadGeo = new THREE.PlaneGeometry(ROAD_HALF * 2, STREET_LENGTH);
  const roadMaterial = new THREE.MeshStandardMaterial({
    map: asphaltTex,
    roughness: 0.22,
    metalness: 0.35,
  });
  groundMaterials.road.push(roadMaterial);
  const road = new THREE.Mesh(roadGeo, roadMaterial);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0, 0);
  road.receiveShadow = true;
  root.add(road);

  // The demo's kerb: 0.55 m wide, 0.28 m high.
  buildKerbs(root);

  /* ---------- the terrace: the demo's drawn buildings (terrace.ts) ---------- */
  const carcassMaterials = (["mat_plaster_warm", "mat_plaster_cool", "mat_stone"] as const).map((id) =>
    carcassMaterial(loadTexture(loader, id)),
  );
  const buildings: Building[] = [];
  const layerMaterials = Array.from({ length: BUILDING_KINDS }, (_, k) => {
    const kind = k + 1;
    let wallHeight: THREE.Texture | null = null;
    let wallIn = false;
    const materials = BUILDING_LAYERS.map(({ layer, lit }, i) => {
      const drawing = loader.load(worldAssetUrl(`bld_${kind}_${layer}` as WorldAssetId), (loaded) => {
        if (i === 0) {
          wallIn = true;
          dressLayer(material, wallHeight);
          const aspect = imageAspect(loaded);
          if (aspect) for (const building of buildings) if (building.kind === kind) building.fit(aspect);
        } else {
          dressLayer(material);
        }
      });
      const material = createLayerMaterial(drawing, lit);
      return material;
    });
    // The wall's drawn relief; whichever of it and the wall arrives second dresses the wall.
    loader.load(worldAssetUrl(`bld_${kind}_wall_height` as WorldAssetId), (loaded) => {
      wallHeight = flatHeightMap(loaded);
      if (wallIn) dressLayer(materials[0]!, wallHeight);
    });
    return materials;
  });
  const roofAspects: Array<number | null> = ROOF_IDS.map(() => null);
  const roofFits: Array<(pick: number, aspect: number) => void> = [];
  const roofSheets = ROOF_IDS.map((id, pick) =>
    loader.load(worldAssetUrl(id), (loaded) => {
      const aspect = cropToCentrePiece(loaded);
      if (!aspect) return;
      roofAspects[pick] = aspect;
      for (const building of buildings) building.fitRoof(pick, aspect);
      for (const fitRoof of roofFits) fitRoof(pick, aspect);
    }),
  );
  const terraceArt: TerraceArt = { layers: layerMaterials, roof: roofSheets, carcass: carcassMaterials };
  for (const bay of terraceBays(WORLD_SHOPS)) {
    const building = createBuilding(bay, terraceArt);
    buildings.push(building);
    root.add(building.group);
  }

  /* ---------- street lamps ---------- */
  const lamps: THREE.Vector3[] = [];
  const emitters: LightEmitter[] = [];
  const glowTex = glow();
  const lampTex = tryLoadTexture(loader, "prop_lamp");

  for (let z = -halfStreet + 10; z < halfStreet; z += LAMP_SPACING) {
    for (const side of [-1, 1] as const) {
      const lx = side * (KERB_X + PAVEMENT * 0.35);
      // Not across a see-into window (the demo's lamps keep 6.5 m from one).
      if (!clearOfWindow(lx, z, LAMP_CLEARANCE)) continue;

      if (lampTex) {
        const lampSprite = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: lampTex, transparent: true, depthWrite: false, alphaTest: 0.1 }),
        );
        lampSprite.scale.set(1.5, LAMP_HEIGHT + 0.5, 1);
        lampSprite.position.set(lx, (LAMP_HEIGHT + 0.5) / 2, z);
        root.add(lampSprite, shadowForSprite(lampSprite));
      } else {
        const poleMat = new THREE.MeshStandardMaterial({ color: "#2a2530", metalness: 0.5 });
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, LAMP_HEIGHT, 6), poleMat);
        pole.position.set(lx, LAMP_HEIGHT / 2, z);
        pole.castShadow = true;
        root.add(pole);

        const armLen = 0.8;
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, armLen, 4), poleMat.clone());
        arm.rotation.z = Math.PI / 2;
        arm.position.set(lx - side * armLen / 2, LAMP_HEIGHT, z);
        root.add(arm);
      }

      if (!day) {
        const lampGlow = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: glowTex,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            opacity: 0.85,
          }),
        );
        lampGlow.scale.set(3.5, 3.5, 1);
        lampGlow.position.set(lx, LAMP_HEIGHT + 0.3, z);
        root.add(lampGlow);

        // A real light only while one of the pool's is lent to it (lightPool.ts).
        const { colour, intensity, distance, height } = EVENING_LIGHT.lamp;
        emitters.push(emitter(lx, height, z, colour, intensity, distance));

        // The painted pool under the lamp and its streak on the wet stone, as
        // the demo's: for a lamp without a real light, this IS its light.
        const disc = new THREE.Mesh(
          new THREE.PlaneGeometry(11, 11),
          new THREE.MeshBasicMaterial({
            map: glowTex, color: colour, transparent: true, opacity: 0.16,
            blending: THREE.AdditiveBlending, depthWrite: false,
          }),
        );
        disc.rotation.x = -Math.PI / 2;
        disc.position.set(lx, 0.02, z);
        root.add(disc);
        const streak = new THREE.Mesh(
          new THREE.PlaneGeometry(1.6, 17),
          new THREE.MeshBasicMaterial({
            map: glowTex, color: colour, transparent: true, opacity: 0.1,
            blending: THREE.AdditiveBlending, depthWrite: false,
          }),
        );
        streak.rotation.x = -Math.PI / 2;
        streak.position.set(lx, 0.025, z + 7.5);
        root.add(streak);
      }

      lamps.push(new THREE.Vector3(lx, LAMP_HEIGHT, z));
    }
  }

  /* ---------- trees, at the kerb (dressing.ts) ---------- */
  const art = artLoader(loader);
  const canopies: THREE.Object3D[] = [];
  buildTrees(root, art, canopies);

  /* ---------- festoon / string lights: day and evening, as the demo's ---------- */
  {
    const bulbs: number[] = [];
    const tints: number[] = [];
    const cablePts: number[] = [];
    const WARM = [
      [1, 0.82, 0.55], [1, 0.72, 0.42], [1, 0.9, 0.7],
      [0.68, 0.86, 1], [1, 0.62, 0.62], [0.78, 1, 0.78],
    ];
    for (let z = halfStreet - 16; z > -halfStreet; z -= 31) {
      const x0 = -KERB_X - 1.4;
      const x1 = KERB_X + 1.4;
      const top = 7.4;
      const sag = 1.9;
      const N = 13;
      let prev: [number, number, number] | null = null;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const x = x0 + (x1 - x0) * t;
        const y = top - sag * (1 - Math.pow(2 * t - 1, 2));
        const zz = z + Math.sin(t * Math.PI) * 0.6;
        if (prev) cablePts.push(prev[0], prev[1], prev[2], x, y, zz);
        prev = [x, y, zz];
        if (i > 0 && i < N) {
          bulbs.push(x, y - 0.22, zz);
          const c = WARM[(((i + Math.round(z)) % WARM.length) + WARM.length) % WARM.length]!;
          tints.push(c[0]!, c[1]!, c[2]!);
        }
      }
    }
    const cableGeo = new THREE.BufferGeometry();
    cableGeo.setAttribute("position", new THREE.Float32BufferAttribute(cablePts, 3));
    scene.add(new THREE.LineSegments(
      cableGeo,
      new THREE.LineBasicMaterial({ color: 0x120e1a, transparent: true, opacity: 0.85 }),
    ));
    const bulbGeo = new THREE.BufferGeometry();
    bulbGeo.setAttribute("position", new THREE.Float32BufferAttribute(bulbs, 3));
    bulbGeo.setAttribute("color", new THREE.Float32BufferAttribute(tints, 3));
    const festoonPoints = new THREE.Points(
      bulbGeo,
      new THREE.PointsMaterial({
        map: glowTex, size: 1.5, sizeAttenuation: true, vertexColors: true,
        transparent: true, opacity: 0.95, depthWrite: false,
        blending: THREE.AdditiveBlending, toneMapped: false,
      }),
    );
    scene.add(festoonPoints);
    ticking.push((_dt, t) => {
      (festoonPoints.material as THREE.PointsMaterial).opacity = 0.82 + Math.sin(t * 1.4) * 0.13;
    });
  }

  /* ---------- café tables, planters, benches, bins; steam; places; the dog park (dressing.ts) ---------- */
  buildFurniture(root, art, glowTex, ticking);
  buildSteam(root, glowTex, ticking);
  buildPlaces(root, art, canopies);
  buildDogPark(root, art, glowTex, camera, ticking, canopies);

  /* ---------- parked vehicles (the demo's: half up on the kerb, every 47 m) ---------- */
  const parked: ParkedSpot[] = [];
  for (const spot of parkedLayout(clearOfWindow)) {
    const drawing = loader.load(worldAssetUrl(spot.id), (loaded) => {
      const aspect = imageAspect(loaded);
      if (aspect) vehicle.fit(aspect);
    });
    const vehicle = cutout(drawing, spot.height);
    const stand = new THREE.Group();
    stand.add(vehicle);
    stand.position.set(spot.x, 0, spot.z);
    stand.rotation.y = spot.yaw;
    root.add(stand);
    canopies.push(stand);
    parked.push({ side: spot.side, z: spot.z });
  }

  const roofPiece = (pick: number, height: number) => {
    const piece = cutout(roofSheets[pick]!, height);
    const aspect = roofAspects[pick];
    if (aspect) piece.fit(aspect);
    roofFits.push((fitted, fittedAspect) => {
      if (fitted === pick) piece.fit(fittedAspect);
    });
    return piece;
  };
  return { lamps, emitters, canopies, parked, shopCarcass: carcassMaterials[1]!, roofPiece };
}

/**
 * The passers-by, as the demo's (walkers.ts): each sheet sliced into its poses
 * once it arrives, then the crowd laid out on the pavements, walking away from
 * the camera and stepping through their poses by the ground they cover.
 */
function buildWalkers(root: THREE.Group, loader: THREE.TextureLoader, ticking: TickFn[]): void {
  const plans = planWalkers();
  const walkers: Walker[] = [];
  const contactShadow = glow();

  WALKER_SHEETS.forEach(({ id, forceEven }, sheet) => {
    loader.load(worldAssetUrl(id), (loaded) => {
      const cycle = cycleFromSheet(loaded, forceEven);
      if (!cycle) return;
      for (const plan of plans) {
        if (plan.sheet !== sheet) continue;
        const walker = createWalker(plan, cycle, contactShadow);
        walkers.push(walker);
        root.add(walker.group);
      }
    });
  });

  ticking.push((dt) => {
    for (const walker of walkers) walker.step(dt);
  });
}

/**
 * The street's traffic: the demo's PRO NOW fleet, each trade's van built from
 * its drawings (vans.ts). Each van lends its headlight pool to the evening's
 * light pool through `emitters`, and eases out round the parked vehicles.
 * `build` makes one more of the fleet's vans, of a given trade, from the same
 * drawings (the professional's own van, drive.ts).
 */
function buildTraffic(
  root: THREE.Group,
  loader: THREE.TextureLoader,
  ticking: TickFn[],
  emitters: LightEmitter[],
  parked: readonly ParkedSpot[],
): { vans: Van[]; build: (slot: FleetSlot, trade: FleetTrade) => Van } {
  const day = isDaytime();
  const textures = { wordmark: wordmark(), glow: glow() };
  // One load per drawing, shared by every van of that trade; each van is laid
  // out again when one of its drawings arrives.
  const drawings = new Map<WorldAssetId, { texture: THREE.Texture; ready: Array<() => void> }>();
  const drawing = (id: WorldAssetId, onReady: () => void): THREE.Texture => {
    let entry = drawings.get(id);
    if (!entry) {
      const ready: Array<() => void> = [];
      const texture = loader.load(worldAssetUrl(id), () => {
        for (const f of ready) f();
      });
      entry = { texture, ready };
      drawings.set(id, entry);
    }
    entry.ready.push(onReady);
    return entry.texture;
  };

  const build = (slot: FleetSlot, trade: FleetTrade): Van => {
    const sideId = `fleet_${trade}_side` in WORLD_ASSETS ? (`fleet_${trade}_side` as WorldAssetId) : "parked_van_side";
    const refit = () => van.fit(imageAspect(side));
    const side = drawing(sideId, refit);
    const van: Van = createVan(
      slot,
      {
        front: drawing(`fleet_${trade}_front` as WorldAssetId, refit),
        back: drawing(`fleet_${trade}_back` as WorldAssetId, refit),
        side,
      },
      textures,
      { day, trade },
    );
    return van;
  };

  const vans: Van[] = [];
  for (const slot of fleetSchedule()) {
    const van = build(slot, fleetTrade(slot.z, slot.dir));
    root.add(van.group);
    emitters.push(van.light);
    vans.push(van);
  }

  ticking.push((dt, elapsed) => {
    for (const van of vans) van.tick(dt, elapsed, parked);
  });

  return { vans, build };
}

function buildSky(scene: THREE.Scene, day: boolean): void {
  // The gradient itself is the scene's background (createWorldScene), out of
  // the fog's reach. What stands in it is past the fog too: at 170 m the
  // evening haze would leave 1% of a star.
  if (!day) {
    const starCount = 420;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.4;
      const r = 170;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    // The demo's stars: cool white, a little larger, unfogged.
    const starMat = new THREE.PointsMaterial({
      color: 0xcfd4ff,
      size: 0.9,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      fog: false,
    });
    scene.add(new THREE.Points(starGeo, starMat));
  }

  if (!day) {
    const towerCount = 44;
    const towerPositions: THREE.Vector3[] = [];
    for (let i = 0; i < towerCount; i++) {
      const angle = (i / towerCount) * Math.PI * 2;
      const dist = 120 + Math.random() * 40;
      towerPositions.push(new THREE.Vector3(
        Math.cos(angle) * dist,
        4 + Math.random() * 12,
        Math.sin(angle) * dist,
      ));
    }
    for (const pos of towerPositions) {
      const tw = 1.5 + Math.random() * 3;
      const th = 6 + Math.random() * 14;
      const tower = new THREE.Mesh(
        new THREE.PlaneGeometry(tw, th),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(0.7, 0.15, 0.04 + Math.random() * 0.03),
          transparent: true,
          opacity: 0.6,
          depthWrite: false,
        }),
      );
      tower.position.copy(pos);
      tower.lookAt(0, pos.y, 0);
      scene.add(tower);
    }
  }
}

export function createWorldScene({
  renderer,
  scene,
  camera,
  model: initialModel,
  onEvent,
}: WorldSceneFactoryArgs): WorldSceneHandle {
  const day = isDaytime();
  // The arrival screen stays up until the street's art is in (WorldCanvas).
  // Later loads (a shop's room) finish the manager again; only the first counts.
  let artReady = false;
  const artListeners: Array<() => void> = [];
  const manager = new THREE.LoadingManager(() => {
    if (artReady) return;
    artReady = true;
    for (const listener of artListeners.splice(0)) listener();
  });
  const loader = new THREE.TextureLoader(manager);
  // What comes after arrival (the shops' rooms) loads outside the manager.
  const roomLoader = new THREE.TextureLoader();
  let disposed = false;
  const root = new THREE.Group();
  scene.add(root);

  const coarse = window.matchMedia?.("(pointer: coarse)").matches === true || window.innerWidth < 768;
  const ticking: TickFn[] = [];

  const lighting = WORLD_LIGHTING[day ? "day" : "night"];
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = lighting.exposure;
  // Day and evening: the sun's (or the moon's) shadows, as in the demo.
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  camera.fov = 72;
  camera.near = 0.1;
  camera.far = 400;
  camera.updateProjectionMatrix();

  scene.fog = new THREE.FogExp2(lighting.fog.colour, lighting.fog.density);
  renderer.setClearColor(lighting.fog.colour);
  const skyBackground = skyTexture(day ? "day" : "night");
  const previousBackground = scene.background;
  scene.background = skyBackground;

  buildSky(scene, day);

  const hemi = new THREE.HemisphereLight(
    lighting.hemisphere.sky,
    lighting.hemisphere.ground,
    lighting.hemisphere.intensity,
  );
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(lighting.sun.colour, lighting.sun.intensity);
  configureSunShadow(sun);
  scene.add(sun, sun.target);
  const sunFocus = new THREE.Vector3();
  const cameraDirection = new THREE.Vector3();
  const viewerLocal = new THREE.Vector3();

  const { lamps, emitters, canopies, parked, shopCarcass, roofPiece } = buildStreetGeometry(root, scene, loader, ticking, camera);
  buildWalkers(root, loader, ticking);
  const traffic = buildTraffic(root, loader, ticking, emitters, parked);

  const LAMP_TINT_RANGE = 14;

  const tintPlayerFromLamps = () => {
    if (day || lamps.length === 0) return;
    let closest = Infinity;
    for (const lamp of lamps) {
      const d = Math.hypot(lamp.x - player.x, lamp.z - player.z);
      if (d < closest) closest = d;
    }
    const k = Math.min(1, closest / LAMP_TINT_RANGE);
    const warm = new THREE.Color("#ffeedd");
    const cool = new THREE.Color("#b8b0c8");
    const tint = warm.lerp(cool, k);
    const mat = player.group.material as THREE.SpriteMaterial;
    mat.color.copy(tint);
  };

  // By day there is no pool: the demo's lamps are on at a fifth in the
  // morning, which nobody sees, and ten lights would cost every pixel.
  const lightPool = day ? [] : createLightPool(root);
  let lendClock = LEND_INTERVAL_S;
  const lendEveningLights = (dt: number) => {
    if (lightPool.length === 0) return;
    lendClock += dt;
    if (lendClock < LEND_INTERVAL_S) return;
    lendClock = 0;
    lendLights(lightPool, emitters, camera.position);
  };

  /* ---------- shop facades (prefer shop_* art over district_*) ---------- */
  const shopGlow = glow();
  const shopFronts: ShopFront[] = [];
  // Each sign's light follows its facade's height once the drawing is in.
  const signLights = new Map<ShopFront, LightEmitter>();
  // Shops you can see into (shopWindow.ts): their rooms are fetched once the
  // street is in, nearest first, and each window opens when its room arrives.
  const seeInto: Array<{ shop: (typeof WORLD_SHOPS)[number]; open(): void }> = [];
  const windows: Array<{ group: THREE.Group; seen: ShopWindow }> = [];
  // Each shop's room art, fetched once: the window shows it from the street,
  // and walking in builds the room from the same textures (boxRoom.ts).
  const roomArts = new Map<string, Promise<RoomArt | null>>();
  const roomArt = (shopId: string): Promise<RoomArt | null> => {
    const known = roomArts.get(shopId);
    if (known) return known;
    const ids = roomArtIds(shopId, ROOM_PROPS[shopId] ?? 0);
    // Not through the arrival's manager: the street is already up.
    const pieces = ids.map(
      (id) =>
        new Promise<THREE.Texture | null>((resolve) => {
          if (!(id in WORLD_ASSETS)) return resolve(null);
          roomLoader.load(worldAssetUrl(id as WorldAssetId), resolve, undefined, () => resolve(null));
        }),
    );
    const art = Promise.all(pieces).then(([back, left, right, floor, ...props]): RoomArt | null =>
      back
        ? { back, left: left ?? null, right: right ?? null, floor: floor ?? null, props: props.filter((p): p is THREE.Texture => Boolean(p)) }
        : null,
    );
    roomArts.set(shopId, art);
    return art;
  };
  const frontByShop = new Map<string, ShopFront>();
  for (const shop of WORLD_SHOPS) {
    const shopArtId = `shop_${shop.shopId}` as WorldAssetId;
    const usesShopArt = shopArtId in WORLD_ASSETS;
    const facadeId = usesShopArt ? shopArtId : (shop.assetId as WorldAssetId);
    const spec = usesShopArt ? SHOP_WINDOWS[shop.shopId] : undefined;
    // The drawing as a lit wall at its own proportions, dressed as the demo's
    // (shopFront.ts); it is sized to the drawing once the drawing is in.
    let drawingIn = false;
    const drawing: THREE.Texture = loader.load(worldAssetUrl(facadeId), (loaded) => {
      const image = loaded.image as { width?: number; height?: number } | undefined;
      if (image?.width && image.height) {
        front.fit(image.width / image.height);
        const h = facadeSize(image.width / image.height).h;
        carcass.fit(h);
        signLights.get(front)?.position.setY(h + ROOF_SIGN.above - ROOF_SIGN.light.below);
      }
      drawingIn = true;
      if (spec) {
        // The demo's redrawn shops carry a tank and an aerial on the roof.
        const { w, h } = front.size();
        for (const [pick, height, side] of [
          [0, 1.9, -1],
          [3, 1.5, 1],
        ] as const) {
          const holder = new THREE.Group();
          holder.position.set(side * w * 0.22, h - 0.1, -1.2);
          holder.add(roofPiece(pick, height));
          front.group.add(holder);
        }
      }
    });
    drawing.colorSpace = THREE.SRGBColorSpace;
    const front = createShopFront(shop, drawing, shopGlow, { day, seeInto: Boolean(spec) });
    // The block the shop stands in, behind its drawing (terrace.ts).
    const carcass = createShopCarcass(shopCarcass);
    front.group.add(carcass.mesh);
    shopFronts.push(front);
    frontByShop.set(shop.shopId, front);
    root.add(front.group);
    // Its sign's colour on the wet road in front of it.
    buildSignWet(root, shop, shopGlow);

    if (spec) {
      seeInto.push({
        shop,
        open() {
          void roomArt(shop.shopId).then((art) => {
            if (disposed || !art || !drawingIn) return;
            const punched = punchWindow(drawing, spec);
            if (!punched) return;
            const { w, h } = front.size();
            const seen = createShopWindow(
              spec,
              w,
              h,
              art,
              shopGlow,
              shop.neonColour,
            );
            front.setDrawing(punched);
            front.group.add(seen.group, carcass.openWindow(seen.hole));
            windows.push({ group: front.group, seen });
          });
        },
      });
    }

    if (!day) {
      // The shop's warm light on its own pavement, and its sign's colour from
      // the flat sign over the front, as the demo's (85 cd over 16 m).
      const spill = EVENING_LIGHT.shopSpill;
      emitters.push(
        emitter(shop.x - shop.side * spill.out, spill.height, shop.z, spill.colour, spill.intensity, spill.distance),
      );
      const { light } = ROOF_SIGN;
      const signLight = emitter(shop.x - shop.side * light.out, facadeSize(1).h + ROOF_SIGN.above - light.below, shop.z, shop.neonColour, light.intensity, light.distance);
      emitters.push(signLight);
      signLights.set(front, signLight);
    }
  }

  const openWindows = () => {
    const byDistance = [...seeInto].sort((a, b) => Math.abs(a.shop.z - SPAWN.z) - Math.abs(b.shop.z - SPAWN.z));
    for (const { open } of byDistance) open();
  };
  if (artReady) openWindows();
  else artListeners.push(openWindows);

  const walkTextures: THREE.Texture[] = [];
  const runTextures: THREE.Texture[] = [];
  for (let i = 1; i <= 8; i++) {
    const wId = `avatar_amit_walk_0${i}` as WorldAssetId;
    const rId = `avatar_amit_run_0${i}` as WorldAssetId;
    if (wId in WORLD_ASSETS) walkTextures.push(loadTexture(loader, wId));
    if (rId in WORLD_ASSETS) runTextures.push(loadTexture(loader, rId));
  }

  const player: PlayerState = createPlayer(walkTextures, runTextures);
  root.add(player.group);

  const shadow = createContactShadow();
  player.group.add(shadow);
  shadow.position.set(0, -player.group.position.y + 0.03, 0);

  /* ---------- the professional's own van, driving to you (drive.ts) ---------- */
  const marks = createDriveMarks();
  marks.group.visible = false;
  root.add(marks.group);
  const drive: { van: Van | null; trade: FleetTrade | null; span: DriveSpan | null } = {
    van: null,
    trade: null,
    span: null,
  };
  // The demo's two labels over the street: your home, and his face over his van.
  const labelHost = renderer.domElement.parentElement;
  const homeLabel = document.createElement("div");
  homeLabel.className = "world-canvas__home-label";
  homeLabel.textContent = "הבית שלך";
  homeLabel.hidden = true;
  const vanLabel = document.createElement("div");
  vanLabel.className = "world-canvas__van-label";
  vanLabel.setAttribute("role", "img");
  vanLabel.hidden = true;
  const vanFace = document.createElement("img");
  vanFace.alt = "";
  vanLabel.append(vanFace);
  labelHost?.append(homeLabel, vanLabel);
  const labelPoint = new THREE.Vector3();
  const placeLabel = (label: HTMLElement, x: number, y: number, z: number, needsInView: boolean) => {
    const at = onScreen(labelPoint.set(x, y, z), camera);
    label.style.opacity = at && (!needsInView || at.inView) ? "1" : "0";
    if (at) {
      label.style.left = `${at.left}%`;
      label.style.top = `${at.top}%`;
    }
  };

  const endDrive = () => {
    if (drive.van) {
      root.remove(drive.van.group);
      disposeObject(drive.van.group);
      const i = emitters.indexOf(drive.van.light);
      if (i >= 0) emitters.splice(i, 1);
    }
    drive.van = null;
    drive.trade = null;
    drive.span = null;
    marks.group.visible = false;
    homeLabel.hidden = true;
    vanLabel.hidden = true;
    for (const van of traffic.vans) van.group.visible = true;
  };

  /** The van, the ribbon, the light over your home and the drone over them, from the job. */
  const stepDrive = (dt: number, reducedMotion: boolean): boolean => {
    const route = model.route;
    if (model.mode !== "ROUTE" || !route || insideShopId) {
      if (drive.van) endDrive();
      return false;
    }
    const department = route.departmentCode ?? model.departmentCode;
    const trade = heroTrade(route.serviceId, department);
    if (!drive.van || drive.trade !== trade) {
      endDrive();
      const span = driveSpan(department);
      const van = traffic.build({ dir: -1, laneX: LANES.away, speed: 0, z: span.startZ }, trade);
      van.group.name = "hero-van";
      // Drawn where the job is, at once: no drive from the shop on opening the page.
      van.group.position.z = driveTarget(span, route.progress);
      root.add(van.group);
      emitters.push(van.light);
      drive.van = van;
      drive.trade = trade;
      drive.span = span;
      marks.group.visible = true;
      homeLabel.hidden = false;
      camera.position.set(4, 9, van.group.position.z + 16);
    }
    const van = drive.van!;
    const span = drive.span!;
    const was = van.group.position.z;
    const target = driveTarget(span, route.progress);
    const z = reducedMotion ? target : easeDrive(was, target, dt);
    van.placeAt(z, driveSpeed(was, z, dt, route.moving), dt, elapsed);
    const vx = van.group.position.x;
    marks.update(vx, z, span, reducedMotion ? 0 : elapsed);

    // Nobody drives through the professional's van.
    for (const other of traffic.vans) other.group.visible = !blocksHero(van.group.position, other.group.position);

    const shot = droneShot(vx, z, reducedMotion ? 0 : elapsed, route.moving);
    if (reducedMotion) camera.position.copy(shot.position);
    else camera.position.lerp(shot.position, droneFactor(dt));
    camera.lookAt(shot.look);
    camera.updateMatrixWorld();

    placeLabel(homeLabel, span.homeX, LABEL_HEIGHT.home, span.endZ, true);
    const pro = route.professional ?? null;
    if (pro?.photoUrl) {
      if (vanFace.getAttribute("src") !== pro.photoUrl) vanFace.src = pro.photoUrl;
      vanLabel.setAttribute("aria-label", `המקצוען בדרך · ${pro.nameHe}`);
      vanLabel.hidden = false;
      placeLabel(vanLabel, vx, LABEL_HEIGHT.van, z, false);
    } else {
      vanLabel.hidden = true;
    }
    return true;
  };

  // The walker as you are in a shop: the same figure, in the room's own scene.
  // The demo's figure is 1.78 m tall, as wide as its frame; drawn after the
  // shining floor, which would otherwise lie over its legs.
  const roomPlayer: PlayerState = createPlayer(walkTextures, runTextures);
  roomPlayer.group.renderOrder = 3;
  const sizeRoomPlayer = () => {
    const image = (roomPlayer.group.material as THREE.SpriteMaterial).map?.image as { width?: number; height?: number } | undefined;
    const frameAspect = image?.width && image.height ? image.width / image.height : 0.36;
    roomPlayer.group.scale.set(ROOM_FIGURE * frameAspect, ROOM_FIGURE, 1);
    roomPlayer.group.position.y = ROOM_FIGURE / 2;
  };

  let postProcessing: PostProcessingHandle | null = null;
  try {
    postProcessing = createPostProcessing(renderer, scene, camera, day, coarse);
  } catch {
    /* graceful fallback: render without post-processing */
  }
  // Too slow with the glow on (software WebGL, a weak phone)? Drop it once.
  const glowGovernor = createFrameGovernor();

  let model = initialModel;
  let lastMs = performance.now();
  let nearbyShopId: string | null = null;
  let insideShopId: string | null = null;
  let moveCommand: WorldMoveCommand = { x: 0, z: 0, sprint: false };
  let elapsed = 0;
  // The entry flight: 0 high over the street, 1 behind the walker; it runs once.
  let descend = 0;
  let leaving = false;

  // Going in and coming out (shopEntry.ts): a scripted move on the wall clock.
  type DoorMove = {
    shop: (typeof WORLD_SHOPS)[number];
    startedAt: number;
    dir: 1 | -1;
    from: THREE.Vector3;
    cameraFrom: THREE.Vector3;
  };
  let entry: DoorMove | null = null;
  // The shops' rooms, built the first time you walk in and kept (boxRoom.ts).
  const rooms = new Map<string, BoxRoom | null>();
  const building = new Set<string>();
  let stand: RoomStand = freshStand();
  let insideSince = 0;
  // The shop's colour over the screen as you go in; WorldCanvas draws it.
  let veil = { colour: "#ff6b4a", opacity: 0 };
  let viewing: "street" | BoxRoom = "street";
  let aspect = camera.aspect;
  const walkTo = new THREE.Vector3();
  const cameraTo = new THREE.Vector3();
  const aimTo = new THREE.Vector3();
  const aim = new THREE.Vector3();

  const buildRoom = (shopId: string) => {
    if (rooms.has(shopId) || building.has(shopId)) return;
    building.add(shopId);
    void roomArt(shopId).then((art) => {
      building.delete(shopId);
      if (disposed) return;
      const room = art ? buildBoxRoom(art) : null;
      room?.setAspect(aspect);
      rooms.set(shopId, room);
    });
  };

  const show = (view: "street" | BoxRoom) => {
    if (viewing === view) return;
    if (viewing !== "street") viewing.follow(null);
    viewing = view;
    if (view === "street") {
      postProcessing?.setView(scene, camera);
      root.visible = true;
    } else {
      view.follow(roomPlayer.group);
      postProcessing?.setView(view.scene, view.camera);
      root.visible = false;
    }
  };

  const emitNear = () => {
    const shop = nearestShop(player.x, player.z);
    const next = shop?.shopId ?? null;
    if (next === nearbyShopId) return;
    nearbyShopId = next;
    onEvent({ type: "SHOP_NEAR", shopId: next });
  };

  const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

  /** Walk in through the door of `shopId` (it must be a catalogue-backed shop with a room). */
  const goIn = (shopId: string): boolean => {
    if (entry || insideShopId) return false;
    const trade = tradeForShop(model, shopId);
    const shop = WORLD_SHOPS.find((s) => s.shopId === shopId);
    if (!trade || !shop || !canEnterTrade(trade)) return false;
    buildRoom(shopId);
    // Pressed before the first step: going in is coming down.
    descend = 1;
    leaving = true;
    const now = performance.now();
    entry = {
      shop,
      startedAt: reduced() ? now - ENTRY_MS : now,
      dir: 1,
      from: new THREE.Vector3(player.x, 0, player.z),
      cameraFrom: camera.position.clone(),
    };
    veil = { colour: shop.neonColour, opacity: 0 };
    return true;
  };

  /** And back out to the pavement: the same move with the sign flipped. */
  const goOut = () => {
    if (entry || !insideShopId) return;
    const shop = WORLD_SHOPS.find((s) => s.shopId === insideShopId);
    if (!shop) {
      insideShopId = null;
      return;
    }
    const street = streetShot(shop);
    const now = performance.now();
    entry = {
      shop,
      startedAt: reduced() ? now - ENTRY_MS : now,
      dir: -1,
      from: new THREE.Vector3(street.walker.x, 0, street.walker.z),
      cameraFrom: new THREE.Vector3(street.camera.x, street.camera.y, street.camera.z),
    };
    veil = { colour: shop.neonColour, opacity: 0 };
    show("street");
  };

  const enterShop = () => {
    if (!nearbyShopId || !goIn(nearbyShopId)) return;
    onEvent({ type: "ENTER_SHOP", shopId: nearbyShopId });
  };

  /** One frame of the walk in or out; true while it is still going. */
  const playDoorMove = (move: DoorMove, nowMs: number, dt: number): void => {
    const raw = Math.min(1, (nowMs - move.startedAt) / ENTRY_MS);
    const k = entryProgress(raw, move.dir);
    const shot = doorShot(move.shop);
    walkTo.set(shot.walkTo.x, 0, shot.walkTo.z);
    cameraTo.set(shot.camera.x, shot.camera.y, shot.camera.z);
    aimTo.set(shot.aim.x, shot.aim.y, shot.aim.z);
    frontByShop.get(move.shop.shopId)?.fadeFace(faceFade(k));

    // The walker walks it; the ground covered drives the legs, as the stick's walk does.
    const at = new THREE.Vector3().lerpVectors(move.from, walkTo, k);
    player.x = at.x;
    player.z = at.z;
    player.group.position.set(at.x, player.group.position.y, at.z);
    stepWalkCycle(player, move.from.distanceTo(walkTo) * ((dt * 1000) / ENTRY_MS));

    camera.position.lerpVectors(move.cameraFrom, cameraTo, k);
    aim.set(player.x, WALKER_AIM_Y, player.z).lerp(aimTo, k);
    lookAtNow(camera, aim.x, aim.y, aim.z);
    veil = { colour: move.shop.neonColour, opacity: entryVeil(k, move.dir) };

    if (raw < 1) return;
    // In: wait behind the shop's colour for the room, if it is still being built.
    if (move.dir > 0 && building.has(move.shop.shopId)) return;
    entry = null;
    if (move.dir > 0) {
      insideShopId = move.shop.shopId;
      insideSince = nowMs;
      stand = freshStand();
      onEvent({ type: "INSIDE_SHOP", shopId: insideShopId });
    } else {
      insideShopId = null;
      veil = { colour: move.shop.neonColour, opacity: 0 };
      onEvent({ type: "INSIDE_SHOP", shopId: null });
    }
  };

  return {
    update(nextModel) {
      model = nextModel;
      // The app says which shop you are in; the scene walks there (or back out).
      if (!entry && nextModel.shopId && !insideShopId) goIn(nextModel.shopId);
      else if (!entry && !nextModel.shopId && insideShopId) goOut();
    },
    move(command: WorldMoveCommand) {
      moveCommand = command;
    },
    enter: enterShop,
    veil: () => veil,
    render(nowMs) {
      const dt = Math.min(0.05, Math.max(0, (nowMs - lastMs) / 1000));
      elapsed += dt;

      const reducedMotion = reduced();
      if (entry) {
        show("street");
        playDoorMove(entry, nowMs, dt);
      }
      const room = !entry && insideShopId ? rooms.get(insideShopId) : undefined;
      // On the way to you the street is his drive, seen from the drone: nobody walks it.
      const driving = !entry && !room && stepDrive(dt, reducedMotion);
      player.group.visible = !driving;
      if (room) {
        // In the room: the stick turns you and steps you; pulled back at the edge, you walk out.
        show(room);
        // The stick's 200 ms cap, as on the street (#62), so a slow renderer still gets you out.
        const step = stepInRoom(stand, moveCommand, Math.min(0.2, Math.max(0, (nowMs - lastMs) / 1000)));
        stepWalkCycle(roomPlayer, step.stand.walked - stand.walked);
        sizeRoomPlayer();
        stand = step.stand;
        room.update(dt, reducedMotion ? 0 : elapsed, stand);
        veil = { colour: veil.colour, opacity: roomVeil((nowMs - insideSince) / 1000) };
        if (step.leave) {
          onEvent({ type: "LEAVE_SHOP" });
          goOut();
        }
      } else if (driving) {
        // The drone has the camera (stepDrive).
        show("street");
      } else if (!entry && !insideShopId && model.mode === "EXPLORE") {
        show("street");
        // The walk keeps its own 200 ms cap (#62): a slow renderer (SwiftShader
        // in CI at 2-3 fps) must still cover ground. Animations use the 50 ms dt.
        // The entry's descent uses it too, so it takes 1.9 s on any renderer.
        const walkDt = Math.min(0.2, Math.max(0, (nowMs - lastMs) / 1000));
        const moving = moveCommand.x !== 0 || moveCommand.z !== 0;
        if (moving) {
          leaving = true;
          movePlayer(player, moveCommand, walkDt);
          emitNear();
          tintPlayerFromLamps();
        }

        // As in the demo: the world opens high over the street and the first
        // move flies the camera down behind the walker. Standing by a shop
        // frames it; walking on brings the camera back in behind you.
        if (reducedMotion) descend = 1;
        else if (leaving && descend < 1) descend = Math.min(1, descend + walkDt / DESCENT_SECONDS);
        const nearShop = nearestShop(player.x, player.z, 6);
        const ground =
          nearShop && !moving
            ? shopPose(player.group.position, nearShop)
            : followPose(player.group.position);
        easeTowards(
          camera,
          entryPose(player.group.position, smoothstep01(descend), ground),
          followFactor(walkDt),
          reducedMotion,
        );
      } else if (!entry && !insideShopId) {
        frameStreet(camera, reducedMotion);
      } else if (!entry && insideShopId) {
        // A room that could not be built: you stand in the doorway, in the clear.
        show("street");
        veil = { colour: veil.colour, opacity: 0 };
      }

      if (viewing === "street") {
        // Ambient loops (flicker, steam, walkers, traffic) are decoration: with
        // reduced motion they hold still. The player and camera still move.
        if (!reducedMotion) for (const fn of ticking) fn(dt, elapsed);

        lendEveningLights(dt);
        // A projecting sign seen edge-on fades rather than becoming a streak.
        for (const front of shopFronts) front.face(camera.position);
        // The camera standing in a tree, the layby or a parked van: it is hidden (the demo's).
        hideCanopies(canopies, camera);
        // Behind the glass the furniture turns to you and the sheen slides.
        for (const { group, seen } of windows) {
          seen.update(group.worldToLocal(viewerLocal.copy(camera.position)), reducedMotion ? 0 : elapsed);
        }

        // The shadow box rides a few metres ahead of the camera, as in the demo.
        camera.getWorldDirection(cameraDirection);
        aimSun(sun, shadowFocus(camera.position, cameraDirection, sunFocus));
      }

      if (postProcessing && glowGovernor.record(nowMs - lastMs) === "drop") {
        postProcessing.dispose();
        postProcessing = null;
      }
      if (postProcessing) {
        postProcessing.render(nowMs);
      } else if (viewing === "street") {
        renderer.render(scene, camera);
      } else {
        renderer.render(viewing.scene, viewing.camera);
      }
      lastMs = nowMs;
    },
    resize(width: number, height: number) {
      postProcessing?.resize(width, height);
      aspect = width / Math.max(1, height);
      for (const room of rooms.values()) room?.setAspect(aspect);
    },
    onArtReady(listener: () => void) {
      if (artReady) listener();
      else artListeners.push(listener);
    },
    dispose() {
      disposed = true;
      show("street");
      homeLabel.remove();
      vanLabel.remove();
      disposeObject(root);
      for (const room of rooms.values()) room?.dispose();
      rooms.clear();
      disposeObject(roomPlayer.group);
      scene.remove(hemi, sun, sun.target, root);
      sun.dispose();
      scene.background = previousBackground;
      skyBackground.dispose();
      postProcessing?.dispose();
    },
  };
}
