/**
 * THE DISTRICTS — one entry per department, and the whole world becomes
 * trade-agnostic.
 *
 * ---------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------
 * The Living Map was built as a Hair vertical slice, deliberately: prove
 * one world completely before duplicating it eleven times. That was the
 * right way to find out whether the idea worked, and it did.
 *
 * Then Amit said the thing that ends that phase:
 *
 *     "בבקשה תתרכזו בהכל ולא רק במספרה."
 *
 * He is right, and the cost is almost entirely art rather than code — the
 * composition engine, the camera, the director, the venues and the play
 * layer never knew what a barber was. What WAS hair-shaped was a handful of
 * hard-coded ids scattered through the UI, which is exactly the kind of
 * thing that turns "add a trade" into an afternoon instead of a line.
 *
 * So the knowledge lives here, once. A department has a district; a
 * district has a venue, a character, a Hebrew label and a brand suffix.
 * Adding a trade is an entry in this table and two image files. Nothing in
 * `LivingMapScene`, `VenueLayer` or `WorldStage` changes, ever.
 */

/** Every department in the pilot catalogue. */
export type DepartmentCode =
  | "HOME_URGENT"
  | "APPLIANCES"
  | "HOME_CARE"
  | "BEAUTY"
  | "WELLNESS"
  | "PETS"
  | "VEHICLE"
  | "LOGISTICS"
  | "TECH"
  | "ODD_JOBS"
  | "IMPROVEMENT";

export interface WorldDistrict {
  department: DepartmentCode;
  /**
   * The word after the wordmark on the sign — IN HEBREW.
   *
   * Amit: *"תשאירו רק את הלוגו של פרו נאו באנגלית, כל השאר בעברית שיבינו
   * את המקצועות."* He is right, and the first version had it backwards: a
   * street of signs reading HOME, APPLIANCE, CARE and BUILD is legible to
   * a designer and not to the customer standing in Holon at eleven at
   * night with a burst pipe.
   *
   * So PRO NOW stays English, because a wordmark is a wordmark, and the
   * trade is Hebrew, because the trade is information.
   *
   * The rest of the branding rule is unchanged: the sign appears on venues
   * that are ours, never on residential blocks, the kiosk or passing
   * traffic. A screenshot should read as PRO NOW with the HUD off, without
   * the neighbourhood turning into a theme park.
   */
  brandHe: string;
  labelHe: string;
  /** The illustrated venue that stands for a candidate in this trade. */
  venueAssetId: string;
  /**
   * THE SAME SHOP, FROM INSIDE IT.
   *
   * Amit: *"איך עושים שבלחיצה על המקצוען נכנסים לתוך החנות שלו ממש
   * בפנים, שיראו את הדברים הקטנים שעבדנו עליהם?"*
   *
   * `venueAssetId` is the shopfront: the building you see from the
   * street, sized for a row of them. It is the wrong picture for going
   * in — blown up it is a façade with the detail on the wrong side of
   * the glass.
   *
   * This is the other picture, and it is a different brief: a view from
   * inside, at eye level, where the shelves, the bench and the tools are
   * the subject rather than the sign. The barber's has been in the pack
   * since the beginning and is the reason the convention is `_hero`.
   *
   * Optional, and the card falls back to the shopfront when it is
   * missing — the same rule as everywhere else: the world fills in as
   * assets land, and nothing is invented to cover a gap.
   */
  venueInteriorAssetId?: string;
  /**
   * WHAT THIS TRADE ARRIVES IN.
   *
   * The tracking screen used to send a courier's scooter down the lane
   * whatever had been ordered — so a customer whose car would not start
   * watched a food-delivery moped drive towards their house, and somebody
   * moving flat watched the same moped come for their sofa. The route, the
   * ETA and the professional were all correct; the only wrong thing was
   * the one moving picture on the screen.
   *
   * Left unset, the scooter is the honest default: most trades arrive on
   * two wheels with a bag, and a plumber on a scooter is a small claim
   * compared with a tow truck for a haircut.
   */
  travelAssetId?: string;
  /**
   * THE PRO NOW VEHICLE THIS TRADE DRIVES.
   *
   * Amit: *"שיבינו שזה רכב של הבעל מקצוע הרלוונטיייי, ואז במפה
   * שממתינים אני רוצה שיראו את הרכב הזה נוסע אליו לבית במסלול."*
   *
   * This is not the scooter argument again. The scooter was wrong
   * because ONE picture stood in for eleven trades, so it said nothing
   * about who was coming — these say the trade out loud: a plumber's
   * pod has pipe on the roof, the vet's has a kennel hatch, the tow has
   * a bed. A vehicle that names the trade is the thing he asked for
   * both times, and the figure on foot stays for any trade that has no
   * vehicle drawn yet rather than borrowing another trade's.
   */
  travelVehicleAssetId?: string;
  /**
   * Other shopfronts belonging to this same trade.
   *
   * Amit, more than once: *"רוצה שיטיילו ברחובות ויהיו מגוון אפשרויות מכל
   * סוג שבוחרים."* Three hairdressers online drew three identical
   * buildings, which reads as one shop copied — a catalogue with a roof,
   * exactly what the world was built to stop being.
   *
   * So a trade can own several fronts and each candidate gets a different
   * one. It changes nothing about what a venue MEANS: a building still
   * appears because the server returned a person, and the art is only how
   * that person's place looks. A trade with one front is unaffected.
   */
  venueVariantAssetIds?: readonly string[];
  /** Full body, 3/4, lives in the world. */
  characterWorldAssetId: string;
  /** Waist-up, near-frontal, legible at 56–80px in the category grid. */
  characterPortraitAssetId: string;
}

