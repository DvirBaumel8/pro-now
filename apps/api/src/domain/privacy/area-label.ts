/**
 * Coarse area label for pre-assignment display.
 *
 * /docs/12-PRIVACY.md and /docs/03-DESIGN-SYSTEM.md §10 both require that a
 * professional NOT see a customer's precise location before the job is
 * assigned to them. The offer card therefore shows an approximate area.
 *
 * The schema has no neighbourhood/area column — `Address` stores only a
 * `formatted` string plus coordinates — so the area is derived here rather
 * than invented as a new field. Deriving it in one tested function (instead
 * of inline in a route) is deliberate: this is a privacy control, and a
 * privacy control that is not tested is a privacy control that silently
 * regresses.
 *
 * The rule: drop any leading component that carries a street number, keep at
 * most the two broadest remaining components, and never emit a digit.
 */

/** Shown when nothing safe can be derived — vague on purpose. */
export const AREA_LABEL_FALLBACK = "באזור שלך";

const DIGITS = /\d/;

export function coarseAreaLabel(formattedAddress: string | null | undefined): string {
  if (!formattedAddress) return AREA_LABEL_FALLBACK;

  const parts = formattedAddress
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (parts.length === 0) return AREA_LABEL_FALLBACK;

  // A component containing a digit is a street number, a building number or a
  // postcode — all of them narrow the location further than is permitted here.
  const safe = parts.filter((p) => !DIGITS.test(p));
  if (safe.length === 0) return AREA_LABEL_FALLBACK;

  // A single remaining component is the city; two are neighbourhood + city.
  // Anything more would start to re-identify the street.
  const chosen = safe.slice(-2);

  const label = chosen.join(", ");
  // Belt and braces: the returned string must never carry a number.
  return DIGITS.test(label) ? AREA_LABEL_FALLBACK : label;
}
