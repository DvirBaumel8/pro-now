import { expect, test } from "./fixtures";
import { finishFirstRun, signInByEmail, uniqueEmail } from "./helpers";

/**
 * The street's small things as the demo's (scene/dressing.ts): the dog park
 * built with all five of its dogs and its people, the four places from their
 * own sheets (the bench stop among them), and the furniture and trees from
 * the phone edition of their drawings. The product had three dogs as
 * billboards, no bench stop, and full-size furniture cards.
 */
test("the street is dressed as the demo's: the dog park's five dogs, the four places, the phone-edition furniture", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signInByEmail(page, uniqueEmail("e2e-world-details"));
  await finishFirstRun(page);

  const drawn = new Set<string>();
  page.on("response", (response) => {
    const m = /\/world\/s\/((?:park|place|prop)_[a-z0-9_]+)\.webp$/.exec(new URL(response.url()).pathname);
    if (m && response.ok()) drawn.add(m[1]!);
  });

  await page.goto("/world");
  await expect(page.locator(".world-canvas__surface canvas")).toBeVisible();
  // The arrival waits for the street's art, these drawings with it.
  await expect(page.getByText("נכנסים לעיר")).toBeHidden({ timeout: 30_000 });

  console.log(`world dressing drawn: ${[...drawn].sort().join(", ")}`);
  for (const id of [
    "park_dog1", "park_dog2", "park_dog3", "park_dog4", "park_dog5",
    "park_person1", "park_person2", "park_person3",
    "place_dogpark", "place_roadside", "place_pickup", "place_garden", "place_bench_stop",
    "prop_cafe_set", "prop_planter_box", "prop_planter_round", "prop_bench", "prop_bin", "prop_palm", "prop_jacaranda",
  ]) {
    expect(drawn, id).toContain(id);
  }
});
