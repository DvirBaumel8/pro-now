// The documents step since 2026-10-01: the identity check (ID card → face → match),
// then every document uploaded, so the join is complete and approval runs.
// `press` is the calling script's own button finder.
const FILE = new URL('../public/world/avatar_01_portrait.webp', import.meta.url).pathname;
const hooked = new WeakSet();
export async function completeDocs(p, press, { skipRest = false } = {}) {
  if (!hooked.has(p)) { hooked.add(p); p.on('filechooser', async (fc) => { await fc.setFiles(FILE).catch(() => {}); }); }
  const text = async () => (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  if (!(await press(/^צילום התעודה$/))) throw new Error('identity: no ID button');
  for (let i = 0; i < 20 && !(await text()).includes('פתיחת המצלמה'); i++) await p.waitForTimeout(400);
  if (!(await press(/^פתיחת המצלמה$/))) throw new Error('identity: no camera button');
  for (let i = 0; i < 40 && !(await text()).includes('התעודה נסרקה והפנים תואמות לה'); i++) await p.waitForTimeout(500);
  if (!(await text()).includes('התעודה נסרקה והפנים תואמות לה')) throw new Error('identity: never verified');
  if (skipRest) return;
  for (let i = 0; i < 12; i++) { if (!(await press(/^העלאת /))) break; await p.waitForTimeout(300); }
  if (!(await press(/^המשך$/))) throw new Error('docs: cannot continue — ' + (await text()).slice(0, 160));
}
