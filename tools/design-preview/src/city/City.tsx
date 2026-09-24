import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

import { buildPlayer } from "./player";
import { SPONSOR_BADGE_HE, sponsorCtaHe, sponsorLeaveHe } from "@pro-now/types";
/*
 * The type scale, which this file had been quietly outside of.
 *
 * `check-type-scale.mjs` counted 23 literal `fontSize:` values here —
 * 11.5, 12.5, 14.5, 15, 16, 19, 20, 22, 26 — every one of them typed by
 * somebody making one panel look right, which is exactly the failure
 * that check was written for: "the ETA rendered at 44 on the match
 * screen and at 30 on the tracking screen, so its size told the reader
 * nothing". The city's panels are the same product as the screens and
 * they read the same scale now.
 */
import { scale } from "@pro-now/ui";

import { PREVIEW_SPONSORS } from "../sponsors";
import {
  buildStreet,
  FRONT_X,
  OPTIONAL_ART,
  SPAWN,
  STREET_LENGTH,
  WALK_LIMIT,
  type ShopSpec,
} from "./street";

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
  { id: "hair",      he: "טיפוח ויופי",    facade: "district_hair.webp",      z:   88, side: -1, interior: "hair_barbershop_hero.webp", neonColour: "#ff7ac2" , department: "BEAUTY" },
  { id: "pets",      he: "בעלי חיים",      facade: "district_pets.webp",      z:   70.4, side:  1, interior: "pets_salon_hero.webp",      neonColour: "#8ce06a" , department: "PETS" },
  { id: "home",      he: "תיקונים דחופים", facade: "district_home.webp",      z:   52.8, side: -1, interior: "home_workshop_hero.webp",   neonColour: "#ffb45e" , department: "HOME_URGENT" },
  { id: "lust",      he: "Lust",           facade: "sponsor_lust_venue.webp", z:   35.2, side:  1, interior: "sponsor_lust_hero.webp",    sponsor: true, neonColour: "#ff3d63" },
  { id: "tech",      he: "מחשבים וסלולר",  facade: "district_tech.webp",      z:   17.6, side: -1, neonColour: "#7ad7ff" , department: "TECH" },
  { id: "auto",      he: "רכב ודרך",       facade: "district_auto.webp",      z:    0, side:  1, interior: "auto_garage_hero.webp",     neonColour: "#ff9b3d" , department: "VEHICLE" },
  { id: "well",      he: "בריאות וכושר",   facade: "district_well.webp",      z:  -17.6, side: -1, neonColour: "#6affc6" , department: "WELLNESS" },
  { id: "appliance", he: "מוצרי חשמל",     facade: "district_appliance.webp", z:  -35.2, side:  1, interior: "appliance_workshop_hero.webp", neonColour: "#ffd166" , department: "APPLIANCES" },
  { id: "care",      he: "ניקיון ותחזוקה", facade: "district_care.webp",      z:  -52.8, side: -1, interior: "care_studio_hero.webp",     neonColour: "#9db8ff" , department: "HOME_CARE" },
  { id: "nails",     he: "ציפורניים",      facade: "district_nails.webp",     z:  -70.4, side:  1, neonColour: "#ff6fa8" , department: "BEAUTY" },
  { id: "move",      he: "הובלות ומשלוחים", facade: "district_move.webp",     z:  -88, side: -1, neonColour: "#c39bff" , department: "LOGISTICS" },
  /*
   * The vet is a category inside PETS — "וטרינר עד הבית" — and it had
   * no house in the world. Amit spotted it: *"חנות חיות וטרינר?"* It
   * is the only trade in the catalogue that was missing one.
   */
  { id: "vet",       he: "וטרינריה",       facade: "shop_vet.webp",           z: -105.6, side:  1, neonColour: "#7ad7ff", department: "PETS" },
  /*
   * Two trades had drawn shopfronts and no house to put them on —
   * `shop_build` and `shop_help` were installed and stood nowhere.
   * With these the roster covers all eleven departments.
   */
  { id: "build",     he: "שיפוץ והתקנות",  facade: "shop_build.webp",         z: -123.2, side: -1, interior: "shop_build_inside.webp", neonColour: "#ffa552", department: "IMPROVEMENT" },
  { id: "help",      he: "עזרה ועבודות קטנות", facade: "shop_help.webp",      z: -140.8, side:  1, interior: "shop_help_inside.webp",  neonColour: "#a8e06a", department: "ODD_JOBS" },
];

/**
 * Which department each shop stands for, taken from the roster itself.
 *
 * The host builds the service list for every shop and needs the same
 * mapping the street uses. Derived rather than typed out again, so a
 * shop that changes trade changes it in one place.
 */
export const CITY_SHOP_DEPARTMENTS: Record<string, string> = Object.fromEntries(
  SHOPS.filter((s) => s.department).map((s) => [s.id, s.department!])
);

const WALK = Array.from({ length: 8 }, (_, i) => `avatar_amit_walk_0${i + 1}.webp`);
const RUN = Array.from({ length: 8 }, (_, i) => `avatar_amit_run_0${i + 1}.webp`);

