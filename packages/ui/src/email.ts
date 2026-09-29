/** Enough to catch a typo before a sign-in link goes nowhere; the server decides. */
export function isPlausibleEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}
