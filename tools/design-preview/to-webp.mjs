/**
 * PNG → WebP, through the browser we already drive.
 *
 *   node to-webp.mjs <in.png> <out.webp> [quality]
 *
 * The art pack arrives as PNG and the app ships WebP: the plate alone is
 * 528KB as WebP and several megabytes as PNG, on a phone, over a
 * network, for a screen somebody is waiting on.
 *
 * There is no `sharp`, no ImageMagick and no `cwebp` on this machine,
 * and adding a native image dependency to install one file is a poor
 * trade. Chrome encodes WebP natively and this project already drives
 * Chrome for every visual check, so the encoder we have is the one we
 * use.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { launchChromium } from "./browser.mjs";

const [, , src, out, q = "0.9"] = process.argv;
const b64 = readFileSync(src).toString("base64");

const browser = await launchChromium();
const page = await browser.newPage();
const data = await page.evaluate(
  async ({ b64, q }) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext("2d").drawImage(img, 0, 0);
    return c.toDataURL("image/webp", Number(q));
  },
  { b64, q }
);
await browser.close();

if (!data.startsWith("data:image/webp")) {
  console.error("this browser did not produce WebP");
  process.exit(1);
}
const bytes = Buffer.from(data.split(",")[1], "base64");
writeFileSync(out, bytes);
console.log(`${out} — ${(bytes.length / 1024).toFixed(0)} KB`);
