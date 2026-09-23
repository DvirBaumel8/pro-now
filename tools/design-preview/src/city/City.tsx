import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { buildPlayer } from "./player";
import { SPONSOR_BADGE_HE, sponsorCtaHe, sponsorLeaveHe } from "@pro-now/types";

import { PREVIEW_SPONSORS } from "../sponsors";
import { buildStreet, FRONT_X, SPAWN, STREET_LENGTH, WALK_LIMIT, type ShopSpec } from "./street";

/**
 * THE CITY, AND THE CAMERA THAT LIVES IN IT.
 *
 * ---------------------------------------------------------------------
 * THE CAMERA IS THE POINT
 * ---------------------------------------------------------------------
 * Amit, of the painted world: *"זווית המצלמה ככ ישנה."* He was right in
 * the most literal way available — there was no camera. A painting has
 * one viewpoint, the one it was painted from, and every "camera move"
 * was a crop of it.
 *
 * Here the camera is an object in the world. It sits behind and above
 * the figure, it is dragged around them, it leans into a turn, and it
 * eases rather than snapping — which is the whole difference between a
 * character you are following and a sprite you are pushing.
 */

/*
 * THE HIGH STREET.
 *
 * Eleven bays, alternating sides, twenty-three metres apart — which is
 * every other building, so the street between them is ordinary city
 * and the shops are what you notice in it.
 *
 * The first build used seven of the ten districts that have been
 * drawn. There was no reason for the other three except that the
 * array had been typed out once and never revisited, and a trade with
 * finished artwork and nowhere to stand is the same fault this
 * project has caught a dozen times: work delivered and never
 * connected. `art-delivery.test.ts` exists to catch it on the map;
 * nothing was watching here.
 *
 * `interior` is only set where a room has actually been painted. A
 * shop without one is a door you cannot go through yet, which is the
 * truth, and better than sending everybody into the same borrowed room.
 */
const SHOPS: ShopSpec[] = [
  { id: "hair",      he: "טיפוח ויופי",    facade: "district_hair.webp",      z:   92, side: -1, interior: "hair_barbershop_hero.webp", neonColour: "#ff7ac2" },
  { id: "pets",      he: "בעלי חיים",      facade: "district_pets.webp",      z:   69, side:  1, interior: "pets_salon_hero.webp",      neonColour: "#8ce06a" },
  { id: "home",      he: "תיקונים דחופים", facade: "district_home.webp",      z:   46, side: -1, interior: "home_workshop_hero.webp",   neonColour: "#ffb45e" },
  { id: "lust",      he: "Lust",           facade: "sponsor_lust_venue.webp", z:   23, side:  1, interior: "sponsor_lust_hero.webp",    sponsor: true, neonColour: "#ff3d63" },
  { id: "tech",      he: "מחשבים וסלולר",  facade: "district_tech.webp",      z:    0, side: -1, neonColour: "#7ad7ff" },
  { id: "auto",      he: "רכב ודרך",       facade: "district_auto.webp",      z:  -23, side:  1, interior: "auto_garage_hero.webp",     neonColour: "#ff9b3d" },
  { id: "well",      he: "בריאות וכושר",   facade: "district_well.webp",      z:  -46, side: -1, neonColour: "#6affc6" },
  { id: "appliance", he: "מוצרי חשמל",     facade: "district_appliance.webp", z:  -69, side:  1, interior: "appliance_workshop_hero.webp", neonColour: "#ffd166" },
  { id: "care",      he: "ניקיון ותחזוקה", facade: "district_care.webp",      z:  -92, side: -1, interior: "care_studio_hero.webp",     neonColour: "#9db8ff" },
  { id: "nails",     he: "ציפורניים",      facade: "district_nails.webp",     z: -115, side:  1, neonColour: "#ff6fa8" },
  { id: "move",      he: "הובלות ומשלוחים", facade: "district_move.webp",     z: -138, side: -1, neonColour: "#c39bff" },
];

const WALK = Array.from({ length: 8 }, (_, i) => `avatar_amit_walk_0${i + 1}.webp`);
const RUN = Array.from({ length: 8 }, (_, i) => `avatar_amit_run_0${i + 1}.webp`);

export interface CityProps {
  /** Where the art lives, so the same component works in the app. */
  base?: string;
  /** Where to stand at the start. Only the gallery passes this. */
  spawn?: { x?: number; z?: number };
  onExit?: () => void;
}

