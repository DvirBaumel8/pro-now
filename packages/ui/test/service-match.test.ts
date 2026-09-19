import { describe, expect, it } from "vitest";

import { matchServicesByText, type ServiceMatchRule } from "../src/service-match";

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
