/**
 * Is this number plausible enough to send an SMS to?
 *
 * It exists so the sign-in button can be honest: enabled only when the
 * number could actually receive a code. A button that lights up for anything
 * and then fails teaches people the app is broken rather than that they
 * mistyped — and sign-in is where a product loses users it never meets.
 *
 * Deliberately a plausibility check, not a validity claim. Only the SMS
 * provider knows whether a number exists, and that provider has not been
 * chosen yet (/CLAUDE.md §4).
 */

/** Israeli mobile prefixes in service. Landlines cannot receive an SMS. */
const MOBILE_PREFIXES = ["050", "051", "052", "053", "054", "055", "058"];

export function isPlausibleILPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");

  // International form: 972 + a 9-digit national number beginning with 5.
  if (digits.startsWith("972")) {
    const national = `0${digits.slice(3)}`;
    return national.length === 10 && MOBILE_PREFIXES.includes(national.slice(0, 3));
  }

  return digits.length === 10 && MOBILE_PREFIXES.includes(digits.slice(0, 3));
}