/**
 * THE PRODUCTION LIST.
 *
 * Every id here is a file that has to exist. Most do not yet, and that is
 * the point of writing them down: this table IS the art commission, and
 * `AssetSlot` draws an honest grey rectangle for everything still missing
 * rather than letting an absence pass unnoticed.
 *
 * The character ids carry no gender in their names on purpose. Gender is
 * not tied to trade — the roster is mixed across every field rather than a
 * male default with one female variant — so the file name says what the
 * person does, never who they are.
 */
/*
 * THE IDS ARE THE ART DIRECTOR'S FILE NAMES, DELIBERATELY.
 *
 * They used to be ours (`venue_home_urgent`, `char_beauty_portrait`) and
 * the art arrives named something else (`district_home.webp`,
 * `character_hair_icon.webp`). Two naming schemes for one file means a
 * translation table, and a translation table means the day somebody adds a
 * trade, updates one side and not the other, and a building silently stops
 * loading with no error anywhere.
 *
 * So we moved to theirs rather than asking them to move to ours. The id IS
 * the file name without its extension, and a file that arrives works.
 */
export const WORLD_DISTRICTS: Readonly<Record<DepartmentCode, WorldDistrict>> = {
  HOME_URGENT: {
    department: "HOME_URGENT",
    brandHe: "תיקונים",
    labelHe: "תיקונים דחופים בבית",
    venueAssetId: "district_home",
    venueInteriorAssetId: "home_workshop_hero",
    characterWorldAssetId: "character_home_world",
    characterPortraitAssetId: "character_home_icon",
  },
  APPLIANCES: {
    department: "APPLIANCES",
    travelVehicleAssetId: "pn_appliance_side",
    brandHe: "מכשירי חשמל",
    labelHe: "מכשירי חשמל ומיזוג",
    venueAssetId: "district_appliance",
    venueInteriorAssetId: "appliance_workshop_hero",
    characterWorldAssetId: "character_appliance_world",
    characterPortraitAssetId: "character_appliance_icon",
  },
  HOME_CARE: {
    department: "HOME_CARE",
    travelVehicleAssetId: "pn_clean_side",
    brandHe: "ניקיון",
    labelHe: "ניקיון ותחזוקת בית",
    venueAssetId: "district_care",
    venueInteriorAssetId: "care_studio_hero",
    characterWorldAssetId: "character_care_world",
    characterPortraitAssetId: "character_care_icon",
  },
  BEAUTY: {
    department: "BEAUTY",
    travelVehicleAssetId: "pn_beauty_side",
    brandHe: "שיער",
    labelHe: "טיפוח ויופי",
    venueAssetId: "district_hair",
    venueInteriorAssetId: "hair_barbershop_hero",
    // A salon and a nail bar: two real shapes for one trade, so two
    // beauticians online are two different places rather than one twice.
    venueVariantAssetIds: ["district_hair", "district_nails"],
    characterWorldAssetId: "character_hair_world",
    characterPortraitAssetId: "character_hair_icon",
  },
  WELLNESS: {
    department: "WELLNESS",
    travelVehicleAssetId: "pn_well_side",
    brandHe: "כושר",
    labelHe: "בריאות וכושר",
    venueAssetId: "district_well",
    venueInteriorAssetId: "well_studio_hero",
    characterWorldAssetId: "character_well_world",
    characterPortraitAssetId: "character_well_icon",
  },
  PETS: {
    department: "PETS",
    travelVehicleAssetId: "pn_vet_side",
    brandHe: "חיות",
    labelHe: "בעלי חיים",
    venueAssetId: "district_pets",
    venueInteriorAssetId: "pets_salon_hero",
    travelAssetId: "dog_walker",
    characterWorldAssetId: "character_pets_world",
    characterPortraitAssetId: "character_pets_icon",
  },
  VEHICLE: {
    department: "VEHICLE",
    travelVehicleAssetId: "pn_tow_side",
    brandHe: "רכב",
    labelHe: "שירותים לרכב",
    venueAssetId: "district_auto",
    venueInteriorAssetId: "auto_garage_hero",
    travelAssetId: "tow_truck",
    characterWorldAssetId: "character_auto_world",
    characterPortraitAssetId: "character_auto_icon",
  },
  LOGISTICS: {
    department: "LOGISTICS",
    brandHe: "הובלות",
    labelHe: "הובלות ומשלוחים",
    venueAssetId: "district_move",
    venueInteriorAssetId: "move_depot_hero",
    travelAssetId: "moving_van",
    characterWorldAssetId: "character_move_world",
    characterPortraitAssetId: "character_move_icon",
  },
  TECH: {
    department: "TECH",
    travelVehicleAssetId: "pn_tech_side",
    brandHe: "מחשבים",
    labelHe: "מחשבים וסלולר",
    venueAssetId: "district_tech",
    venueInteriorAssetId: "tech_shop_hero",
    characterWorldAssetId: "character_tech_world",
    characterPortraitAssetId: "character_tech_icon",
  },
  ODD_JOBS: {
    department: "ODD_JOBS",
    brandHe: "עזרה",
    labelHe: "עזרה ועבודות קטנות",
    venueAssetId: "district_help",
    venueInteriorAssetId: "help_yard_hero",
    characterWorldAssetId: "character_help_world",
    characterPortraitAssetId: "character_help_icon",
  },
  IMPROVEMENT: {
    department: "IMPROVEMENT",
    brandHe: "שיפוצים",
    labelHe: "שיפוץ והתקנות",
    venueAssetId: "district_build",
    venueInteriorAssetId: "build_workshop_hero",
    characterWorldAssetId: "character_build_world",
    characterPortraitAssetId: "character_build_icon",
  },
};

