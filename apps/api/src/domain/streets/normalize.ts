/**
 * Names in Israel's official street list, as people type them.
 *
 * The list abbreviates ("שד הרצל", "סמ השקד", "רח 3003") and punctuates
 * ("תל אביב - יפו", "קרית מוצקין", "בסמ\"ה"). Nobody types it that way, and a
 * geocoder does not read it that way either, so names are shown expanded and
 * compared stripped.
 */

const ABBREVIATIONS: Record<string, string> = {
  שד: "שדרות",
  סמ: "סמטת",
  שכ: "שכונת",
  ש: "שיכון",
  רח: "רחוב",
  ככר: "כיכר",
};

/** "שד הרצל", "שד' הרצל" → "שדרות הרצל". Only a leading abbreviation, as the list writes them. */
export function expandStreetName(name: string): string {
  const tidy = name.trim().replace(/\s+/g, " ");
  const [first, ...rest] = tidy.split(" ");
  const full = first ? ABBREVIATIONS[first.replace(/['׳]/g, "")] : undefined;
  return full && rest.length > 0 ? [full, ...rest].join(" ") : tidy;
}

const STREET_TYPES = new Set(["רחוב", "שדרות", "סמטת", "שכונת", "כיכר", "דרך", "משעול", "שביל"]);

/** "שדרות הרצל" → "הרצל": OpenStreetMap often names the street without its type. */
export function withoutStreetType(name: string): string {
  const words = expandStreetName(name).split(" ");
  return words.length > 1 && STREET_TYPES.has(words[0]!) ? words.slice(1).join(" ") : words.join(" ");
}

/**
 * The form search compares: lower case, no quotes or geresh, every other
 * mark a space. "תל אביב - יפו" and "תל-אביב" both become words "תל אביב …".
 */
export function searchForm(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("he")
    .replace(/['"`׳״]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Looser still, for deciding whether a geocoder's answer names the place we
 * asked about: no spaces, no street-type word, and no ו or י, which the
 * official list and OpenStreetMap spell differently ("קרית" / "קריית").
 * "תל־אביב–יפו" equals "תל אביב - יפו", and "שדרות הרצל" equals "הרצל".
 */
export function sameNameKey(value: string): string {
  const words = searchForm(expandStreetName(value)).split(" ");
  const kept = words.length > 1 ? words.filter((w) => !STREET_TYPES.has(w)) : words;
  return kept.join("").replace(/[וי]/g, "");
}

export interface ParsedStreetQuery {
  /** Words to find in the street or locality name, in search form. */
  words: string[];
  /** The house number, when the query has one ("הרצל 12", "12 הרצל", "הרצל 12א"). */
  houseNumber: string | null;
}

const HOUSE_NUMBER = /^\d{1,4}[א-ת]?$/;

/**
 * What someone typed into the address box. The last number is the house
 * number; any earlier one is part of a name ("רחוב 3003 5").
 */
export function parseStreetQuery(text: string): ParsedStreetQuery {
  const tokens = searchForm(text).split(" ").filter(Boolean);
  let houseAt = -1;
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (HOUSE_NUMBER.test(tokens[i]!)) {
      houseAt = i;
      break;
    }
  }
  return {
    words: tokens.filter((_, i) => i !== houseAt),
    houseNumber: houseAt >= 0 ? tokens[houseAt]! : null,
  };
}
