import { describe, expect, it } from "vitest";
import {
  discover,
  discoveryProgressHe,
  emptyDiscoveries,
  playDrawerActions,
  playDrawerStatusHe,
  worldPlayViolations,
  type WorldInteraction,
} from "../src/world-play";

const IDS = ["a", "b", "c"];

const interaction = (over: Partial<WorldInteraction> = {}): WorldInteraction => ({
  type: "TAP",
  animation: "RUSTLE",
  discoveryId: "a",
  labelHe: "לגעת בעץ",
  ...over,
});

describe("discoveries", () => {
  it("counts a find once, however many times it is touched", () => {
    let d = emptyDiscoveries(IDS);
    d = discover(discover(discover(d, "a"), "a"), "a");
    expect(d.found).toEqual(["a"]);
  });

  it("ignores something that is not in this neighbourhood", () => {
    expect(discover(emptyDiscoveries(IDS), "elsewhere").found).toEqual([]);
  });

  it("says nothing before anyone has played", () => {
    // "מצאת 0 מתוך 3" would be an instruction, and nobody has to play.
    expect(discoveryProgressHe(emptyDiscoveries(IDS))).toBeNull();
  });

  it("counts up once someone starts", () => {
    expect(discoveryProgressHe(discover(emptyDiscoveries(IDS), "a"))).toBe("מצאת 1 מתוך 3 הפתעות בשכונה");
  });

  it("celebrates once, without a completion screen to be stuck on", () => {
    const all = IDS.reduce(discover, emptyDiscoveries(IDS));
    expect(discoveryProgressHe(all)).toBe("מצאת את כל ההפתעות בשכונה ✦");
  });
});

describe("the drawer always offers a way onward", () => {
  const some = discover(emptyDiscoveries(IDS), "a");
  const all = IDS.reduce(discover, emptyDiscoveries(IDS));

  it("offers more play while there is more to find", () => {
    const ids = playDrawerActions({ firstNameHe: "דניאל", discoveries: some, hasJobDetails: true }).map((a) => a.id);
    expect(ids).toContain("PLAY_MORE");
    expect(ids).toContain("FOLLOW_PRO");
    expect(ids).toContain("JOB_DETAILS");
  });

  it("still offers somewhere to go once everything is found", () => {
    // This is the whole fix for the dead end: completion changes a label,
    // it does not remove the exits.
    const actions = playDrawerActions({ firstNameHe: "דניאל", discoveries: all, hasJobDetails: true });
    expect(actions.length).toBeGreaterThanOrEqual(3);
    expect(actions.find((a) => a.id === "PLAY_MORE")?.labelHe).toBe("לטייל בעולם");
  });

  it("never leaves the person with nothing, even with no play at all", () => {
    const actions = playDrawerActions({
      firstNameHe: null,
      discoveries: emptyDiscoveries([]),
      hasJobDetails: false,
    });
    expect(actions).toEqual([{ id: "FOLLOW_PRO", labelHe: "לעקוב אחרי ההגעה" }]);
  });

  it("names the person when it can and reads without them when it cannot", () => {
    expect(playDrawerStatusHe({ firstNameHe: "דניאל", etaMinutes: 8 })).toBe("דניאל בדרך אליך · 8 דק׳");
    expect(playDrawerStatusHe({ firstNameHe: null, etaMinutes: 8 })).toBe("בדרך אליך · 8 דק׳");
  });

  it("refuses to invent an ETA it does not have", () => {
    expect(playDrawerStatusHe({ firstNameHe: "דניאל", etaMinutes: null })).toBe("דניאל בדרך אליך · זמן ההגעה יתעדכן");
  });
});

describe("worldPlayViolations", () => {
  const placed = (over: Partial<{ key: string; interaction: WorldInteraction; withinSafeZone: boolean }> = {}) => ({
    key: "tree",
    interaction: interaction(),
    withinSafeZone: false,
    ...over,
  });

  it("passes a sound scene", () => {
    expect(
      worldPlayViolations({ interactions: [placed()], discoveries: emptyDiscoveries(["a"]) })
    ).toEqual([]);
  });

  it("catches two objects sharing one discovery", () => {
    const v = worldPlayViolations({
      interactions: [placed(), placed({ key: "shop" })],
      discoveries: emptyDiscoveries(["a"]),
    });
    expect(v.join(" ")).toContain("share discoveryId");
  });

  it("catches play placed under the HUD or the drawer", () => {
    const v = worldPlayViolations({
      interactions: [placed({ withinSafeZone: true })],
      discoveries: emptyDiscoveries(["a"]),
    });
    expect(v.join(" ")).toContain("safe zone");
  });

  it("catches a touchable object with no label for a screen reader", () => {
    const v = worldPlayViolations({
      interactions: [placed({ interaction: interaction({ labelHe: "  " }) })],
      discoveries: emptyDiscoveries(["a"]),
    });
    expect(v.join(" ")).toContain("no Hebrew label");
  });

  it("catches a counter that could never complete", () => {
    const v = worldPlayViolations({ interactions: [placed()], discoveries: emptyDiscoveries(["a", "ghost"]) });
    expect(v.join(" ")).toContain("counted but not placed");
  });

  it("catches a discovery that is placed but never counted", () => {
    const v = worldPlayViolations({ interactions: [placed()], discoveries: emptyDiscoveries([]) });
    expect(v.join(" ")).toContain("placed but not counted");
  });
});
