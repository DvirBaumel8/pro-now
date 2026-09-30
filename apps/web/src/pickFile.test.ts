import { describe, expect, it } from "vitest";

import { pickFile } from "./pickFile";

/** Just enough of a document for the picker: one input, one body. */
function fakeDocument() {
  const attached: FakeInput[] = [];
  class FakeInput {
    type = "";
    accept = "";
    tabIndex = 0;
    style = { cssText: "" };
    attrs: Record<string, string> = {};
    files: File[] | null = null;
    onchange: (() => void) | null = null;
    oncancel: (() => void) | null = null;
    clicked = false;
    setAttribute(k: string, v: string) { this.attrs[k] = v; }
    click() { this.clicked = true; }
    remove() { attached.splice(attached.indexOf(this), 1); }
  }
  const doc = {
    createElement: () => new FakeInput(),
    body: { appendChild: (el: FakeInput) => { attached.push(el); return el; } },
  };
  return { doc: doc as unknown as Parameters<typeof pickFile>[2], attached };
}

describe("pickFile", () => {
  it("opens a hidden picker and resolves with the chosen file, then removes it", async () => {
    const { doc, attached } = fakeDocument();
    const picked = pickFile("image/*", "environment", doc);
    const input = attached[0]!;
    expect(input.clicked).toBe(true);
    expect(input.style.cssText).toContain("opacity:0");
    expect(input.attrs.capture).toBe("environment");
    const file = new File(["x"], "a.jpg");
    input.files = [file];
    input.onchange!();
    await expect(picked).resolves.toBe(file);
    expect(attached).toHaveLength(0);
  });

  it("resolves null and removes the picker when it is dismissed", async () => {
    const { doc, attached } = fakeDocument();
    const picked = pickFile("image/*", undefined, doc);
    attached[0]!.oncancel!();
    await expect(picked).resolves.toBeNull();
    expect(attached).toHaveLength(0);
  });
});
