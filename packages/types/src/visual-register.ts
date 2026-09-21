/**
 * THE LINE BETWEEN WHAT IS DRAWN AND WHAT IS REAL.
 *
 * ---------------------------------------------------------------------
 * AMIT'S DECISION
 * ---------------------------------------------------------------------
 * *"גם את אנשי המקצוע אני רוצה בסגנון של הדמויות שעשינו עכשיו, ובכללי את
 * כל העולם! זה הכיוון שלי!!!! לא אנשים ריאליסטיים. רק שנפתח כרטיס מקצוען
 * שיראו את התמונה האמיתית והפרטים האמיתיים."*
 *
 * ChatGPT's restatement, which is the one worth keeping: the illustrated
 * world is a REPRESENTATION, and the professional's card is REALITY.
 *
 * ---------------------------------------------------------------------
 * WHY THIS IS AN HONESTY RULE AND NOT A STYLE GUIDE
 * ---------------------------------------------------------------------
 * `virtual-venue.ts` already makes it a type error to treat a shop in this
 * world as an address: a venue is the avatar of a candidate the server
 * returned, and it has no coordinates, no street and no door. That rule
 * holds in the type system and can still be broken by the artwork.
 *
 * A photographic city says "this is a real place" in a way no caption
 * undoes. It is the single claim this product is not allowed to make,
 * because there is nothing behind it — the buildings are choices, not
 * premises. An illustrated city says "this is a depiction", which is
 * exactly what it is.
 *
 * And then photographic realism becomes a signal instead of a texture. The
 * one moment a real photograph of a real person appears — inside the
 * professional's card, beside their real name and the server's real
 * figures — it is the only thing in the product that looks real, standing
 * precisely where the product makes a real claim. The likeness comes to
 * mean "from here on, this is actual".
 *
 * So the register is load-bearing, and a future change that quietly drops
 * a photographic building into the world would be a product claim made by
 * an asset pipeline. This file is what makes that fail a test instead.
 */

/** What a piece of art is allowed to assert. */
export type VisualRegister =
  /** Drawn. Says "this is a depiction" and may not look photographic. */
  | "ILLUSTRATION"
  /** A real photograph of a real person, shown beside real server data. */
  | "REALITY";

/**
 * Which register each kind of art belongs to.
 *
 * Keyed by KIND rather than by asset id, so a new district or a new
 * traveller inherits the rule instead of having to be added to a list
 * that somebody will forget.
 */
export type ArtKind =
  | "GROUND"
  | "VENUE"
  | "DISTRICT"
  | "WORLD_CHARACTER"
  | "CATEGORY_PORTRAIT"
  | "TRAVELLER"
  | "AVATAR_PORTRAIT"
  | "AVATAR_WORLD"
  | "PROVIDER_PHOTO";

export const REGISTER_OF: Readonly<Record<ArtKind, VisualRegister>> = {
  /** The plate the whole world stands on. */
  GROUND: "ILLUSTRATION",
  /** A candidate's shopfront — a metaphor for a person, never a premises. */
  VENUE: "ILLUSTRATION",
  /** A trade's landmark on the street. */
  DISTRICT: "ILLUSTRATION",
  /** A professional standing in a doorway, as a figure in the world. */
  WORLD_CHARACTER: "ILLUSTRATION",
  /** The faces on the category tiles — the app's front door. */
  CATEGORY_PORTRAIT: "ILLUSTRATION",
  /** Couriers, vans, the tow truck, the dog walker. */
  TRAVELLER: "ILLUSTRATION",
  /** The customer's chosen face. */
  AVATAR_PORTRAIT: "ILLUSTRATION",
  /** The customer, walking. */
  AVATAR_WORLD: "ILLUSTRATION",
  /**
   * THE ONE EXCEPTION, AND THE REASON FOR ALL THE OTHERS.
   *
   * A professional's own approved photograph, shown inside their card.
   * Null until one exists and never invented — see `CandidatePresence`.
   */
  PROVIDER_PHOTO: "REALITY",
};

/**
 * Where a piece of art in each register is allowed to appear.
 *
 * "WORLD" is the map and everything living on it. "CARD" is a surface
 * that presents one identified professional together with the server's
 * own figures about them.
 */
export type Surface = "WORLD" | "CARD";

