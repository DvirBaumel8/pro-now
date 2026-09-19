import { describe, expect, it } from "vitest";

import {
  buildIntakeBrief,
  intakeProgress,
  pilotIntakeByService,
  pilotIntakes,
  type IntakeAnswer,
  type ServiceIntake,
} from "../src/index";

const blockage = pilotIntakeByService["svc-blockage"]!;

describe("intake definitions", () => {
  it("asks between three and five questions per service", () => {
    for (const i of pilotIntakes) {
      expect(i.questions.length, i.serviceId).toBeGreaterThanOrEqual(3);
      expect(i.questions.length, i.serviceId).toBeLessThanOrEqual(5);
    }
  });

  it("gives every choice question real options and every number a unit", () => {
    for (const i of pilotIntakes) {
      for (const q of i.questions) {
        if (q.kind === "SINGLE" || q.kind === "MULTI") {
          expect(q.options?.length ?? 0, `${i.serviceId}/${q.id}`).toBeGreaterThanOrEqual(2);
          const ids = (q.options ?? []).map((o) => o.id);
          expect(new Set(ids).size).toBe(ids.length);
        }
        if (q.kind === "NUMBER") expect(q.unitHe, `${i.serviceId}/${q.id}`).toBeTruthy();
      }
    }
  });

  it("blocks nothing — no intake question is required", () => {
    // Someone standing in water must be able to skip every question and
    // still get help. If this ever fails, the intake has become a gate.
    for (const i of pilotIntakes) {
      for (const q of i.questions) expect(q.required ?? false, `${i.serviceId}/${q.id}`).toBe(false);
    }
  });

  it("keeps question ids unique within a service", () => {
    for (const i of pilotIntakes) {
      const ids = i.questions.map((q) => q.id);
      expect(new Set(ids).size, i.serviceId).toBe(ids.length);
    }
  });
});

describe("buildIntakeBrief", () => {
  it("returns nothing when nothing was answered", () => {
    expect(buildIntakeBrief(blockage, [])).toEqual([]);
  });

  it("returns nothing when the service has no intake", () => {
    expect(buildIntakeBrief(undefined, [{ questionId: "x", optionIds: ["y"] }])).toEqual([]);
  });

  it("renders the customer's own words, not a summary", () => {
    const brief = buildIntakeBrief(blockage, [{ questionId: "fixture", optionIds: ["toilet"] }]);
    expect(brief).toHaveLength(1);
    expect(brief[0]!.promptHe).toBe("מה סתום?");
    expect(brief[0]!.answerHe).toBe("אסלה");
  });

  it("DROPS unanswered questions instead of showing dashes", () => {
    const brief = buildIntakeBrief(blockage, [
      { questionId: "fixture", optionIds: ["sink"] },
      { questionId: "rising", optionIds: [] },
    ]);
    expect(brief.map((l) => l.questionId)).toEqual(["fixture"]);
  });

  it("KEEPS 'לא יודע', because that is an answer", () => {
    const brief = buildIntakeBrief(blockage, [{ questionId: "rising", optionIds: ["unknown"] }]);
    expect(brief[0]!.answerHe).toBe("לא יודע");
  });

  it("joins a multi-select and drops unknown option ids", () => {
    const brief = buildIntakeBrief(blockage, [
      { questionId: "tried", optionIds: ["plunger", "chemical", "nonsense"] },
    ]);
    expect(brief[0]!.answerHe).toBe("פומפה · חומר לפתיחת סתימות");
  });

  it("puts what changes the professional's van first", () => {
    const brief = buildIntakeBrief(blockage, [
      { questionId: "tried", optionIds: ["nothing"] },
      { questionId: "flood", optionIds: ["yes"] },
    ]);
    expect(brief.map((l) => l.questionId)).toEqual(["flood", "tried"]);
  });

  it("renders numbers with their unit and refuses bad ones", () => {
    const clean = pilotIntakeByService["svc-clean"]!;
    expect(buildIntakeBrief(clean, [{ questionId: "rooms", numberValue: 4 }])[0]!.answerHe).toBe(
      "4 חדרים"
    );
    expect(buildIntakeBrief(clean, [{ questionId: "rooms", numberValue: NaN }])).toEqual([]);
  });

  it("trims free text and drops it when it is only whitespace", () => {
    const fridge = pilotIntakeByService["svc-fridge"]!;
    expect(buildIntakeBrief(fridge, [{ questionId: "brand", textValue: "  בוש  " }])[0]!.answerHe).toBe(
      "בוש"
    );
    expect(buildIntakeBrief(fridge, [{ questionId: "brand", textValue: "   " }])).toEqual([]);
  });

  it("ignores answers to questions this service never asked", () => {
    expect(buildIntakeBrief(blockage, [{ questionId: "ghost", optionIds: ["yes"] }])).toEqual([]);
  });

  it("never invents an answer for an option the question does not offer", () => {
    const brief = buildIntakeBrief(blockage, [{ questionId: "fixture", optionIds: ["helicopter"] }]);
    expect(brief).toEqual([]);
  });
});

describe("intakeProgress", () => {
  it("counts answered against asked", () => {
    const answers: IntakeAnswer[] = [
      { questionId: "fixture", optionIds: ["sink"] },
      { questionId: "rising", optionIds: ["no"] },
    ];
    expect(intakeProgress(blockage, answers)).toEqual({ answered: 2, total: 4 });
  });

  it("is zero of zero when there is no intake", () => {
    expect(intakeProgress(undefined, [])).toEqual({ answered: 0, total: 0 });
  });

  it("does not count an answer that renders to nothing", () => {
    const i: ServiceIntake = {
      serviceId: "x",
      questions: [
        { id: "a", promptHe: "?", kind: "TEXT" },
        { id: "b", promptHe: "?", kind: "TEXT" },
        { id: "c", promptHe: "?", kind: "TEXT" },
      ],
    };
    expect(intakeProgress(i, [{ questionId: "a", textValue: "  " }])).toEqual({
      answered: 0,
      total: 3,
    });
  });
});
