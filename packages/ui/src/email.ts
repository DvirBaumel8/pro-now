/** Enough to catch a typo before a sign-in link goes nowhere; the server decides. */
export function isPlausibleEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

/**
 * An address with a zero-width break opportunity after each "@" and ".",
 * so a long one wraps at a natural point instead of running off the screen
 * (QA W2). Invisible, and not copied as a character anyone would notice.
 */
export function breakableEmail(v: string): string {
  return v.replace(/([@.])/g, "$1​");
}