export function City({ base = "./world/", spawn, onExit }: CityProps) {
  const host = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [nearName, setNearName] = useState<string | null>(null);
  const [nearId, setNearId] = useState<string | null>(null);
  const [room, setRoom] = useState<ShopSpec | null>(null);
  /* 0 while you are on the street, 1 at the moment the door opens. */
  const [veil, setVeil] = useState(0);
  /* True while a scripted camera move owns the screen. */
  const [walking, setWalking] = useState(false);
  const [hint, setHint] = useState(true);
  /* True while the street is still being looked at from above. */
  const [arriving, setArriving] = useState(true);
  const nearTint =
    (nearId ? SHOPS.find((x) => x.id === nearId)?.neonColour : null) ?? "#FF6B4A";
  useEffect(() => {
    const t = window.setTimeout(() => setHint(false), 5200);
    return () => window.clearTimeout(t);
  }, []);

  /*
   * THE HANDOVER.
   *
   * The walk-in ends with the brand's colour over the whole screen and
   * the room opening underneath it. If the veil simply stayed, the
   * room arrived behind a flat wall of magenta; if the room painted
   * its own black background first, there was a black beat between the
   * colour and the picture — which is the cut this whole sequence
   * exists to avoid, reintroduced one layer further in.
   *
   * So the colour is cleared the moment the room mounts and both
   * cross-fade: the veil out, the picture in, over the same half
   * second. What you see is the colour becoming the shop.
   */
  useEffect(() => {
    if (!room) return;
    const t = window.setTimeout(() => setVeil(0), 40);
    return () => window.clearTimeout(t);
  }, [room]);
  const enterRef = useRef<(() => void) | null>(null);
  const leaveRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    let disposed = false;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    /* Nothing casts any more — see the moon in street.ts. Leaving the
       map enabled costs a depth pass for an empty result. */
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    /*
     * EXPOSURE IS HALF OF THE LIGHTING, AND IT IS THE HALF THAT LIES.
     *
     * It was at 1.45 to rescue a scene whose lights were a hundred
     * times too weak (see street.ts on physical units). With the
     * lights corrected, the same 1.45 turned the pavement into a
     * beach. At 1.0 the tone map does what it is for — rolling the
     * bright pools off instead of clipping them white — and leaves
     * the stone between the lamps dark, which is where the night is.
     */
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    const loader = new THREE.TextureLoader();
    const load = (f: string) =>
      new Promise<THREE.Texture>((res, rej) => loader.load(base + f, res, undefined, rej));

    let stop = () => {};

    (async () => {
      const facades: Record<string, THREE.Texture | undefined> = {};
      await Promise.all(
        SHOPS.map(async (s) => {
          try {
            facades[s.facade] = await load(s.facade);
          } catch {
            /* A shop with no drawing is a volume with no face, which is
               honest — see `DistrictLayer` for why nothing stands in. */
          }
        })
      );
      const walk = await Promise.all(WALK.map(load));
      const run = await Promise.all(RUN.map(load)).catch(() => walk);
      if (disposed) return;

      const street = buildStreet(SHOPS, facades);
      const player = buildPlayer(walk, run, 1.78);
      street.scene.add(player.group);
      /* Facing down the street, on the right-hand pavement, with the
         first shopfront a short walk ahead rather than underfoot.
         `spawn` exists so a screenshot can be taken standing in front
         of one particular shop without walking there for two minutes;
         it is a developer-gallery affordance and nothing reads it in
         the app. */
      /*
       * `SPAWN` lives in street.ts because the crowd has to know it too
       * — see the note there. Twenty-six metres in was the empty top of
       * the street: you landed between two lamps with dark pavement
       * ahead and the first sign forty metres off. This opens on a lit
       * shopfront with its blade sign over the pavement.
       */
      player.group.position.set(spawn?.x ?? SPAWN.x, 0, spawn?.z ?? SPAWN.z);

      /* The street collected these as it built them. Traversing for
         point lights used to miss the ones inside groups that had not
         had their world matrices updated yet, and returned the origin
         for them — every figure tinted as if a lamp stood at 0,0. */
      const lamps = street.lamps;

      const camera = new THREE.PerspectiveCamera(52, el.clientWidth / el.clientHeight, 0.1, 400);

      /* ----- controls ----- */
      let yaw = Math.PI, pitch = 0.26;
      /* The camera's head, turned toward whatever shop you are beside. */
      let look = 0;

      /*
       * -----------------------------------------------------------
       * THE ARRIVAL SHOT
       * -----------------------------------------------------------
       * Amit: *"בא לי שכבר פה יראו את העולם החדש התלת־מימדי שלנו, רק
       * בזווית זום אאוט, ואז יהיה אפשר להתקרב פנימה — לא שיצטרכו
       * לעבור למסך אחר של מציאות מדומה. ושמתחילים ללכת, המצלמה זזה
       * לכיוון המבט שהיה עכשיו."*
       *
       * He is right and the reason is not photography. A separate
       * screen for the 3D world says "here is another feature". The
       * world opening as the screen itself says "this is the place".
       *
       * So the street arrives from above — high enough to see the
       * lights strung across the road, the traffic, the neon down
       * both sides — and the first touch of the stick flies the
       * camera down into the third-person view behind the walker.
       * One continuous move; nothing loads, nothing cuts.
       *
       * `descend` is 0 up there and 1 down here, and it only ever
       * travels once.
       */
      const WIDE = { dist: 38, hgt: 26 };
      let descend = 0;
      let leaving = false;
      const stick = { x: 0, y: 0 };
      let walked = 0;

      const onStick = (x: number, y: number) => {
        stick.x = x;
        stick.y = y;
      };
      (el as unknown as { __stick?: typeof onStick }).__stick = onStick;

      let dragging = false, lastX = 0, lastY = 0;
      const down = (e: PointerEvent) => {
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
      };
      const move = (e: PointerEvent) => {
        if (!dragging) return;
        yaw -= (e.clientX - lastX) * 0.0055;
        pitch = Math.max(0.05, Math.min(0.75, pitch + (e.clientY - lastY) * 0.0035));
        lastX = e.clientX;
        lastY = e.clientY;
      };
      const up = () => { dragging = false; };
      renderer.domElement.addEventListener("pointerdown", down);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);

      /* -----------------------------------------------------------
         GOING IN

         Amit: *"שגם הכניסה לחנות תהיה מרשימה."* It was a state change
         — press a button, the street is replaced by a photograph. A
         cut is the one camera move that tells you nothing, and the
         painted world could only ever cut, because it had no camera.

         This one walks you in. For a second and a half the stick is
         ignored, the figure walks the last few metres to the door on
         its own, and the camera comes down off the follow rig, swings
         round to face the shopfront and pushes in until the door
         fills the frame. The brand's own colour rises over the last
         third of it, and the room opens out of that colour rather
         than out of a black cut.

         Coming back out plays the same move backwards, which is why
         `dir` exists rather than two scripted sequences.
         ----------------------------------------------------------- */
      const ENTRY_MS = 1500;
      let entry: {
        shop: (typeof street.shops)[number];
        /*
         * THE WALL CLOCK, NOT THE FRAME COUNTER.
         *
         * This was accumulating the loop's own `dt`, which is clamped
         * at 50ms so that one slow frame cannot teleport the player
         * through a wall. That clamp is right for movement and wrong
         * for a cinematic: on a heavy frame the scene loses 16ms of
         * real time and the sequence does not know it. Measured in the
         * browser, a second-and-a-half walk-in was taking six seconds,
         * because the street renders at roughly a quarter of the rate
         * the number assumed.
         *
         * A scripted move belongs to the viewer's clock, so it reads
         * the clock.
         */
        startedAt: number;
        dir: 1 | -1;
        from: THREE.Vector3;
        aimFrom: THREE.Vector3;
      } | null = null;

      /* ----- loop ----- */
      let raf = 0;
      let last = performance.now();
      const camPos = new THREE.Vector3();
      const aim = new THREE.Vector3();
      const doorAim = new THREE.Vector3();
      const doorCam = new THREE.Vector3();
      const walkTo = new THREE.Vector3();
      let lastNear: string | null = null;

      const tick = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;

        if (entry) {
          const raw = Math.min(1, (now - entry.startedAt) / ENTRY_MS);
          /* smoothstep: a linear push-in reads as a slide, not a step. */
          const k0 = raw * raw * (3 - 2 * raw);
          const k = entry.dir > 0 ? k0 : 1 - k0;
          const shop = entry.shop;

          /* Where the door is, and where a person stands to open it. */
          const wall = FRONT_X * shop.side;
          doorAim.set(wall, 3.4, shop.doorway.z);
          /* Six metres off the wall, not four and a half: at four and a
             half the facade filled the frame edge to edge and the
             figure walking into it was half out of shot. */
          doorCam.set(wall - shop.side * 6.4, 2.5, shop.doorway.z + 3.6);
          walkTo.set(wall - shop.side * 1.9, 0, shop.doorway.z);

          player.group.position.lerpVectors(entry.from, walkTo, k);
          /* Ground covered drives the cycle, so the legs match the
             walk-in for free — the same rule as the stick. */
          walked += entry.from.distanceTo(walkTo) * (dt * 1000 / ENTRY_MS);

          player.setDistance(walked, false);
          player.light(lamps);
          /* Turned to face the shop, so you see him go in. */
          player.group.rotation.y = Math.atan2(-shop.side, 0) + Math.PI / 2;

          camera.position.lerpVectors(entry.aimFrom, doorCam, k);
          aim.lerpVectors(
            new THREE.Vector3(
              player.group.position.x,
              2.5,
              player.group.position.z
            ),
            doorAim,
            k
          );
          camera.lookAt(aim);

          /* The brand's colour, last third only. */
          setVeil(Math.min(1, Math.max(0, (k - 0.6) / 0.34)));

          street.update(dt, now / 1000, camera);
          renderer.render(street.scene, camera);

          if (raw >= 1) {
            if (entry.dir > 0) {
              setRoom(shop as ShopSpec);
            } else {
              setVeil(0);
              /* Put the follow rig where the scripted camera left it,
                 so control resumes without a jump. */
              yaw = Math.atan2(-shop.side, 0) + Math.PI / 2;
            }
            entry = null;
          }
          raf = requestAnimationFrame(tick);
          return;
        }

        const push = Math.hypot(stick.x, stick.y);
        const running = push > 0.75;
        if (push > 0.08) leaving = true;
        if (leaving && descend < 1) {
          descend = Math.min(1, descend + dt / 1.9);
          if (descend >= 1) setArriving(false);
        }
        /* Smoothstepped, so the drop eases out rather than arriving
           at speed and stopping dead. */
        const k = descend * descend * (3 - 2 * descend);

        if (push > 0.08 && descend > 0.35) {
          const speed = running ? 5.6 : 2.6;
          const fx = Math.sin(yaw), fz = Math.cos(yaw);
          /*
           * SIDEWAYS WAS MIRRORED, AND HERE IS THE ARITHMETIC.
           *
           * Amit: *"הגויסטיק הפוך, ימינה זה שמאל ושמאלה זה ימינה."*
           *
           * Forward is f = (sin yaw, cos yaw), and the camera looks
           * along +f. Screen-right is therefore cross(f, up), which
           * for f = (fx, 0, fz) and up = (0,1,0) comes out
           * r = (-fz, 0, fx) — note the MINUS on the x term.
           *
           * The old line had `+stick.x * fz` and `-stick.x * fx`, i.e.
           * exactly -r. At the starting heading (yaw = PI, walking down
           * -Z) that sends a rightward push to -X, which is the left of
           * the screen. Every step sideways went the wrong way.
           *
           * It survived because nothing in the scene is symmetrical
           * enough to make it obvious from a screenshot, and because
           * you mostly walk forwards. It took somebody actually
           * holding the stick.
           */
          const dx = (-stick.y * fx - stick.x * fz) * speed * dt;
          const dz = (-stick.y * fz + stick.x * fx) * speed * dt;
          const p = player.group.position;
          /* Wall to wall. Crossing the road is a thing you may do —
             the previous clamp kept you on one pavement, which made
             half the shops in the world literally unreachable. */
          p.x = Math.max(-WALK_LIMIT, Math.min(WALK_LIMIT, p.x + dx));
          p.z = Math.max(-STREET_LENGTH / 2 + 6, Math.min(STREET_LENGTH / 2 - 6, p.z + dz));
          walked += Math.hypot(dx, dz);
        }
        player.setDistance(walked, running);
        player.light(lamps);

        /* Which shop you are beside, before the camera, because the
           camera now needs to know. */
        let best: (typeof street.shops)[number] | null = null;
        /* Nine metres: at seven, standing directly under Lust's own
           sign with its doorway in frame was still "not near a shop". */
        let bd = 9;
        for (const s of street.shops) {
          const d = s.doorway.distanceTo(player.group.position);
          if (d < bd) { bd = d; best = s; }
        }

        /*
         * -----------------------------------------------------------
         * LOOKING AT THE SHOP YOU ARE WALKING PAST
         * -----------------------------------------------------------
         * Amit, on the street itself: *"פה צריך שיהיה אפשר להסתכל
         * לחנות."*
         *
         * He is describing something the camera could not do. It
         * pointed exactly where you walk, and the shops are at right
         * angles to that — so a shopfront was only ever in the corner
         * of the frame, and the one way to face it was to turn, which
         * also turns your feet into the wall.
         *
         * A real person walking a high street does not turn their body
         * to look in a window; they turn their head. So the camera
         * gets a head: `look`, an angle added to the camera's yaw and
         * to nothing else. Your heading, your stick and your feet are
         * untouched by it.
         *
         * It aims at the middle of the facade, not at the doorway, so
         * what you get is the SHOP rather than the pavement in front
         * of it. It comes on with proximity, so it is a drift and not
         * a snap, and it holds back to less than half while you are
         * moving — at a walk you glance, and only when you stop does
         * the camera settle on the window.
         *
         * Clamped to 0.85 radians, about fifty degrees, for a reason
         * that is about the artwork and not about taste: the figure is
         * a BACK-VIEW drawing on a plane that turns to face the
         * camera. Past roughly fifty degrees you are looking at
         * somebody's back while they walk sideways, and the illusion
         * that held the whole scene together comes apart.
         */
        let lookWant = 0;
        if (best) {
          const wallX = FRONT_X * best.side;
          let d =
            Math.atan2(
              wallX - player.group.position.x,
              best.doorway.z - player.group.position.z
            ) - yaw;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          const near = Math.max(0, Math.min(1, (9 - bd) / 4.5));
          lookWant =
            Math.max(-0.85, Math.min(0.85, d)) * near * (push > 0.08 ? 0.42 : 1);
        }
        /* Frame-rate independent easing, and slow: the drift is the
           point. Snapping to a shop as you pass reads as a bug. */
        look += (lookWant - look) * (1 - Math.pow(0.02, dt));

        const camYaw = yaw + look;

        /*
         * ---------------------------------------------------------
         * WHICH SIDE OF THE WALKER THE CAMERA STANDS ON
         * ---------------------------------------------------------
         * Forward is f = (sin yaw, cos yaw) — that is the vector the
         * stick moves you along, so it is the definition of forward
         * and everything else has to agree with it.
         *
         * A third-person camera stands BEHIND you, at p - f·dist, and
         * looks AHEAD, at p + f·ahead. The first version had both
         * signs the other way: the camera stood in front of the
         * walker looking back down the street at him.
         *
         * On screen that is almost convincing, which is why it
         * survived three rounds of screenshots. The figure is a
         * back-view drawing on a plane that turns to face the camera,
         * so he still appeared to walk away — but he was walking away
         * from the shops, and every screenshot framed the empty end of
         * the street. There was nothing wrong with the lighting of the
         * shopfronts. They were behind the lens.
         *
         * The plane's normal is +Z, so to face a camera that is now at
         * -f it must be turned by yaw + PI. It follows the CAMERA's
         * yaw, not the walking heading — a billboard has to face where
         * the lens actually is, and since `look` moved the lens those
         * are no longer the same angle. DoubleSide costs nothing on
         * one quad and makes the figure immune to getting this wrong
         * again — a culled back face is an invisible character, which
         * is a very expensive way to find a sign error.
         */
        player.group.rotation.y = camYaw + Math.PI;

        const wide = WIDE.dist + (6.2 + pitch * 3.0 - WIDE.dist) * k;
        const fx = Math.sin(camYaw), fz = Math.cos(camYaw);

        /*
         * -----------------------------------------------------------
         * THE CAMERA MUST NOT GO THROUGH THE WALL
         * -----------------------------------------------------------
         * Found on an emulated phone, by swiping: turn far enough and
         * the camera — which sits six metres BEHIND you — ends up
         * inside the terrace, and the screen fills with the black
         * inside face of a building.
         *
         * This street is a corridor with walls at x = ±FRONT_X, which
         * makes the fix arithmetic rather than physics. The camera is
         * at p.x - fx·d, so the largest d that keeps it inside is
         * solvable directly, and the camera slides in towards you
         * instead of through the brickwork.
         *
         * A floor of 2.4m, because a camera that collapses onto the
         * back of the character's head is its own kind of broken.
         */
        const WALL = FRONT_X - 0.5;
        let dist = wide;
        /* Only once the camera is down among the buildings. Above the
           roofline there is no wall to hit, and clamping up there
           would yank the arrival shot in to three metres. */
        if (descend > 0.7 && Math.abs(fx) > 0.001) {
          const room =
            fx > 0
              ? (player.group.position.x + WALL) / fx
              : (WALL - player.group.position.x) / -fx;
          dist = Math.max(2.4, Math.min(dist, room));
        }

        /*
         * -----------------------------------------------------------
         * HEIGHT AND AIM FOLLOW THE DISTANCE, OR THE WALL LOSES YOU
         * -----------------------------------------------------------
         * Height was a constant 3.6m and the aim a constant 11m ahead,
         * which frames correctly at the resting distance and nowhere
         * else. The moment the wall clamp above pulled the camera in
         * to 3.1m, the camera was still three and a half metres up and
         * still looking eleven metres down the street — so the figure,
         * who is 1.78m and right underneath it, went off the BOTTOM of
         * the screen. Measured by projecting him: ndc.y = -1.52, where
         * anything past -1 is off the edge.
         *
         * Turning to look at a shop made the character disappear, and
         * no screenshot of a stationary camera would ever have shown
         * it.
         *
         * So both are proportional to the distance: come closer and
         * the camera comes DOWN towards eye level and looks less far
         * ahead, which is what a person does. The angles then stay
         * roughly constant — measured, the figure sits between -0.53
         * and -0.61 of the frame at every distance instead of
         * wandering off it.
         */
        const hgt = WIDE.hgt + (1.2 + dist * 0.33 - WIDE.hgt) * k;
        const ahead = dist * 1.55 * (0.45 + 0.55 * k);
        camPos.set(
          player.group.position.x - fx * dist,
          hgt,
          player.group.position.z - fz * dist
        );
        camera.position.lerp(camPos, 1 - Math.pow(0.002, dt));
        aim.set(
          player.group.position.x + fx * ahead,
          (1.1 + dist * 0.16) * k + 2.6 * (1 - k),
          player.group.position.z + fz * ahead
        );
        camera.lookAt(aim);

        street.update(dt, now / 1000, camera);
        const id = best ? best.id : null;
        if (id !== lastNear) {
          lastNear = id;
          setNearId(id);
          setNearName(best ? (best.sponsor ? `${best.he} · בחסות` : best.he) : null);
          enterRef.current =
            best?.interior
              ? () => {
                  if (entry) return;
                  entry = {
                    shop: best!,
                    startedAt: performance.now(),
                    dir: 1,
                    from: player.group.position.clone(),
                    aimFrom: camera.position.clone(),
                  };
                }
              : null;
        }

        renderer.render(street.scene, camera);
        raf = requestAnimationFrame(tick);
      };
      /* Coming back out is the same move with the sign flipped. */
      leaveRef.current = () => {
        const shop = street.shops.find((x) => x.id === lastNear);
        if (!shop) return;
        const wall = FRONT_X * shop.side;
        entry = {
          shop,
          startedAt: performance.now(),
          dir: -1,
          from: new THREE.Vector3(wall - shop.side * 5.2, 0, shop.doorway.z + 1.4),
          aimFrom: new THREE.Vector3(wall - shop.side * 7.4, 3.0, shop.doorway.z + 5.4),
        };
      };

      raf = requestAnimationFrame(tick);
      setReady(true);

      const resize = () => {
        camera.aspect = el.clientWidth / el.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(el.clientWidth, el.clientHeight);
      };
      window.addEventListener("resize", resize);

      stop = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        renderer.domElement.removeEventListener("pointerdown", down);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        player.dispose();
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      stop();
      if (renderer.domElement.parentElement === el) el.removeChild(renderer.domElement);
    };
  }, [base, spawn?.x, spawn?.z]);

  /* ----- the pad, in the DOM because that is where fingers are ----- */
  const padRef = useRef<HTMLDivElement | null>(null);
  const nubRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const pad = padRef.current, nub = nubRef.current, el = host.current;
    if (!pad || !nub || !el) return;
    let on = false;
    const send = (x: number, y: number) =>
      (el as unknown as { __stick?: (a: number, b: number) => void }).__stick?.(x, y);
    const at = (e: PointerEvent) => {
      const r = pad.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2);
      let dy = e.clientY - (r.top + r.height / 2);
      const max = r.width / 2 - 14;
      const len = Math.hypot(dx, dy) || 1;
      if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
      nub.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      send(dx / max, dy / max);
    };
    const down = (e: PointerEvent) => { on = true; pad.setPointerCapture(e.pointerId); at(e); e.stopPropagation(); };
    const move = (e: PointerEvent) => { if (on) { at(e); e.stopPropagation(); } };
    const up = () => { on = false; nub.style.transform = "translate(-50%, -50%)"; send(0, 0); };
    pad.addEventListener("pointerdown", down);
    pad.addEventListener("pointermove", move);
    pad.addEventListener("pointerup", up);
    pad.addEventListener("pointercancel", up);
    return () => {
      pad.removeEventListener("pointerdown", down);
      pad.removeEventListener("pointermove", move);
      pad.removeEventListener("pointerup", up);
      pad.removeEventListener("pointercancel", up);
    };
  }, [ready]);

  return (
    <div style={S.wrap}>
      <div ref={host} style={S.canvas} />

      {!ready ? <div style={S.load}>בונה את העיר…</div> : null}

      {/* The controls stand down while the camera is doing the walking:
          a joystick on screen during a camera move says the move is
          something you are doing, and it is not. */}
      {/*
        * THE INVITATION.
        *
        * Amit: *"כשמגיעים לחנות של ספונסר יקפוץ איזה לוגו קטן שלהם או
        * משהו שיסמן שכדאי להיכנס."*
        *
        * It was a line of white type that said the shop's name, which
        * tells you where you are and not that there is anything to do
        * about it. Now it is a card in the shop's own colour, and for
        * a sponsor it carries בחסות on the same card — inseparable
        * from the name, which is the rule.
        *
        * NOT a Lust character inviting you in, which he also
        * suggested. A figure speaking for a brand is a promise made in
        * that brand's name, and a brand's own voice is theirs to
        * supply, not ours to invent. The day they send one it goes
        * here with no change to this code.
        */}
      {nearName && !walking ? (
        <div style={{ ...S.name, borderColor: nearTint }}>
          <span style={{ ...S.nameDot, background: nearTint }} />
          <span style={S.nameText}>{nearName}</span>
          {enterRef.current ? <span style={S.nameGo}>כדאי להיכנס</span> : null}
        </div>
      ) : null}

      {/* Said once, for four seconds. A control nobody knows about is
          the same as a control that is not there — and this one was
          both, for a week. */}
      {ready && !walking && !room && arriving ? (
        <div style={S.hint}>הזיזו את הג׳ויסטיק כדי לרדת לרחוב</div>
      ) : ready && !walking && !room && hint ? (
        <div style={S.hint}>גררו על המסך כדי להסתכל ימינה ושמאלה</div>
      ) : null}

      {nearId && !walking && enterRef.current ? (
        <button
          style={S.enter}
          onClick={() => {
            setWalking(true);
            enterRef.current?.();
          }}
        >
          היכנס ›
        </button>
      ) : null}

      <div ref={padRef} style={{ ...S.pad, opacity: walking ? 0 : 1 }}>
        <div ref={nubRef} style={S.nub} />
      </div>

      {onBackButton(onExit)}

      {/* The brand's colour, rising as the door opens. */}
      <div
        style={{
          ...S.veil,
          background: nearId
            ? (SHOPS.find((x) => x.id === nearId)?.neonColour ?? "#FF6B4A")
            : "#FF6B4A",
          opacity: veil,
        }}
      />

      {room ? (
        <ShopRoom
          base={base}
          shop={room}
          onLeave={() => {
            setRoom(null);
            leaveRef.current?.();
          }}
          onStreet={() => setWalking(false)}
        />
      ) : null}
    </div>
  );
}


