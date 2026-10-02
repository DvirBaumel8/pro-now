import { describe, expect, it } from "vitest";

import {
  CUSTOMER_DEPTH,
  PRO_DEPTH,
  TRANSITIONS,
  depthOf,
  navigationViolations,
  screenKey,
  transitionDirection,
  transitionFor,
} from "../src/navigation-flow";

const c = (name: string) => ({ side: "customer" as const, name });
const p = (name: string) => ({ side: "pro" as const, name });

describe("navigation invariants", () => {
  it("holds", () => {
    expect(navigationViolations()).toEqual([]);
  });
});

describe("direction comes from the two screens, not from the handler", () => {
  it("going deeper is forward", () => {
    expect(transitionDirection(c("home"), c("category"))).toBe("forward");
    expect(transitionDirection(c("service"), c("describe"))).toBe("forward");
    expect(transitionDirection(c("living"), c("tracking"))).toBe("forward");
  });

  it("coming back is back, whichever control was pressed", () => {
    // This is the case that was broken: every `onBack` navigated with the
    // same `go` as everything else and animated as a forward.
    expect(transitionDirection(c("describe"), c("service"))).toBe("back");
    expect(transitionDirection(c("category"), c("home"))).toBe("back");
    expect(transitionDirection(c("quote"), c("tracking"))).toBe("back");
  });

  it("a sibling is lateral", () => {
    expect(transitionDirection(c("home"), c("calls"))).toBe("lateral");
    expect(transitionDirection(c("calls"), c("card"))).toBe("lateral");
    // Another category is another destination at the same depth.
    expect(transitionDirection(c("category"), c("category"))).toBe("lateral");
  });

  it("skipping a screen is still forward", () => {
    // The demo strip and several shortcuts jump more than one step.
    expect(transitionDirection(c("home"), c("tracking"))).toBe("forward");
    expect(transitionDirection(c("complete"), c("home"))).toBe("back");
  });

  it("first paint has nowhere to come from", () => {
    expect(transitionDirection(null, c("home"))).toBe("lateral");
  });

  it("crossing between the two apps is not progress in either", () => {
    expect(transitionDirection(c("home"), p("shift"))).toBe("lateral");
    expect(transitionDirection(p("job"), c("home"))).toBe("lateral");
  });
});

describe("the professional's journey", () => {
  it("has tabs at one depth and work below them", () => {
    expect(transitionDirection(p("shift"), p("earnings"))).toBe("lateral");
    expect(transitionDirection(p("shift"), p("job"))).toBe("forward");
    expect(transitionDirection(p("chat"), p("job"))).toBe("back");
  });
});

describe("screen identity", () => {
  it("separates two screens that share a name", () => {
    // The fault Amit saw as dead tiles: tapping a second category swapped
    // the contents with no motion because the route name had not changed.
    expect(screenKey({ side: "customer", name: "category", subject: "cat-home" })).not.toBe(
      screenKey({ side: "customer", name: "category", subject: "cat-auto" })
    );
  });

  it("is stable for the same screen", () => {
    expect(screenKey({ side: "customer", name: "service", subject: "svc-leak" })).toBe(
      screenKey({ side: "customer", name: "service", subject: "svc-leak" })
    );
  });

  it("tolerates a screen that is about nothing", () => {
    expect(screenKey({ side: "customer", name: "home" })).toBe("customer:home");
    expect(screenKey({ side: "customer", name: "home", subject: null })).toBe("customer:home");
  });
});

describe("shapes", () => {
  it("moves a new screen in from the reading direction", () => {
    // Hebrew reads right to left, so forward arrives from the left.
    expect(TRANSITIONS.forward.fromX).toBeLessThan(0);
    expect(TRANSITIONS.back.fromX).toBeGreaterThan(0);
  });

  it("carries the direction with the shape", () => {
    const t = transitionFor(c("service"), c("home"));
    expect(t.direction).toBe("back");
    expect(t.fromX).toBe(TRANSITIONS.back.fromX);
  });

  it("leans on the fade for a sibling", () => {
    expect(TRANSITIONS.lateral.fromOpacity).toBeGreaterThan(TRANSITIONS.forward.fromOpacity);
  });
});

describe("depths", () => {
  it("places an unknown screen with the tabs rather than crashing", () => {
    expect(depthOf("customer", "something-new")).toBe(CUSTOMER_DEPTH.home);
    expect(depthOf("pro", "something-new")).toBe(PRO_DEPTH.shift);
  });

  it("puts the gate before the app", () => {
    expect(CUSTOMER_DEPTH.welcome).toBeLessThan(CUSTOMER_DEPTH.auth);
    expect(CUSTOMER_DEPTH.auth).toBeLessThan(CUSTOMER_DEPTH.home);
  });
});
