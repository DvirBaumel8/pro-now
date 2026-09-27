import { describe, expect, it } from "vitest";
import { lowestChoicePrice, previewChoicePrices, priceForChoices } from "../src/catalog/choicePrices";
import { pilotIntakeByService } from "@pro-now/types";

const a = (questionId: string, ...optionIds: string[]) => ({ questionId, optionIds });

describe("the price follows what was chosen", () => {
  it("makeup: a wedding for three with hair is not the price of a day look for one (Amit's case)", () => {
    const day = priceForChoices("svc-makeup", "FIXED", 35000, [a("event", "day"), a("people", "1")]);
    const wedding = priceForChoices("svc-makeup", "FIXED", 35000, [a("event", "wedding"), a("people", "more"), a("hair", "yes")]);
    expect(day.amountMinorUnits).toBe(30000);
    expect(wedding.amountMinorUnits).toBe((900 + 250) * 3 * 100);
    expect(day.fromChoices).toBe(true);
  });

  it("nothing chosen is the plain price", () => {
    expect(priceForChoices("svc-makeup", "FIXED", 35000, []).amountMinorUnits).toBe(35000);
    expect(priceForChoices("svc-makeup", "FIXED", 35000, []).fromChoices).toBe(false);
  });

  it("a professional who charges more than the example charges more across the table", () => {
    const own = priceForChoices("svc-makeup", "FIXED", 70000, [a("event", "day")], 35000);
    expect(own.amountMinorUnits).toBe(60000);
  });

  it("hourly work: the answers estimate the hours and may move the rate", () => {
    const c = priceForChoices("svc-hands", "HOURLY", 11000, [a("hours", "2"), a("heavy", "yes")]);
    expect(c.amountMinorUnits).toBe(13000);
    expect(c.hours).toBe(2);
    expect(c.estimateMinorUnits).toBe(26000);
    const clean = priceForChoices("svc-clean", "HOURLY", 9500, [{ questionId: "rooms", numberValue: 4 }]);
    expect(clean.hours).toBe(4);
  });

  it("a visit fee does not follow the answers", () => {
    expect(priceForChoices("svc-leak", "VISIT_QUOTE", 17900, [a("where", "kitchen")]).amountMinorUnits).toBe(17900);
  });

  it("the tile's starting price is the cheapest job in the table", () => {
    expect(lowestChoicePrice("svc-makeup", 35000)).toBe(30000);
    expect(lowestChoicePrice("svc-doctor", 45000)).toBe(45000);
  });

  it("every table speaks only of questions and answers that exist", () => {
    for (const [serviceId, table] of Object.entries(previewChoicePrices)) {
      const intake = pilotIntakeByService[serviceId];
      expect(intake, serviceId).toBeTruthy();
      for (const [qid, opts] of Object.entries(table.options)) {
        const q = intake!.questions.find((x) => x.id === qid);
        expect(q, `${serviceId}.${qid}`).toBeTruthy();
        const ids = q!.kind === "YESNO" ? ["yes", "no"] : (q!.options ?? []).map((o) => o.id);
        for (const oid of Object.keys(opts)) expect(ids, `${serviceId}.${qid}.${oid}`).toContain(oid);
      }
      for (const qid of Object.keys(table.numbers ?? {})) {
        expect(intake!.questions.find((x) => x.id === qid)?.kind, `${serviceId}.${qid}`).toBe("NUMBER");
      }
    }
  });
});