/**
 * The district for a department, falling back to the one that fits almost
 * anything. A department with no district is a bug rather than a crash: the
 * customer still gets a world, and the missing entry shows up as the wrong
 * sign over the door, which somebody notices.
 */
export function districtFor(departmentCode: string): WorldDistrict {
  return WORLD_DISTRICTS[departmentCode as DepartmentCode] ?? WORLD_DISTRICTS.HOME_URGENT;
}

/**
 * The sign over a venue: the wordmark in English, the trade in Hebrew.
 *
 * "PRO NOW שיער". Mixing scripts on one sign is deliberate — the English
 * half is a logo and the Hebrew half is what the customer needs to read.
 */
export function districtSign(district: WorldDistrict): string {
  return `PRO NOW ${district.brandHe}`;
}

/**
 * Every art file the world needs, across every trade.
 *
 * Generated from the table rather than typed out, so it cannot drift from
 * it. This is what gets handed over as the commission, and what a coverage
 * check counts against.
 */
export function requiredDistrictAssets(): string[] {
  /*
   * Deduplicated, because a trade's primary front usually appears in its
   * own variant list too. This is the commission handed to the art
   * director, and asking twice for one file is how a list stops being
   * trusted.
   */
  return [
    ...new Set(
      Object.values(WORLD_DISTRICTS).flatMap((d) => [
        d.venueAssetId,
        ...(d.venueVariantAssetIds ?? []),
        d.characterWorldAssetId,
        d.characterPortraitAssetId,
      ])
    ),
  ];
}

/** Which districts have no art yet. The honest progress bar. */
export function missingDistrictAssets(availableAssetIds: readonly string[]): string[] {
  const have = new Set(availableAssetIds);
  return requiredDistrictAssets().filter((id) => !have.has(id));
}


/**
 * Which shopfront a given candidate of this trade gets.
 *
 * By index, so the same candidate keeps the same building for as long as
 * the list holds — a shop that changed shape between renders would read as
 * a different business. There is no meaning in which variant somebody
 * gets: it is not a rank, a price band or a quality signal, and anything
 * that made it one would be a claim about a professional made by an
 * artwork.
 */
export function venueAssetFor(district: WorldDistrict, index: number): string {
  const variants = district.venueVariantAssetIds;
  if (!variants || variants.length === 0) return district.venueAssetId;
  return variants[Math.abs(index) % variants.length]!;
}

/**
 * What comes down the lane for this trade.
 *
 * ---------------------------------------------------------------------
 * THE PERSON, NOT A SCOOTER
 * ---------------------------------------------------------------------
 * The fallback used to be `courier_scooter`, and the note beside it
 * argued that a scooter is modest: two wheels and a bag, true of most of
 * this catalogue, where a tow truck for a haircut would be a picture of
 * a different job. The second half of that is right and the first half
 * is wrong, and Amit said why in one line: *"למה אני לא רואה פה את
 * המקצוען שהזמנתי הולך אליי ברגל? ואני רואה תמונה של קטנוע, אין קשר."*
 *
 * He is watching a named person come to his house. Drawing a delivery
 * scooter instead does not say "modest", it says "this is not the person
 * you chose" — and for eight of the eleven trades it is not even close
 * to how they travel. Worse, the art for all eleven professionals has
 * been on the street the whole time: the same figure standing in the
 * doorway of the shop he just left.
 *
 * So the default is that professional, on foot. `travelAssetId` stays
 * for the three trades whose vehicle IS the job — a tow truck, a moving
 * van, a dog walker with dogs — because there the vehicle is the thing
 * being sent for.
 */