export interface CityProps {
  /** Where the art lives, so the same component works in the app. */
  base?: string;
  /** Where to stand at the start. Only the gallery passes this. */
  spawn?: { x?: number; z?: number };
  /**
   * Which of the twelve characters the customer chose, 1–12.
   *
   * Without it the street falls back to Amit's cycle, which is what
   * it did for everybody until now.
   */
  avatarNo?: number | null;
  /**
   * WHAT EACH TRADE ACTUALLY DOES, SO A SHOP CAN SELL IT.
   *
   * Amit: *"חייב שיפתחו אפשרויות"*, and later, of the world as a
   * whole: *"בלעדיו העולם יפה אבל לא מוכר כלום."*
   *
   * Walking into a trade's shop used to show a beautiful room and
   * nothing to do in it. The services are what the shop is FOR — you
   * go in, you see what this trade does, you call somebody.
   *
   * Passed in rather than imported, because the catalogue, the live
   * availability snapshot and the route out all live in the host. The
   * city knows how to show a list; it must not decide what is in it.
   *
   * `availableNowCount` is null wherever the snapshot did not say, and
   * is rendered as silence rather than as a zero — /CLAUDE.md §3.
   */
  trades?: Record<
    string,
    {
      nameHe: string;
      services: Array<{
        id: string;
        nameHe: string;
        descriptionHe?: string | null;
        availableNowCount: number | null;
      }>;
    }
  > | null;
  /** Called when somebody picks a service inside a shop. */
  onRequestService?: (serviceId: string) => void;
  /**
   * A NAMED CAMERA SHOT, FOR SCREENS THAT ARE NOT PLAYED.
   *
   * Amit, about the onboarding: *"שהמצלמה תזוז ותתמקד בעולם שלנו ובמה
   * שרשום — אם רשום עיר שיראו את העיר, אם רשום אווטאר שיראו אווטאר."*
   *
   * The three intro slides used to travel over the PAINTED plate,
   * which was the right idea against the only world that existed then.
   * The world is a place with a camera in it now, so the slides can
   * look at the real thing — and a slide about the city should be
   * standing in the city, not next to a picture of it.
   *
   * Changing this eases the camera to the new shot rather than
   * cutting, because the claim the three slides make is that they are
   * ONE place.
   */
  shot?: CityShot | null;
  /**
   * The joystick, the entry button and the hints.
   *
   * Off for a screen that is looked at rather than played: a control
   * you cannot use is worse than no control, and on the intro it would
   * also be a promise that the slide is interactive.
   */
  hud?: boolean;
  onExit?: () => void;
}

/**
 * Where the camera stands for a screen that is not being played.
 *
 * `wide` is the arrival shot over the whole street; `character` is the
 * third-person rig, close, on the figure; `shopfront` frames a
 * business the way you see one from the pavement.
 */
export type CityShot = "wide" | "character" | "shopfront";

/** What one trade offers, as the host hands it over. */
interface Trade {
  nameHe: string;
  services: Array<{
    id: string;
    nameHe: string;
    descriptionHe?: string | null;
    availableNowCount: number | null;
  }>;
}

