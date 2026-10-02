/**
 * DAY OR NIGHT, BY THE CLOCK ON THE PHONE.
 *
 * A tester's mother: *"תמונת הרקע תותאם לשעת היום — בבוקר מואר, בערב כמו
 * שקיים."* The world is a warm evening because that is how it was
 * painted; in the morning it should look like morning. From six to six
 * it is day, otherwise evening.
 *
 * `?time=day` or `?time=night` pins it, so either can be shown at any
 * hour — a demo at nine in the evening can still show the morning.
 */
export function isDaytime(now: Date = new Date()): boolean {
  try {
    const pinned = new URLSearchParams(window.location.search).get("time");
    if (pinned === "day") return true;
    if (pinned === "night") return false;
  } catch {
    /* no window: fall through to the clock */
  }
  const h = now.getHours();
  return h >= 6 && h < 18;
}