/**
 * INSIDE.
 *
 * ---------------------------------------------------------------------
 * WHY THE SHELVES ARE PRESSABLE AND THE DOOR IS NOT THE POINT
 * ---------------------------------------------------------------------
 * Amit, when an earlier build sent him straight to the brand's site:
 * *"לא רוצה לאתר ישר. רוצה שיהיו מוצרים בחנות פה שיפתחו כמו מקודם עם
 * הנצנצים."*
 *
 * He is right about the business as well as the feeling. A door that
 * opens a browser is an ad; a room you can look around, where the
 * things on the shelves open and tell you what they are, is a visit —
 * and the link at the end of a visit is worth more than the link
 * instead of one.
 *
 * ---------------------------------------------------------------------
 * WHAT IS AND IS NOT ALLOWED TO BE WRITTEN HERE
 * ---------------------------------------------------------------------
 * Every name, line and price comes from `PREVIEW_SPONSORS`, which took
 * them off the brand's own page. Nothing on this screen is computed,
 * inferred or filled in, and a product with no price simply has none —
 * see `sponsorShopViolations`, which rejects a was-price without a
 * price for exactly this reason. A price in a shop window is a claim
 * made on somebody else's behalf.
 *
 * And the exit is announced: `sponsorLeaveHe` is the one sentence that
 * says the next tap leaves PRO NOW, in the same spirit as the maps
 * handoff. We hand over a link and claim nothing about the other side.
 */