export function mayAppearOn(kind: ArtKind, surface: Surface): boolean {
  const register = REGISTER_OF[kind];
  // Reality belongs on the card and nowhere else. A real photograph of a
  // real person standing in the illustrated street would put an actual
  // human at an invented address, which is the exact claim the whole
  // design is built to avoid making.
  if (register === "REALITY") return surface === "CARD";
  // Illustration is allowed anywhere: a drawn figure on a card claims
  // nothing, it just says less.
  return true;
}

/**
 * The register an asset id belongs to, from its name.
 *
 * The ids ARE the file names and follow one scheme, so the prefix is
 * enough — which is what keeps a new file from needing a code change to
 * be governed.
 */
export function kindOfAssetId(assetId: string): ArtKind | null {
  if (assetId.startsWith("avatar_") && assetId.endsWith("_portrait")) return "AVATAR_PORTRAIT";
  if (assetId.startsWith("avatar_") && assetId.endsWith("_world_back")) return "AVATAR_WORLD";
  if (assetId.startsWith("district_")) return "DISTRICT";
  if (assetId.startsWith("character_") && assetId.endsWith("_world")) return "WORLD_CHARACTER";
  if (assetId.startsWith("character_") && assetId.endsWith("_icon")) return "CATEGORY_PORTRAIT";
  if (assetId.startsWith("world_") || assetId.startsWith("shared_ground")) return "GROUND";
  return null;
}

/** Everything wrong with the register model, as a test rather than prose. */
export function registerViolations(): string[] {
  const out: string[] = [];

  // Exactly one kind may be photographic. If a second ever appears, it is
  // a product decision and has to be made deliberately rather than by
  // somebody adding a row.
  const real = Object.entries(REGISTER_OF).filter(([, r]) => r === "REALITY");
  if (real.length !== 1 || real[0]?.[0] !== "PROVIDER_PHOTO") {
    out.push(`only a provider's own photo may be photographic, found: ${real.map(([k]) => k).join(", ")}`);
  }

  // Nothing photographic may stand in the world.
  for (const kind of Object.keys(REGISTER_OF) as ArtKind[]) {
    if (REGISTER_OF[kind] === "REALITY" && mayAppearOn(kind, "WORLD")) {
      out.push(`${kind} is photographic and is allowed in the world`);
    }
  }

  // Every id scheme the world actually uses must be recognised, or the
  // rule silently stops covering the files it was written for.
  for (const id of [
    "world_neighbourhood",
    "district_hair",
    "character_hair_world",
    "character_hair_icon",
    "avatar_01_portrait",
    "avatar_01_world_back",
  ]) {
    const kind = kindOfAssetId(id);
    if (!kind) out.push(`"${id}" is not covered by the register`);
    else if (REGISTER_OF[kind] !== "ILLUSTRATION") {
      out.push(`"${id}" is in the world and is not an illustration`);
    }
  }

  return out;
}


/**
 * ---------------------------------------------------------------------
 * WHAT MAY NOT APPEAR ON ANY OF IT
 * ---------------------------------------------------------------------
 * The fitness trainer arrived wearing Under Armour: the logo on his
 * shirt, on his shorts, and on both shoes. It was drawn in good faith —
 * the brief said "a trainer", and that is what a trainer looks like in
 * the reference material a generator has seen.
 *
 * It is a registered mark of a real company, on a character that would
 * sit inside a commercial product, in a shop. Cheap to catch here and
 * expensive to catch after the app is published, which is the shape of
 * every problem this file exists for.
 *
 * `/docs/18-ROADMAP.md` already lists brand and trademark clearance as a
 * decision nobody here may make. This is the standing instruction that
 * keeps the question from arising in the first place: the art is of
 * PEOPLE DOING WORK, and everything they wear and carry is plain.
 *
 * It cannot be checked from a `.webp`, so it lives here as the brief
 * rather than as a function — written down where the next person to
 * commission a figure will read it, which is the only enforcement a
 * drawing rule can have.
 */
export const ART_BRAND_RULE = {
  /** No logo, wordmark or recognisable livery on clothing. */
  clothing: "plain",
  /** Tools and cases carry no maker's mark. */
  tools: "unbranded",
  /** Vehicles carry PRO NOW or nothing — never a real fleet's colours. */
  vehicles: "PRO NOW or nothing",
  /** Shop signage is the trade's own icon; no street brand, no address. */
  signage: "trade icon only",
} as const;