export function travelAssetFor(department: DepartmentCode): string {
  const district = WORLD_DISTRICTS[department];
  /*
   * The vehicle first, now that there is one per trade rather than one
   * for all of them. Where a trade has no vehicle drawn yet this falls
   * through to exactly what it did before, which is why the roads do
   * not empty out while the rest of the fleet is being drawn.
   */
  return (
    district.travelVehicleAssetId ??
    district.travelAssetId ??
    district.characterWorldAssetId
  );
}

/** Trades whose vehicle has not been drawn yet. The honest list. */
export function tradesWithoutVehicle(): DepartmentCode[] {
  return (Object.keys(WORLD_DISTRICTS) as DepartmentCode[]).filter(
    (d) => !WORLD_DISTRICTS[d].travelVehicleAssetId
  );
}

/**
 * TWO KINDS OF PLACE A TRADE CAN STAND IN.
 *
 * ---------------------------------------------------------------------
 * WHERE THIS CAME FROM
 * ---------------------------------------------------------------------
 * Amit, deciding what happens to the roads that stop in the middle of a
 * real extract:
 *
 *     "אפשר לוותר עליהם ולשים שם מדשאות ועסקים שלנו עתידיים. דוג ווקרים
 *      ומאמני כושר, לא יודע."
 *
 * ChatGPT, on reading that it had been built:
 *
 *     "הניקוי של dead-end לא־נגישים עושה משהו מעבר לאסתטיקה: הוא יוצר
 *      לכם שני סוגי מרחב טבעיים — רחוב לשירותים עם home base, ו-green/
 *      open zone למקצוענים שלא אמורים לקבל חזית בכלל... הייתי שומר את
 *      ההבחנה הזאת גם בטיפוסים ולא רק ברנדרר."
 *
 * It is right, and it fixes something that has been slightly wrong since
 * the first district was drawn. A city made entirely of shopfronts says
 * every trade works out of premises, and several of ours plainly do not:
 * a dog walker works in a park, a trainer works wherever you are. Giving
 * them a shopfront is a small untruth told by the artwork, and it is the
 * kind that only becomes visible once the streets are real.
 *
 * Kept as a property of the TRADE rather than as a rule in the renderer,
 * so a screen cannot quietly disagree with another screen about whether
 * a trade has a door.
 */
export type TradeGround =
  /** Works out of premises; stands on a frontage. */
  | "SHOPFRONT"
  /** Works in the open; stands in a park or a square, never in a doorway. */
  | "OPEN_GROUND";

/**
 * Which trades have no door.
 *
 * Deliberately short. A trade is listed here only when a shopfront would
 * be actively wrong — not merely when some of its professionals travel,
 * because nearly all of them do: this is a NOW product and almost every
 * job happens at the customer's address. A plumber has a workshop; a dog
 * walker has a park.
 *
 * `WELLNESS` covers fitness training and `PETS` covers dog walking, which
 * are the two Amit named. Anything else joining them is a product
 * decision and belongs in a commit message, not in a default.
 */
const OPEN_GROUND_TRADES: ReadonlySet<DepartmentCode> = new Set<DepartmentCode>([
  "WELLNESS",
  "PETS",
]);

export function tradeGround(department: DepartmentCode): TradeGround {
  return OPEN_GROUND_TRADES.has(department) ? "OPEN_GROUND" : "SHOPFRONT";
}

/**
 * Everything wrong with the split, as a test rather than prose.
 *
 * The failure mode it guards is the one that would be invisible: every
 * trade quietly becoming OPEN_GROUND, or the set growing until the
 * street has nothing on it.
 */
export function tradeGroundViolations(): string[] {
  const out: string[] = [];
  const all = Object.keys(WORLD_DISTRICTS) as DepartmentCode[];
  const open = all.filter((d) => tradeGround(d) === "OPEN_GROUND");
  if (open.length === 0) out.push("no trade works in the open, so the parks are decoration");
  if (open.length > all.length / 3) {
    out.push(`${open.length} of ${all.length} trades have no premises, which empties the street`);
  }
  for (const code of OPEN_GROUND_TRADES) {
    if (!(code in WORLD_DISTRICTS)) out.push(`${code} works in the open and is not a trade`);
  }
  return out;
}
