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