export function City({
  base = "./world/",
  spawn,
  avatarNo = null,
  shot = null,
  hud = true,
  trades = null,
  onRequestService,
  onExit,
}: CityProps) {
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
  /*
   * A place you have walked up to that is not a shop — the dog park,
   * the layby, the pickup point. Amit: *"אין לו חנות, צריך לחשוב על
   * דרך אחרת לפגוש אותו, כי משהו כן צריך להיפתח."*
   */
  const [nearPlace, setNearPlace] = useState<{ id: string; he: string; department: string | null } | null>(null);
  const [openPlace, setOpenPlace] = useState<{ he: string; department: string } | null>(null);
  /* Read every frame, so changing the prop moves the camera without
     rebuilding the city. */
  /*
   * The services for a DEPARTMENT rather than for a shop, because a
   * place belongs to a trade and not to a building. Derived from the
   * same map the shops use, so there is one source for what a trade
   * offers and a place can never advertise something a shop would not.
   */
  const placeTrades = useMemo(() => {
    const out: Record<string, Trade["services"]> = {};
    for (const [shopId, t] of Object.entries(trades ?? {})) {
      const dept = SHOPS.find((x) => x.id === shopId)?.department;
      if (dept && !out[dept]) out[dept] = t.services;
    }
    return out;
  }, [trades]);

  const shotRef = useRef<CityShot | null>(shot);
  shotRef.current = shot;
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
    /* On again, over a small box that rides with the player — see the
       moon in street.ts for why that is affordable and why it was a
       mistake to turn it off. */
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

    /*
     * -----------------------------------------------------------------
     * BLOOM, WHICH IS MOST OF WHAT "MODERN" MEANS
     * -----------------------------------------------------------------
     * Amit: *"למה הכל בפיקסלים... רק מציאותי וקסום שמתאים ל-2030 ולא
     * ל-2004."*
     *
     * Part of his answer is art and is being drawn. But a real part of
     * it is this pass, and it is worth being precise about why.
     *
     * A renderer without bloom draws a lamp as a bright circle that
     * stops at its own edge. No camera and no eye does that: bright
     * light BLEEDS — into the lens, into the air, into the wet road —
     * and every game that reads as modern is doing this to its lights.
     * The street was already full of neon, festoon bulbs, headlights
     * and lit windows, all of them stopping dead at their outlines.
     *
     * Threshold 0.85 so only genuinely bright things bleed — a lit
     * window does, a plastered wall does not, and lifting the whole
     * image into a haze is the failure mode here.
     */
    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(el.clientWidth, el.clientHeight);
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(el.clientWidth, el.clientHeight),
      /* strength */ 0.3,
      /* radius   */ 0.5,
      /* threshold*/ 0.96
    );

    const loader = new THREE.TextureLoader();
    const load = (f: string) =>
      new Promise<THREE.Texture>((res, rej) => loader.load(base + f, res, undefined, rej));

    let stop = () => {};

    (async () => {
      const facades: Record<string, THREE.Texture | undefined> = {};
      await Promise.all(
        SHOPS.map(async (s) => {
          /*
           * `shop_<id>` FIRST, `district_<id>` AFTER.
           *
           * The district drawings are three-quarter views with their
           * own baked perspective, which is why Amit said the shops
           * read as a photo glued to a wall: the painted vanishing
           * point argues with the camera's every time it moves. The
           * `shop_*` set is the same trades redrawn as flat
           * elevations, the way the residential buildings are, and
           * where one exists it wins.
           */
          try {
            facades[s.facade] = await load(`shop_${s.id}.webp`);
            return;
          } catch {
            /* not redrawn yet */
          }
          try {
            facades[s.facade] = await load(s.facade);
          } catch {
            /* A shop with no drawing is a volume with no face, which is
               honest — see `DistrictLayer` for why nothing stands in. */
          }
        })
      );
      /*
       * THE DELIVERED ART, WHERE IT HAS ARRIVED.
       *
       * Every id is optional and a miss is not an error: the street has
       * a procedural stand-in for each one and falls back to it
       * silently. That is what lets the art land in `public/world` and
       * change the city with no code change at all — which is the whole
       * arrangement, because the art is drawn in another room on
       * another clock.
       */
      /* The redrawn interiors, one per trade, where they exist. */
      await Promise.all(
        SHOPS.map(async (sh) => {
          try {
            const t = await load(`shop_${sh.id}_inside.webp`);
            (sh as { interior?: string }).interior = `shop_${sh.id}_inside.webp`;
            t.dispose();
          } catch {
            /* keep whatever interior the roster already names */
          }
        })
      );

      await Promise.all(
        OPTIONAL_ART.map(async (id) => {
          try {
            facades[id] = await load(`${id}.webp`);
          } catch {
            /* not delivered yet */
          }
        })
      );

      /*
       * ---------------------------------------------------------------
       * YOU WALK AS THE CHARACTER YOU CHOSE
       * ---------------------------------------------------------------
       * The city has been hard-coded to Amit's cycle since it was
       * built, so whoever you picked at sign-up — including the dog
       * and the cat — walked this street as somebody else.
       *
       * The delivered sheets are ONE image with eight poses in a row,
       * and that is better than eight files: a texture clone shares
       * the decoded image and carries its own offset, so eight frames
       * cost one download and one upload to the GPU. No slicing tool,
       * no eight requests.
       */
      const sheetFrames = async (id: string, n = 8) => {
        const sheet = await load(id);
        sheet.colorSpace = THREE.SRGBColorSpace;
        return Array.from({ length: n }, (_, i) => {
          const f = sheet.clone();
          f.needsUpdate = true;
          f.wrapS = f.wrapT = THREE.ClampToEdgeWrapping;
          f.repeat.set(1 / n, 1);
          f.offset.set(i / n, 0);
          return f;
        });
      };

      let walk: THREE.Texture[];
      let run: THREE.Texture[];
      /* A frame's own shape, which is not the sheet's. See buildPlayer. */
      let frameAspect: number | undefined;
      const chosen = avatarNo ? String(avatarNo).padStart(2, "0") : null;
      try {
        if (!chosen) throw new Error("no avatar chosen");
        walk = await sheetFrames(`avatar_${chosen}_back.webp`);
        run = walk;
        const img = walk[0]!.image as { width: number; height: number };
        frameAspect = img.width / 8 / img.height;
      } catch {
        walk = await Promise.all(WALK.map(load));
        run = await Promise.all(RUN.map(load)).catch(() => walk);
      }
      if (disposed) return;

      const street = buildStreet(SHOPS, facades);
      const player = buildPlayer(walk, run, 1.78, frameAspect);
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

      const camera = new THREE.PerspectiveCamera(
        /*
         * SEVENTY-TWO DEGREES, BECAUSE THE STREET IS NARROWER THAN THE
         * LENS NEEDED.
         *
         * Amit, of the shopfronts: *"החנות עדיין מטושטשת ולא נראית
         * חיה, לא מבינים מה יש בה... אני רוצה מבט יותר רחב חד משמעית."*
         *
         * Measured, and the answer was not a matter of taste. At 52°
         * the horizontal field is 25.4°, so from where he stands —
         * 2.4 metres off the wall — the screen holds 1.1 metres of an
         * 8.6-metre shopfront. THIRTEEN PER CENT. The drawing is 3400
         * pixels wide and about 440 of them were being stretched
         * across the whole screen, which is the blur he is describing:
         * the file is excellent and the magnification destroys it.
         *
         * And it could not be solved by backing away. Framing a whole
         * shopfront at 52° needs 19.1 metres, and the street is 19.4
         * metres from wall to wall. There is nowhere to stand.
         *
         * At 72° the horizontal field is 36.5° and a whole shopfront
         * fits from 12.8 metres — a distance that exists here, out
         * over the road. The cost is a little barrel-feel at the
         * edges; the gain is that the shop he paid for is legible.
         */
        72,
        el.clientWidth / el.clientHeight,
        0.1,
        400
      );
      composer.addPass(new RenderPass(street.scene, camera));
      composer.addPass(bloom);

      /* ----- controls ----- */
      let yaw = Math.PI, pitch = 0.26;
      /* The camera's head, turned toward whatever shop you are beside. */
      let look = 0;
      /* And the head YOU turn, by dragging. It decays when you walk. */
      let turn = 0;

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
      /* 0 walking, 1 standing back looking at a shopfront. */
      let frame = 0;

      /*
       * A scripted shot overrides the stick entirely. `shotRef` is read
       * every frame rather than captured, so changing the prop moves
       * the camera without rebuilding the city — the whole point is
       * that the slides are demonstrably one place.
       */
      const SHOTS: Record<string, { dist: number; hgt: number; ahead: number; yaw: number }> = {
        wide:      { dist: 34, hgt: 23, ahead: 0.5, yaw: Math.PI },
        character: { dist: 4.6, hgt: 2.2, ahead: 1.1, yaw: Math.PI },
        shopfront: { dist: 9.5, hgt: 4.2, ahead: 0.7, yaw: Math.PI - 0.95 },
      };
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
        /*
         * -----------------------------------------------------------
         * A DRAG TURNS THE HEAD, NOT THE BODY
         * -----------------------------------------------------------
         * Amit: *"צריך שתהיה אפשרות רק להסתובב עם המבט ימינה שמאלה."*
         *
         * It turned `yaw`, which is the direction you WALK. So looking
         * right also pointed your feet right, and there was no way to
         * glance at a shop without setting off towards it, or into the
         * wall behind it.
         *
         * A person walking a street does not turn their body to look
         * in a window. They turn their head. `turn` is that head: it
         * is added to the camera and to nothing else, so the stick,
         * the heading and the feet are untouched by it.
         *
         * Clamped to 1.05 radians, about sixty degrees, for a reason
         * that is about the artwork and not taste: the figure is a
         * BACK-VIEW drawing on a plane that faces the camera. Past
         * sixty you are looking at somebody back while they walk
         * sideways, and the illusion the whole scene rests on comes
         * apart. The day the side-view sheets arrive this opens to
         * ninety.
         */
        turn = Math.max(-1.05, Math.min(1.05, turn - (e.clientX - lastX) * 0.0055));
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
      let lastPlace: string | null = null;

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
          composer.render();

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

        const scripted = shotRef.current ? SHOTS[shotRef.current] ?? null : null;
        const push = scripted ? 0 : Math.hypot(stick.x, stick.y);
        const running = push > 0.75;
        if (push > 0.08) {
          leaving = true;
          /* Walking straightens you up, the way it does in life: nobody
             strides down a street looking sideways for ever. */
          turn *= Math.pow(0.12, dt);
        }
        if (scripted) { descend = 1; leaving = true; }
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

        /*
         * -----------------------------------------------------------
         * STANDING BACK TO SEE A SHOP
         * -----------------------------------------------------------
         * Amit: *"לא מצליח להסתכל לחנות, לא רואים את כל מה שבנינו."*
         *
         * Measured: from the middle of the pavement, 2.4 metres off
         * the wall, the screen holds thirteen per cent of a shopfront.
         * You cannot see a shop from underneath it, and no amount of
         * turning fixes that. Only distance does.
         *
         * So stopping beside a shop walks the CAMERA backwards, out
         * over the road, while the figure stays on the pavement. At
         * about eleven metres, with the wider lens, most of the facade
         * is in frame and the drawing is shown near its own resolution
         * rather than magnified past it.
         *
         * `frame` rises only while you are stationary next to
         * something; walk on and the camera comes back in behind you.
         */
        const wantFrame = best && push < 0.08 ? Math.max(0, Math.min(1, (9 - bd) / 4)) : 0;
        frame += (wantFrame - frame) * (1 - Math.pow(0.08, dt));

        let camYaw = yaw + look + turn;

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

        const follow = 6.2 + pitch * 3.0 + frame * 5.2;
        const wide = scripted
          ? scripted.dist
          : WIDE.dist + (follow - WIDE.dist) * k;
        if (scripted) camYaw = camYaw + (scripted.yaw - camYaw) * (1 - Math.pow(0.02, dt));
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
        const hgt = scripted
          ? scripted.hgt
          : WIDE.hgt + (1.2 + dist * 0.33 + frame * 1.1 - WIDE.hgt) * k;
        const ahead = scripted ? dist * scripted.ahead : dist * 1.55 * (0.45 + 0.55 * k);
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
        /*
         * The places are checked the same way and at the same radius,
         * but separately: a shop you go INTO, a place you are MET at,
         * and the two must never be confused on screen.
         */
        let bestPlace: (typeof street.places)[number] | null = null;
        let pd = 8;
        for (const pl of street.places) {
          if (!pl.department) continue;
          const d = pl.spot.distanceTo(player.group.position);
          if (d < pd) { pd = d; bestPlace = pl; }
        }
        /*
         * WHICHEVER IS ACTUALLY NEARER.
         *
         * The place pill was drawn only when no shop was in range, and
         * the shop range is nine metres against the place's eight — so
         * standing IN the dog park, half a metre from its gate, the
         * screen named the pet shop eight metres up the road and never
         * the park. Measured at z 62: "בעלי חיים · כדאי להיכנס", with
         * `place_dogpark` right under the camera.
         *
         * The two are still different things and never share the
         * screen — a shop you go INTO, a place you are MET at — but
         * which one you are at is a distance, not a precedence.
         */
        if (bestPlace && best && pd < bd) best = null;
        const placeId = bestPlace ? bestPlace.id : null;
        if (placeId !== lastPlace) {
          lastPlace = placeId;
          setNearPlace(
            bestPlace
              ? { id: bestPlace.id, he: bestPlace.he, department: bestPlace.department }
              : null
          );
        }

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

        composer.render();
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
        composer.setSize(el.clientWidth, el.clientHeight);
        bloom.setSize(el.clientWidth, el.clientHeight);
      };
      window.addEventListener("resize", resize);

      stop = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        renderer.domElement.removeEventListener("pointerdown", down);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        player.dispose();
        composer.dispose();
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      stop();
      if (renderer.domElement.parentElement === el) el.removeChild(renderer.domElement);
    };
  }, [base, spawn?.x, spawn?.z, avatarNo]);

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
      {hud && nearName && !walking ? (
        <div style={{ ...S.name, borderColor: nearTint }}>
          <span style={{ ...S.nameDot, background: nearTint }} />
          <span style={S.nameText}>{nearName}</span>
          {enterRef.current ? <span style={S.nameGo}>כדאי להיכנס</span> : null}
        </div>
      ) : null}

      {/* Said once, for four seconds. A control nobody knows about is
          the same as a control that is not there — and this one was
          both, for a week. */}
      {hud && ready && !walking && !room && arriving ? (
        <div style={S.hint}>הזיזו את הג׳ויסטיק כדי לרדת לרחוב</div>
      ) : ready && !walking && !room && hint ? (
        <div style={S.hint}>גררו על המסך כדי להסתכל ימינה ושמאלה</div>
      ) : null}

      {/*
        * A PLACE, NOT A SHOP.
        *
        * Same pill, different sentence and a different verb: you do
        * not go INTO a dog park, you are met at one. The distinction
        * matters because the whole street is built on the difference
        * between premises and presence.
        */}
      {hud && nearPlace && !nearId && !walking ? (
        <div style={{ ...S.name, borderColor: "#8ce06a" }}>
          <span style={{ ...S.nameDot, background: "#8ce06a" }} />
          <span style={S.nameText}>{nearPlace.he}</span>
          <span style={S.nameGo}>נפגשים כאן</span>
        </div>
      ) : null}

      {hud && nearPlace && !nearId && !walking && nearPlace.department ? (
        <button
          style={S.enter}
          onClick={() =>
            setOpenPlace({ he: nearPlace.he, department: nearPlace.department! })
          }
        >
          מה אפשר להזמין כאן ›
        </button>
      ) : null}

      {hud && nearId && !walking && enterRef.current ? (
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

      <div
        ref={padRef}
        style={{ ...S.pad, opacity: !hud || walking ? 0 : 1, pointerEvents: hud ? "auto" : "none" }}
      >
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

      {openPlace ? (
        <div style={S.sheetWrap} onClick={() => setOpenPlace(null)}>
          <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
            <h3 style={S.sheetName}>{openPlace.he}</h3>
            <p style={S.sheetBody}>
              אין כאן חנות — המקצוען מגיע אליכם. זה המקום שנפגשים בו.
            </p>
            <div style={S.services}>
              {(placeTrades[openPlace.department] ?? []).map((sv) => (
                <button
                  key={sv.id}
                  style={S.service}
                  onClick={() => onRequestService?.(sv.id)}
                >
                  <span style={S.serviceName}>{sv.nameHe}</span>
                  {typeof sv.availableNowCount === "number" ? (
                    <span style={S.serviceCount}>{sv.availableNowCount} פנויים עכשיו</span>
                  ) : null}
                  <span style={S.serviceGo}>›</span>
                </button>
              ))}
            </div>
            <button style={S.sheetClose} onClick={() => setOpenPlace(null)}>
              סגירה
            </button>
          </div>
        </div>
      ) : null}

      {room ? (
        <ShopRoom
          base={base}
          shop={room}
          trade={(room.department && trades?.[room.id]) || null}
          onRequestService={onRequestService}
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
  trade,
  onRequestService,
  onLeave,
  onStreet,
}: {
  base: string;
  shop: ShopSpec;
  /** What this trade does, when the host knows. */
  trade: Trade | null;
  onRequestService?: (serviceId: string) => void;
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
    /*
     * WIDTH-LIMITED, AND THEN THE FRAME FOLLOWS THE PICTURE.
     *
     * A 4:3 room on a 390-point phone is 298 points tall when it is
     * shown whole. That is arithmetic, not a choice: the only way to
     * make it bigger is to crop it, and cropping is what hid two of
     * Lust's four shelves in the first place.
     *
     * What CAN go is the dead space. The stage was a fixed share of
     * the screen, so raising it from 44% to 60% did not enlarge the
     * picture by a pixel — it just put two hundred points of blurred
     * nothing between the shop and its card. The frame is sized from
     * the fitted picture now, and the card sits directly under it.
     */
    const k = Math.min(
      host.clientWidth / img.naturalWidth,
      (window.innerHeight * 0.58) / img.naturalHeight
    );
    setBox({ w: img.naturalWidth * k, h: img.naturalHeight * k });
  };

  /*
   * ---------------------------------------------------------------
   * LOOKING CLOSER AT A SHELF
   * ---------------------------------------------------------------
   * Amit: *"שפה תהיה לי אפשרות לעשות זום אין לחנות להסתכל מקרוב
   * יותר."*
   *
   * Pinch to zoom, drag to move, and tapping a sparkle takes you to
   * it — which is the one that matters, because hunting for a shelf
   * by pinching is work and pressing the thing you already want is
   * not.
   *
   * Capped at 2.5. The interiors are 3400 pixels wide and the picture
   * is shown at about 390, so 2.5 is still inside the file's own
   * resolution; past that the engine would be inventing detail and he
   * would be looking at mush. It is the file that sets this ceiling,
   * not the code, and the day a larger one arrives the number moves.
   *
   * The sparkles live INSIDE the same transformed box as the picture,
   * so they zoom and pan with it and a mark never drifts off the
   * shelf it points at.
   */
  const MAX_ZOOM = 2.5;
  const [zoom, setZoom] = useState(1);
  const [at, setAt] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const atRef = useRef({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const drag2 = useRef<{ x: number; y: number; from: { x: number; y: number } } | null>(null);

  const clampAt = (z: number, x: number, y: number) => {
    if (!box) return { x: 0, y: 0 };
    const mx = Math.max(0, (box.w * z - box.w) / 2);
    const my = Math.max(0, (box.h * z - box.h) / 2);
    return { x: Math.max(-mx, Math.min(mx, x)), y: Math.max(-my, Math.min(my, y)) };
  };
  const apply = (z: number, x: number, y: number) => {
    const zz = Math.max(1, Math.min(MAX_ZOOM, z));
    const p2 = clampAt(zz, x, y);
    zoomRef.current = zz;
    atRef.current = p2;
    setZoom(zz);
    setAt(p2);
  };

  const down2 = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (pointers.current.size === 2) {
      const [a, b2] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a!.x - b2!.x, a!.y - b2!.y), zoom: zoomRef.current };
      drag2.current = null;
    } else if (pointers.current.size === 1) {
      drag2.current = { x: e.clientX, y: e.clientY, from: { ...atRef.current } };
    }
  };
  const move2 = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b2] = [...pointers.current.values()];
      const d = Math.hypot(a!.x - b2!.x, a!.y - b2!.y);
      apply((pinch.current.zoom * d) / pinch.current.dist, atRef.current.x, atRef.current.y);
      return;
    }
    const d2 = drag2.current;
    if (d2 && zoomRef.current > 1.01) {
      apply(zoomRef.current, d2.from.x + (e.clientX - d2.x), d2.from.y + (e.clientY - d2.y));
    }
  };
  const up2 = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) drag2.current = null;
  };

  /** Press a sparkle: come in close on it, then open the card. */
  const goTo = (i: number, t: { x: number; y: number }) => {
    if (!box) { setOpen(i); return; }
    const z = 2;
    apply(z, (0.5 - t.x) * box.w * z, (0.5 - t.y) * box.h * z);
    window.setTimeout(() => setOpen(i), 260);
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

      <div
        ref={stage}
        style={{ ...S.roomStage, height: box ? box.h : "40%" }}
        onPointerDown={down2}
        onPointerMove={move2}
        onPointerUp={up2}
        onPointerCancel={up2}
      >
        <div
          style={{
            ...S.roomInner,
            width: box ? box.w : "92%",
            height: box ? box.h : undefined,
            transform: shown
              ? `translate(${at.x}px, ${at.y}px) scale(${zoom})`
              : "scale(1.1)",
            transition: pinch.current || drag2.current
              ? "none"
              : "transform 300ms cubic-bezier(.16,.84,.34,1), opacity 420ms ease",
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
              onClick={() => goTo(i, t)}
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

        {/*
          * WHAT THIS TRADE DOES.
          *
          * Amit: *"חייב שיפתחו אפשרויות."* A trade's shop used to be a
          * beautiful room with nothing to do in it. These are the real
          * services of the department the shop stands for, read from
          * the catalogue, and pressing one asks for a professional.
          *
          * The count is shown only where the live snapshot gave one.
          * A trade with no number simply has none — never a zero,
          * which would read as "nobody is free" (/CLAUDE.md §3).
          */}
        {trade && trade.services.length > 0 ? (
          <>
            <p style={S.shelfHint}>מה שאפשר להזמין מכאן</p>
            <div style={S.services}>
              {trade.services.map((sv) => (
                <button
                  key={sv.id}
                  style={S.service}
                  onClick={() => onRequestService?.(sv.id)}
                >
                  <span style={S.serviceName}>{sv.nameHe}</span>
                  {typeof sv.availableNowCount === "number" ? (
                    <span style={S.serviceCount}>{sv.availableNowCount} פנויים עכשיו</span>
                  ) : null}
                  <span style={S.serviceGo}>›</span>
                </button>
              ))}
            </div>
          </>
        ) : null}

        {things.length > 0 ? (
          <>
            <p style={S.shelfHint}>לחצו על הנצנצים במדפים — או כאן</p>
            <div style={S.shelf}>
              {things.map((t, i) => (
                <button key={t.titleHe} style={S.shelfItem} onClick={() => setOpen(i)}>
                  <span style={S.shelfName}>{t.titleHe}</span>
                  {t.priceHe ? <span style={S.shelfPrice}>{t.priceHe}</span> : null}
                </button>
              ))}
            </div>
          </>
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
    color: "rgba(247,243,250,.6)", fontSize: scale.meta,
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
  nameText: { color: "#F7F3FA", fontSize: scale.body, fontWeight: 700 },
  nameGo: { color: "rgba(247,243,250,.6)", fontSize: scale.micro },
  /* Bottom RIGHT, opposite the stick. Centred at bottom:172 it sat on
     the character's head — the one thing on screen the eye is on. */
  enter: {
    position: "absolute", right: 20, bottom: 52,
    border: 0, borderRadius: 999, padding: "13px 26px", background: "#FF6B4A",
    color: "#17121F", fontSize: scale.meta, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
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
    color: "#F7F3FA", fontSize: scale.body, cursor: "pointer", lineHeight: 1,
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
    position: "relative", flex: "0 0 auto", width: "100%", minHeight: 0,
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
  /*
   * A SPARKLE HAS TO SURVIVE A BRIGHT PICTURE — AND STAY A SPARKLE.
   *
   * Two mistakes in a row, in opposite directions.
   *
   * First it was a soft warm dot, which was unmissable on the dark
   * room he first saw and invisible once the room was shown whole and
   * bright: a warm dot on warm cream is the shop's own lighting.
   *
   * Then I fixed the contrast with a 52-point ring — and Amit, at
   * once: *"אני כבר רואה שזה גדול מדי ולא מה שאהבתי."* He is right.
   * A ring that size is a UI control parked on the merchandise. What
   * he liked was a TWINKLE: small, precious, something catching the
   * light on a bottle.
   *
   * So the contrast comes from a hairline dark edge rather than from
   * size — the same trick as an outlined subtitle — and the visible
   * mark is 14 points across. The BUTTON stays 44, because that is
   * the touch floor the sweep enforces, and it is invisible: a big
   * target under a small ornament, which is what a fingertip needs
   * and what the eye should not have to see.
   */
  hint: {
    position: "absolute", left: 20, right: 20, bottom: 158, textAlign: "center",
    color: "rgba(247,243,250,.8)", fontSize: scale.meta, letterSpacing: .2,
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
  /*
   * The row is a SAFETY NET, not the offer. It was competing with the
   * sparkles and winning, and a list of buttons is a catalogue —
   * pressing a bottle on a shelf is a shop.
   */
  services: { display: "flex", flexDirection: "column", gap: 7, padding: "0 0 12px" },
  service: {
    display: "flex", alignItems: "center", gap: 10, width: "100%",
    minHeight: 48, padding: "10px 14px", borderRadius: 14, cursor: "pointer",
    fontFamily: "inherit", textAlign: "right",
    background: "rgba(247,243,250,.1)", border: "1px solid rgba(247,243,250,.18)",
  },
  serviceName: { flex: 1, fontSize: scale.meta, fontWeight: 600, color: "#F7F3FA" },
  serviceCount: { fontSize: scale.micro, color: "rgba(247,243,250,.6)" },
  serviceGo: { fontSize: scale.body, color: "rgba(247,243,250,.5)" },
  shelfHint: {
    margin: "0 0 6px", fontSize: scale.micro, color: "rgba(247,243,250,.45)",
  },
  /*
   * IT WRAPS. IT DOES NOT SCROLL.
   *
   * Amit, on the row of products: *"החץ פה לא פותח משהו אחר ולא גולל."*
   *
   * Two faults in one line. The row was a horizontal scroller, so the
   * fourth product sat half off the edge looking like a control — and
   * it could not be scrolled to, because the city's wrapper carries
   * `touchAction: "none"` so that a drag turns the camera instead of
   * panning the page. That declaration is inherited, and it had
   * silently switched off scrolling for everything inside it.
   *
   * Setting `touch-action` back on this one row would have worked and
   * would have been the wrong fix: a row of four things on a phone
   * should not need scrolling at all. It wraps. Everything is on
   * screen, nothing is half-cut, and there is no gesture to discover.
   */
  shelf: {
    display: "flex", flexWrap: "wrap", gap: 6, padding: "0 0 10px",
  },
  shelfItem: {
    flex: "0 0 auto", display: "flex", alignItems: "center", gap: 7,
    minHeight: 40, padding: "6px 11px",
    borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
    background: "rgba(247,243,250,.07)", border: "1px solid rgba(247,243,250,.13)",
  },
  shelfName: { fontSize: scale.micro, fontWeight: 600, color: "rgba(247,243,250,.86)", whiteSpace: "nowrap" },
  shelfPrice: { fontSize: scale.micro, color: "rgba(247,243,250,.5)" },
  spot: {
    position: "absolute", width: 44, height: 44, marginLeft: -22, marginTop: -22,
    borderRadius: 999, border: 0, padding: 0, cursor: "pointer",
    background: "transparent",
    display: "flex", alignItems: "center", justifyContent: "center",
    animation: "pnSpot 2.1s ease-in-out infinite",
  },
  spotCore: {
    width: 14, height: 14, borderRadius: 999,
    background:
      "radial-gradient(circle, #FFFDF6 0%, #FFF0CF 42%, rgba(255,214,150,.55) 62%, rgba(255,214,150,0) 100%)",
    boxShadow:
      "0 0 0 1px rgba(40,24,12,.55), 0 0 10px 3px rgba(255,226,170,.95), 0 0 22px 8px rgba(255,190,110,.4)",
  },
  roomBar: { position: "relative", flex: "0 0 auto", padding: "14px 20px 24px" },
  roomName: { margin: "0 0 4px", fontSize: scale.section, color: "#F7F3FA" },
  roomTag: { margin: "0 0 8px", fontSize: scale.meta, color: "rgba(247,243,250,.62)" },
  roomLine: { margin: "0 0 14px", fontSize: scale.meta, color: "rgba(247,243,250,.8)" },
  out: {
    width: "100%", border: "1px solid rgba(247,243,250,.24)", borderRadius: 999, padding: 14,
    background: "rgba(247,243,250,.14)", color: "#F7F3FA", fontSize: scale.meta, fontWeight: 700,
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
  sheetName: { margin: "0 0 8px", fontSize: scale.body, color: "#F7F3FA" },
  sheetBody: { margin: "0 0 12px", fontSize: scale.meta, lineHeight: 1.55, color: "rgba(247,243,250,.78)" },
  price: { margin: "0 0 14px", display: "flex", gap: 10, alignItems: "baseline" },
  priceNow: { fontSize: scale.section, color: "#F7F3FA" },
  priceWas: { fontSize: scale.meta, color: "rgba(247,243,250,.5)", textDecoration: "line-through" },
  leaving: { margin: "0 0 10px", fontSize: scale.micro, color: "rgba(247,243,250,.58)", lineHeight: 1.5 },
  site: {
    display: "block", textAlign: "center", borderRadius: 999, padding: 14,
    background: "#FF6B4A", color: "#17121F", fontSize: scale.meta, fontWeight: 700,
    textDecoration: "none",
  },
  sheetClose: {
    width: "100%", marginTop: 10, border: 0, borderRadius: 999, padding: 12,
    background: "transparent", color: "rgba(247,243,250,.6)", fontSize: scale.meta,
    fontFamily: "inherit", cursor: "pointer",
  },
};

/* The keyframes the sparkle needs, injected once. Inline styles cannot
   carry an @keyframes, and this component owns its own look. */
if (typeof document !== "undefined" && !document.getElementById("pn-city-css")) {
  const tag = document.createElement("style");
  tag.id = "pn-city-css";
  tag.textContent =
    "@keyframes pnSpot{0%,100%{transform:scale(.78);opacity:.82}50%{transform:scale(1.26);opacity:1}}" +
    "@keyframes pnFade{0%{opacity:0}12%{opacity:1}72%{opacity:1}100%{opacity:0}}" +
    "@keyframes pnRise{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}";
  document.head.appendChild(tag);
}
