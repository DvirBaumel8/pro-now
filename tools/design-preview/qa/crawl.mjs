// Presses every button on every reachable screen and reports what each one did.
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { launchChromium } from '../browser.mjs';
const BASE = 'http://127.0.0.1:4421/?time=night';
const MAX_DEPTH = +(process.env.DEPTH || 6), MAX_ACTIONS = +(process.env.MAX || 500), WORKERS = +(process.env.WORKERS || 4);
const SKIP = /^(?:דמות \d+|כלב|חתול|שועל|רובוט|חייזר|דרקון|דוב)$/; // the avatar grid: one of them is enough
const b = await launchChromium();

// a signed-in customer standing on home, saved once
async function makeState() {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  await p.goto(BASE); await p.locator('text=אני צריך מקצוען').first().waitFor();
  const click = async (t) => { const e = p.locator('[role=button],button').filter({ hasText: new RegExp('^\\s*' + t) }); if (await e.count()) await e.last().click(); else await p.locator(`text=${t}`).first().click(); await p.waitForTimeout(900); };
  await click('אני צריך מקצוען'); await p.getByLabel('מספר טלפון').fill('0501234567'); await click('שליחת קוד'); await p.getByLabel('קוד האימות').fill('123456'); await click('כניסה');
  for (let i = 0; i < 6; i++) { try { await click('הבא'); } catch {} } try { await click('בואו נתחיל'); } catch {}
  try { await p.getByLabel(/דמות 1$/).first().click({ timeout: 3000 }); await p.waitForTimeout(500); await click('זו אני/אני זה'); } catch {}
  await p.waitForTimeout(1500);
  const st = await ctx.storageState(); await ctx.close(); return st;
}
const state = process.env.FRESH ? undefined : await makeState();

const snapshot = (p) => p.evaluate(() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
  const btns = [...document.querySelectorAll('[role=button],button,a[href],[role=link],[role=tab],[role=checkbox],[role=switch]')].filter(vis)
    .map((e) => ({ label: (e.getAttribute('aria-label') || e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60), state: (e.getAttribute('aria-selected') || '') + (e.getAttribute('aria-checked') || '') + (e.getAttribute('aria-pressed') || '') + getComputedStyle(e).backgroundColor + getComputedStyle(e).borderColor, disabled: e.getAttribute('aria-disabled') === 'true' || e.disabled }))
    .filter((x) => x.label);
  const text = document.body.innerText.replace(/[0-9]/g, '#').replace(/\s+/g, ' ').slice(0, 1500);
  const inputs = [...document.querySelectorAll('input,textarea')].filter(vis).map((i) => i.value).join('|');
  return { btns, text, inputs, url: location.href };
});
const sigOf = (s) => s.btns.map((x) => x.label).join('¦') + '§' + s.text.slice(0, 300);
const fullOf = (s) => s.btns.map((x) => x.label + x.state).join('¦') + '§' + s.text + '§' + s.inputs;

async function replay(p, path, errs) {
  await p.goto(BASE, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1600);
  for (const step of path) {
    const loc = p.locator('[role=button],button,a[href],[role=link],[role=tab],[role=checkbox],[role=switch]').filter({ visible: true });
    const n = await loc.count(); let hit = null, seen = 0;
    for (let i = 0; i < n; i++) {
      const el = loc.nth(i);
      const lab = ((await el.getAttribute('aria-label')) || (await el.innerText().catch(() => '')) || '').trim().replace(/\s+/g, ' ').slice(0, 60);
      if (lab === step.label) { if (seen === step.nth) { hit = el; break; } seen++; }
    }
    if (!hit) return false;
    await hit.click({ timeout: 4000, force: true }).catch(() => {});
    await p.waitForTimeout(1000);
  }
  return true;
}

let inflight = 0; const results = []; const visited = new Set(); const queue = [[]]; let actions = 0;
async function worker(id, once = false) {
  let active = 0;
  while ((queue.length || (!once && inflight > 0)) && actions < MAX_ACTIONS) {
    if (!queue.length) { await new Promise((r) => setTimeout(r, 500)); continue; }
    inflight++;
    const path = queue.shift();
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, storageState: state });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
    p.on('console', (m) => { if (m.type() === 'error' && !/favicon|404|net::/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
    try {
      if (!(await replay(p, path, errs))) { await ctx.close(); inflight--; continue; }
      const s0 = await snapshot(p); const sig = sigOf(s0);
      if (visited.has(sig)) { await ctx.close(); inflight--; continue; }
      visited.add(sig);
      const counts = {};
      const buttons = s0.btns.map((x) => { const nth = counts[x.label] = (counts[x.label] ?? -1) + 1; return { ...x, nth }; });
      for (const btn of buttons) {
        if (SKIP.test(btn.label) && btn.label !== 'דמות 1') continue;
        if (actions >= MAX_ACTIONS) break;
        actions++;
        // fresh page for each press, so presses do not leak into each other
        const c2 = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, storageState: state });
        const q = await c2.newPage(); const e2 = [];
        q.on('pageerror', (e) => e2.push(String(e).slice(0, 200)));
        q.on('console', (m) => { if (m.type() === 'error' && !/favicon|404|net::/.test(m.text())) e2.push('console: ' + m.text().slice(0, 200)); });
        let popup = false; c2.on('page', () => (popup = true));
        const ok = await replay(q, path, e2);
        if (!ok) { await c2.close(); continue; }
        const before = await snapshot(q);
        const ok2 = await replay_click(q, btn);
        await q.waitForTimeout(1400);
        const after = await snapshot(q);
        const changed = fullOf(before) !== fullOf(after) || popup || before.url !== after.url;
        const newSig = sigOf(after);
        results.push({ path: path.map((x) => x.label), button: btn.label, disabled: btn.disabled, clicked: ok2, changed, popup, errors: e2, screenAfter: after.text.slice(0, 120) });
        if (changed && !visited.has(newSig) && path.length + 1 < MAX_DEPTH) queue.push([...path, { label: btn.label, nth: btn.nth }]);
        await c2.close();
        if (actions % 25 === 0) { console.log(`[w${id}] actions ${actions} queue ${queue.length} screens ${visited.size}`); writeFileSync('out/results.json', JSON.stringify(results, null, 1)); }
      }
    } catch (e) { console.log('ERR', String(e).slice(0, 160)); }
    await ctx.close().catch(() => {});
    inflight--;
    if (once) break;
  }
}
async function replay_click(p, btn) {
  const loc = p.locator('[role=button],button,a[href],[role=link],[role=tab],[role=checkbox],[role=switch]').filter({ visible: true });
  const n = await loc.count(); let seen = 0;
  for (let i = 0; i < n; i++) {
    const el = loc.nth(i);
    const lab = ((await el.getAttribute('aria-label')) || (await el.innerText().catch(() => '')) || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    if (lab === btn.label) { if (seen === btn.nth) { await el.click({ timeout: 4000, force: true }).catch(() => {}); return true; } seen++; }
  }
  return false;
}
// seed with one worker until the queue fills, then run in parallel
await worker(0, true);
await Promise.all(Array.from({ length: WORKERS }, (_, i) => worker(i + 1)));
writeFileSync('out/results.json', JSON.stringify(results, null, 1));
console.log('done', 'actions', actions, 'screens', visited.size, 'dead', results.filter((r) => !r.changed && !r.disabled).length, 'errors', results.filter((r) => r.errors.length).length);
await b.close();
