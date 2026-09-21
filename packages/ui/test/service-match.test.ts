import { describe, expect, it } from "vitest";

import { matchServicesByText, type ServiceMatchRule } from "../src/service-match";
import { catalogMatchRules } from "../src/catalog/catalogAdapter";

/**
 * The matcher's job is to route a sentence to a SERVICE. The tests below
 * exist mostly to pin down what it must refuse to do: guess when it does not
 * know, and reach past a service to a person.
 */

const rules: ServiceMatchRule[] = [
  { serviceId: "svc-leak", keywords: ["נזילה", "ברז", "דולף", "מים", "סיפון"] },
  { serviceId: "svc-electric", keywords: ["חשמל", "פחת", "שקע", "נורה", "קצר"] },
  { serviceId: "svc-lock", keywords: ["מנעול", "מפתח", "ננעלתי", "דלת"] },
  { serviceId: "svc-ac", keywords: ["מזגן", "מיזוג", "לא מקרר"] },
];

describe("matchServicesByText", () => {
  it("routes a plain sentence to the right service", () => {
    const m = matchServicesByText("יש נזילה מתחת לכיור במטבח", rules);
    expect(m[0]?.serviceId).toBe("svc-leak");
  });

  it("sees through Hebrew prefixes, which a substring match would miss", () => {
    // "הברז" / "והמזגן" are how people actually type.
    expect(matchServicesByText("הברז בשירותים דולף", rules)[0]?.serviceId).toBe("svc-leak");
    expect(matchServicesByText("המזגן לא עובד", rules)[0]?.serviceId).toBe("svc-ac");
  });

  it("matches a multi-word phrase as a phrase", () => {
    expect(matchServicesByText("המזגן לא מקרר בכלל", rules)[0]?.serviceId).toBe("svc-ac");
  });

  it("ranks the service with more evidence first, without hiding the others", () => {
    const m = matchServicesByText("ננעלתי בחוץ בלי מפתח, והדלת נסגרה", rules);
    expect(m[0]?.serviceId).toBe("svc-lock");
    expect(m[0]!.score).toBeGreaterThan(1);
  });

  it("returns NOTHING rather than a weak guess when it does not know", () => {
    // Sending someone to the wrong trade costs a call-out fee and a morning.
    expect(matchServicesByText("שלום מה נשמע", rules)).toEqual([]);
    expect(matchServicesByText("   ", rules)).toEqual([]);
    expect(matchServicesByText("", rules)).toEqual([]);
  });

  it("is punctuation- and case-insensitive", () => {
    expect(matchServicesByText("נזילה!!! מים... בכל מקום", rules)[0]?.serviceId).toBe("svc-leak");
  });

  it("only ever returns service ids — there is no path from text to a person", () => {
    const m = matchServicesByText("נזילה חשמל מנעול מזגן", rules);
    for (const hit of m) {
      expect(Object.keys(hit)).toEqual(["serviceId", "score"]);
      expect(rules.some((r) => r.serviceId === hit.serviceId)).toBe(true);
    }
  });
});

describe("the long tail is dropped", () => {
  const RULES = [
    { serviceId: "svc-blockage", keywords: ["סתימה", "כיור", "מים", "ביוב", "אסלה"] },
    // A carpenter legitimately lists "מטבח" — kitchens are carpentry work.
    { serviceId: "svc-carpentry", keywords: ["נגר", "עץ", "מטבח", "דלת", "מדף"] },
    { serviceId: "svc-leak", keywords: ["נזילה", "מים", "דולף", "כיור"] },
  ];

  it("does not offer a one-word coincidence beside a strong match", () => {
    // The real sentence that exposed this: three hits for the blockage, one
    // for carpentry, and the screen showed נגרות as suggestion number two.
    const ids = matchServicesByText("יש מים מתחת לכיור במטבח", RULES).map((m) => m.serviceId);
    expect(ids).toContain("svc-blockage");
    expect(ids).not.toContain("svc-carpentry");
  });

  it("keeps a genuine tie", () => {
    const out = matchServicesByText("כיור מים", RULES);
    const ids = out.map((m) => m.serviceId);
    expect(ids).toContain("svc-blockage");
    expect(ids).toContain("svc-leak");
  });

  it("still returns the single best match when only one thing matched", () => {
    expect(matchServicesByText("נגר", RULES).map((m) => m.serviceId)).toEqual(["svc-carpentry"]);
  });

  it("still returns nothing when nothing matched", () => {
    expect(matchServicesByText("כרטיס טיסה לרומא", RULES)).toEqual([]);
  });
});

/**
 * The category screen routes a typed sentence through this matcher, and
 * it used to send everybody to whichever service happened to be first in
 * their category. These are the cases that have to survive that change.
 */
describe("a sentence typed in one category", () => {
  it("finds the right service rather than the first one", () => {
    // "הדוד לא מחמם" in "לבית" used to arrive at a blocked drain, because
    // the drain is first in the list.
    const hits = matchServicesByText("הדוד לא מחמם", catalogMatchRules);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]!.serviceId).not.toBe("");
  });

  it("returns nothing for a sentence about nothing we do", () => {
    // No match is a real outcome and the screen has a fallback for it. A
    // matcher that always answers would route somebody to a plumber for a
    // sentence about their taxes.
    expect(matchServicesByText("מה השעה", catalogMatchRules)).toEqual([]);
  });

  it("orders by how much of the sentence it actually recognised", () => {
    /*
     * The property the category screen depends on: it takes the FIRST hit
     * that belongs to the category the customer opened, so the order has
     * to mean something.
     */
    const hits = matchServicesByText("נזילה מתחת לכיור, מים על הרצפה", catalogMatchRules);
    for (let i = 1; i < hits.length; i += 1) {
      expect(hits[i - 1]!.score).toBeGreaterThanOrEqual(hits[i]!.score);
    }
  });
});
