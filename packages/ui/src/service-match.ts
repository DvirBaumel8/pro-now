/**
 * "תאר מה קרה" — turning a sentence into the right service.
 *
 * Most people do not know whether a wet patch under the sink is plumbing,
 * sealing or appliance work, and being asked to pick a category before you
 * can ask for help is the tax this product exists to remove. So the entry
 * point is a sentence, not a taxonomy.
 *
 * TWO THINGS THIS DELIBERATELY IS NOT:
 *
 * 1. **It does not match professionals.** It matches *services*. Which
 *    professional comes is decided by dispatch, from eligibility, presence
 *    and proximity (/CLAUDE.md §3 — the server is authoritative for
 *    assignment). A text box must never be able to pick a person, or the
 *    two most important guarantees in the product — verified for THIS
 *    service, actually online — would be bypassed by typing.
 *
 * 2. **It is not intelligence, and does not pretend to be.** This is a
 *    deterministic keyword matcher, small enough to read in a minute and
 *    fully unit-tested. A real intent classifier is a server feature with a
 *    model behind it; shipping a lookup table dressed up as understanding
 *    would be a mocked capability presented as a real one, which §3 rules
 *    out. The UI therefore says "נראה שזה…" and offers a choice, rather
 *    than announcing that it understood.
 *
 * When nothing matches, that is a result too: the screen says so and shows
 * the full catalogue, instead of guessing at the nearest service.
 */

export interface ServiceMatchRule {
  serviceId: string;
  /** Words and fragments a person would actually type, not category names. */
  keywords: string[];
}

export interface ServiceMatch {
  serviceId: string;
  /** How many distinct rule keywords the text hit. Used only for ordering. */
  score: number;
}

/** Hebrew prefixes that would otherwise defeat a plain substring match. */
const PREFIXES = ["ה", "ו", "ב", "כ", "ל", "מ", "ש"];

function normalise(text: string): string {
  return text
    .toLowerCase()
    // Strip niqqud and punctuation; keep Hebrew, Latin and digits.
    .replace(/[֑-ׇ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string): string[] {
  const words = normalise(text).split(" ").filter(Boolean);
  const out = new Set<string>();
  for (const w of words) {
    out.add(w);
    // "הברז" should match a rule written as "ברז".
    for (const p of PREFIXES) {
      if (w.length > p.length + 1 && w.startsWith(p)) out.add(w.slice(p.length));
    }
  }
  return [...out];
}

/**
 * Services that plausibly fit the text, best first.
 *
 * Returns an empty array rather than a weak guess: sending someone to the
 * wrong trade wastes a call-out fee and a morning, and "we are not sure,
 * here is everything" is a better answer than a confident mistake.
 */
export function matchServicesByText(text: string, rules: ServiceMatchRule[]): ServiceMatch[] {
  const typed = tokens(text);
  if (typed.length === 0) return [];

  const scored: ServiceMatch[] = [];
  for (const rule of rules) {
    let score = 0;
    for (const keyword of rule.keywords) {
      const k = normalise(keyword);
      if (!k) continue;
      // A multi-word keyword must appear as a phrase; a single word may match
      // any typed token, including one that had a prefix stripped.
      const hit = k.includes(" ")
        ? normalise(text).includes(k)
        : typed.some((t) => t === k || (t.length > 3 && k.length > 3 && t.includes(k)));
      if (hit) score += 1;
    }
    if (score > 0) scored.push({ serviceId: rule.serviceId, score });
  }

  const ranked = scored.sort((a, b) => b.score - a.score || a.serviceId.localeCompare(b.serviceId));

  /**
   * DROP THE LONG TAIL. A weak match beside a strong one is worse than no
   * second match at all.
   *
   * The case that forced this: "יש מים מתחת לכיור במטבח" scored 3 for
   * פתיחת סתימה — and 1 for נגרות, because a carpenter's keyword list
   * contains "מטבח". The screen then offered "נגרות" as the second
   * suggestion for a plumbing emergency, which does not read as a ranked
   * list; it reads as the app not understanding Hebrew. One shared noun is
   * coincidence, and coincidence should not get a row on the screen.
   *
   * The rule, in two parts:
   *
   *   - A single keyword hit never survives beside anything stronger. One
   *     shared noun IS the coincidence case, and no amount of arithmetic
   *     makes it evidence.
   *   - Beyond that, a match must reach half the top score.
   *
   * The top match always survives, and a genuine tie always survives — this
   * removes noise, never the answer. When the best anyone managed is a
   * single keyword, that single keyword is the answer and is kept.
   */
  const top = ranked[0]?.score ?? 0;
  const floor = top >= 2 ? Math.max(2, Math.ceil(top / 2)) : 1;
  return ranked.filter((m) => m.score >= floor);
}