function ShopRoom({
  base,
  shop,
  onLeave,
  onStreet,
}: {
  base: string;
  shop: ShopSpec;
  onLeave: () => void;
  /* Called once the walk back out has finished, so the stick returns. */
  onStreet: () => void;
}) {
  const sponsor = shop.sponsor
    ? PREVIEW_SPONSORS.find((x) => x.id === shop.id) ?? null
    : null;
  const things = sponsor?.things ?? [];
  const [open, setOpen] = useState<number | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 30);
    return () => clearTimeout(t);
  }, []);

  /*
   * ---------------------------------------------------------------
   * THE WHOLE SHOP, FROM ACROSS THE ROOM
   * ---------------------------------------------------------------
   * Amit: *"כשנכנסים לחנות אני רוצה שזה יהיה כמו בחנות שעשינו
   * בהתחלה — מבט מרחוק ונצנצים על מוצרים, לא ככה בקלוז־אפ."*
   *
   * The previous version covered the screen with the picture, which
   * on a 4:3 room and a 9:19.5 phone throws away a third of the width
   * on each side. Two of Lust's four shelves were in the thrown-away
   * part, and the answer at the time — drag to look around — was
   * solving a problem that did not need to exist.
   *
   * The picture is shown WHOLE now. That is not a compromise, it is
   * the brief: you are meant to be standing across the room looking
   * at the shelves, not pressed against one of them.
   *
   * A whole 4:3 picture on this screen is 298 points tall and the
   * remaining 500 are the thing to solve. Black bars read as a
   * letterbox — a video someone paused. So the same image, blown up,
   * blurred and dimmed, fills behind it: the screen is full, the
   * colour of the shop is everywhere, and the sharp picture reads as
   * a window into the room rather than a photograph of it.
   *
   * And the shelves get a ROW of their own under the picture. The
   * sparkles stay — they are what says "this is not a photograph" —
   * but a 44-point target on a 298-point picture is fiddly, and
   * nothing that a brand paid for should depend on a precise tap.
   */
  const stage = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const fit = (img: HTMLImageElement) => {
    const host = stage.current;
    if (!host || !img.naturalWidth) return;
    const cw = host.clientWidth, ch = host.clientHeight;
    /* CONTAIN, not cover: min, so the whole picture is inside. */
    const k = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
    setBox({ w: img.naturalWidth * k, h: img.naturalHeight * k });
  };

  const thing = open === null ? null : things[open] ?? null;
  const tint = shop.neonColour ?? "#FF6B4A";

  return (
    <div style={S.room}>
      {/* The shop's own colour and light, behind everything. */}
      <img
        src={base + shop.interior}
        alt=""
        aria-hidden
        style={{ ...S.roomWash, opacity: shown ? 1 : 0 }}
      />
      <div style={{ ...S.roomWashVeil, opacity: shown ? 1 : 0 }} />

      <div ref={stage} style={S.roomStage}>
        <div
          style={{
            ...S.roomInner,
            width: box ? box.w : "92%",
            height: box ? box.h : undefined,
            transform: shown ? "scale(1)" : "scale(1.1)",
            opacity: shown ? 1 : 0,
            boxShadow: `0 26px 70px rgba(0,0,0,.6), 0 0 0 1px ${tint}44`,
          }}
        >
          <img
            src={base + shop.interior}
            alt=""
            style={S.roomImg}
            onLoad={(e) => fit(e.currentTarget)}
          />
          {things.map((t, i) => (
            <button
              key={t.titleHe}
              style={{
                ...S.spot,
                left: `${t.x * 100}%`,
                top: `${t.y * 100}%`,
                animationDelay: `${i * 0.45}s`,
              }}
              onClick={() => setOpen(i)}
              aria-label={t.titleHe}
            >
              <span style={S.spotCore} />
            </button>
          ))}
        </div>
      </div>

      <div style={S.roomBar}>
        <h2 style={S.roomName}>
          {shop.sponsor ? shop.he : `PRO NOW · ${shop.he}`}
        </h2>
        <p style={S.roomTag}>
          {sponsor
            ? `${sponsor.categoryHe} · ${SPONSOR_BADGE_HE}`
            : "זה התחום, לא מקצוען מסוים"}
        </p>
        {sponsor ? <p style={S.roomLine}>{sponsor.taglineHe}</p> : null}

        {things.length > 0 ? (
          <div style={S.shelf}>
            {things.map((t, i) => (
              <button key={t.titleHe} style={S.shelfItem} onClick={() => setOpen(i)}>
                <span style={S.shelfName}>{t.titleHe}</span>
                {t.priceHe ? <span style={S.shelfPrice}>{t.priceHe}</span> : null}
              </button>
            ))}
          </div>
        ) : null}

        <button
          style={S.out}
          onClick={() => {
            onLeave();
            window.setTimeout(onStreet, 1500);
          }}
        >
          חזרה לרחוב
        </button>
      </div>

      {thing ? (
        <div style={S.sheetWrap} onClick={() => setOpen(null)}>
          <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
            <h3 style={S.sheetName}>{thing.titleHe}</h3>
            <p style={S.sheetBody}>{thing.bodyHe}</p>
            {thing.priceHe ? (
              <p style={S.price}>
                <strong style={S.priceNow}>{thing.priceHe}</strong>
                {thing.wasPriceHe ? (
                  <span style={S.priceWas}>{thing.wasPriceHe}</span>
                ) : null}
              </p>
            ) : null}
            {sponsor ? (
              <>
                <p style={S.leaving}>{sponsorLeaveHe(sponsor)}</p>
                <a
                  style={S.site}
                  href={sponsor.siteUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {sponsorCtaHe(sponsor)}
                </a>
              </>
            ) : null}
            <button style={S.sheetClose} onClick={() => setOpen(null)}>
              סגירה
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function onBackButton(onExit?: () => void) {
  if (!onExit) return null;
  return (
    <button style={S.back} onClick={onExit} aria-label="חזרה">
      ›
    </button>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: { position: "absolute", inset: 0, background: "#05040c", overflow: "hidden", direction: "rtl", touchAction: "none" },
  /*
   * `touchAction: "none"` is the whole of "you cannot look sideways".
   *
   * Amit: *"אני צריך שהמבט של הדמות תוכל לזוז ימינה שמאלה, שיראו את
   * החנויות בצדדים, אחרת לא רואים אותם."*
   *
   * Drag-to-turn has been wired to the canvas since the first build
   * and it works with a mouse, which is why every screenshot of it
   * looked fine. On a touch screen the browser claims a drag for its
   * own scrolling before the page sees it, cancels the pointer
   * stream, and the camera never moves. The joystick had this line
   * from the start; the canvas never did, so the one control that
   * needs a drag was the one that did not declare it.
   */
  canvas: { position: "absolute", inset: 0, touchAction: "none" },
  load: {
    position: "absolute", inset: 0, display: "grid", placeItems: "center",
    color: "rgba(247,243,250,.6)", fontSize: 14,
  },
  name: {
    position: "absolute", top: 46, left: "50%", transform: "translateX(-50%)",
    display: "flex", alignItems: "center", gap: 9,
    padding: "9px 16px", borderRadius: 999,
    background: "rgba(12,9,18,.82)", border: "1px solid",
    boxShadow: "0 10px 30px rgba(0,0,0,.55)",
    pointerEvents: "none", whiteSpace: "nowrap",
    animation: "pnRise 320ms cubic-bezier(.16,.84,.34,1)",
  },
  nameDot: { width: 9, height: 9, borderRadius: 999, flex: "0 0 auto" },
  nameText: { color: "#F7F3FA", fontSize: 16, fontWeight: 700 },
  nameGo: { color: "rgba(247,243,250,.6)", fontSize: 12.5 },
  /* Bottom RIGHT, opposite the stick. Centred at bottom:172 it sat on
     the character's head — the one thing on screen the eye is on. */
  enter: {
    position: "absolute", right: 20, bottom: 52,
    border: 0, borderRadius: 999, padding: "13px 26px", background: "#FF6B4A",
    color: "#17121F", fontSize: 15, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
    boxShadow: "0 8px 26px rgba(255,107,74,.45)",
  },
  pad: {
    position: "absolute", left: 18, bottom: 26, width: 118, height: 118, borderRadius: 999,
    transition: "opacity 320ms ease",
    background: "rgba(16,11,22,.34)", border: "1px solid rgba(247,243,250,.2)",
    touchAction: "none",
  },
  nub: {
    position: "absolute", left: "50%", top: "50%", width: 50, height: 50, borderRadius: 999,
    transform: "translate(-50%, -50%)", background: "rgba(247,243,250,.86)",
    boxShadow: "0 4px 14px rgba(0,0,0,.6)", pointerEvents: "none",
  },
  back: {
    position: "absolute", top: 14, right: 14, width: 40, height: 40, borderRadius: 999,
    background: "rgba(16,11,22,.9)", border: "1px solid rgba(247,243,250,.55)",
    color: "#F7F3FA", fontSize: 20, cursor: "pointer", lineHeight: 1,
  },
  veil: {
    position: "absolute", inset: 0, pointerEvents: "none",
    transition: "opacity 460ms ease",
  },
  /* Transparent, so the colour and the street behind it are what the
     room fades up out of. `roomBack` is the black, and it arrives with
     the picture rather than before it. */
  /*
   * Centred as a GROUP — picture and card together. Laid out top to
   * bottom, the whole picture is 298 points on a 390-wide phone and
   * the card is about 250, which left three hundred points of blurred
   * nothing between them. Nothing is a legitimate design element and
   * that much of it, in the middle, is not.
   */
  room: {
    position: "absolute", inset: 0, overflow: "hidden",
    display: "flex", flexDirection: "column", justifyContent: "center",
  },
  /* The picture sits in whatever room the bar leaves it, centred. */
  roomStage: {
    position: "relative", flex: "0 0 auto", height: "44%", minHeight: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  roomInner: {
    position: "relative", borderRadius: 14, overflow: "hidden",
    transition: "transform 680ms cubic-bezier(.16,.84,.34,1), opacity 420ms ease",
  },
  roomImg: { width: "100%", height: "100%", display: "block" },
  /*
   * THE SPARKLE.
   *
   * Two rings on one button: a soft halo that breathes outward and a
   * small bright core that does not. A single pulsing dot reads as a
   * loading indicator; the halo is what makes it read as "there is
   * something here" — which is the whole job, because nothing else on
   * the picture tells you the shelves can be pressed.
   *
   * 44px, because it is a touch target before it is an ornament.
   */
  spot: {
    position: "absolute", width: 44, height: 44, marginLeft: -22, marginTop: -22,
    borderRadius: 999, border: 0, padding: 0, cursor: "pointer",
    background: "radial-gradient(circle, rgba(255,240,210,.85) 0%, rgba(255,214,150,.35) 32%, rgba(255,190,120,0) 68%)",
    animation: "pnSpot 2.4s ease-in-out infinite",
  },
  spotCore: {
    position: "absolute", left: "50%", top: "50%", width: 10, height: 10,
    marginLeft: -5, marginTop: -5, borderRadius: 999, background: "#FFF6E4",
    boxShadow: "0 0 12px 3px rgba(255,214,150,.9)",
  },
  hint: {
    position: "absolute", left: 20, right: 20, bottom: 158, textAlign: "center",
    color: "rgba(247,243,250,.8)", fontSize: 13, letterSpacing: .2,
    textShadow: "0 2px 14px rgba(0,0,0,.9)", pointerEvents: "none",
    animation: "pnFade 5.2s ease forwards",
  },
  /* ----- inside a shop ----- */
  roomWash: {
    position: "absolute", inset: "-8%", width: "116%", height: "116%",
    objectFit: "cover", filter: "blur(34px) saturate(1.25)",
    transition: "opacity 520ms ease",
  },
  roomWashVeil: {
    position: "absolute", inset: 0, background: "rgba(5,4,12,.62)",
    transition: "opacity 520ms ease",
  },
  shelf: {
    display: "flex", gap: 8, overflowX: "auto", padding: "2px 0 12px",
    scrollbarWidth: "none",
  },
  shelfItem: {
    flex: "0 0 auto", display: "flex", flexDirection: "column", gap: 2,
    alignItems: "flex-start", minHeight: 44, padding: "8px 13px",
    borderRadius: 14, cursor: "pointer", fontFamily: "inherit",
    background: "rgba(247,243,250,.1)", border: "1px solid rgba(247,243,250,.18)",
  },
  shelfName: { fontSize: 12.5, fontWeight: 700, color: "#F7F3FA", whiteSpace: "nowrap" },
  shelfPrice: { fontSize: 12, color: "rgba(247,243,250,.66)" },
  roomBar: { position: "relative", flex: "0 0 auto", padding: "14px 20px 24px" },
  roomName: { margin: "0 0 4px", fontSize: 26, color: "#F7F3FA" },
  roomTag: { margin: "0 0 8px", fontSize: 13, color: "rgba(247,243,250,.62)" },
  roomLine: { margin: "0 0 14px", fontSize: 14, color: "rgba(247,243,250,.8)" },
  out: {
    width: "100%", border: "1px solid rgba(247,243,250,.24)", borderRadius: 999, padding: 14,
    background: "rgba(247,243,250,.14)", color: "#F7F3FA", fontSize: 15, fontWeight: 700,
    fontFamily: "inherit", cursor: "pointer",
  },
  sheetWrap: {
    position: "absolute", inset: 0, background: "rgba(5,4,12,.66)",
    display: "flex", flexDirection: "column", justifyContent: "flex-end",
  },
  sheet: {
    background: "#17121F", borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: "20px 20px 26px", borderTop: "1px solid rgba(247,243,250,.14)",
  },
  sheetName: { margin: "0 0 8px", fontSize: 19, color: "#F7F3FA" },
  sheetBody: { margin: "0 0 12px", fontSize: 14, lineHeight: 1.55, color: "rgba(247,243,250,.78)" },
  price: { margin: "0 0 14px", display: "flex", gap: 10, alignItems: "baseline" },
  priceNow: { fontSize: 22, color: "#F7F3FA" },
  priceWas: { fontSize: 14, color: "rgba(247,243,250,.5)", textDecoration: "line-through" },
  leaving: { margin: "0 0 10px", fontSize: 12.5, color: "rgba(247,243,250,.58)", lineHeight: 1.5 },
  site: {
    display: "block", textAlign: "center", borderRadius: 999, padding: 14,
    background: "#FF6B4A", color: "#17121F", fontSize: 15, fontWeight: 700,
    textDecoration: "none",
  },
  sheetClose: {
    width: "100%", marginTop: 10, border: 0, borderRadius: 999, padding: 12,
    background: "transparent", color: "rgba(247,243,250,.6)", fontSize: 14,
    fontFamily: "inherit", cursor: "pointer",
  },
};

/* The keyframes the sparkle needs, injected once. Inline styles cannot
   carry an @keyframes, and this component owns its own look. */
if (typeof document !== "undefined" && !document.getElementById("pn-city-css")) {
  const tag = document.createElement("style");
  tag.id = "pn-city-css";
  tag.textContent =
    "@keyframes pnSpot{0%,100%{transform:scale(.82);opacity:.7}50%{transform:scale(1.18);opacity:1}}" +
    "@keyframes pnFade{0%{opacity:0}12%{opacity:1}72%{opacity:1}100%{opacity:0}}" +
    "@keyframes pnRise{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}";
  document.head.appendChild(tag);
}
