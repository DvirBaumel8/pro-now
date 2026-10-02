import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { launchChromium } from '../browser.mjs';
const HERE = new URL('.', import.meta.url).pathname;
const PUB = new URL('../public/', import.meta.url).pathname;
const [mode, arg, outArg] = process.argv.slice(2);
const b = await launchChromium({ args: ['--autoplay-policy=no-user-gesture-required', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on('pageerror', (e) => console.log('PAGEERR', String(e)));
p.on('console', (m) => { if (m.type() === 'error' || m.text().startsWith('[f]')) console.log(m.text()); });
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.html': 'text/html' };
await p.route('https://film.local/**', async (route) => {
  const path = decodeURIComponent(new URL(route.request().url()).pathname);
  let file;
  if (path === '/') return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head><link rel="preconnect" href="https://fonts.gstatic.com"><link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800;900&family=Orbitron:wght@700;900&display=block" rel="stylesheet"><style>body{margin:0;background:#000}canvas{width:960px}</style></head><body><span style="font-family:Heebo;font-weight:900;position:absolute;opacity:0">א</span></body></html>` });
  if (path.startsWith('/m/')) file = join(HERE, path.slice(3));
  else if (path.startsWith('/world/') || path.startsWith('/clips/')) file = join(PUB, path.slice(1));
  else if (path === '/mux.mjs') file = join(HERE, 'node_modules/mp4-muxer/build/mp4-muxer.mjs');
  else file = join(HERE, path.slice(1));
  if (!existsSync(file)) return route.fulfill({ status: 404, body: 'nf' });
  route.fulfill({ contentType: TYPES[extname(file)] || 'application/octet-stream', body: readFileSync(file) });
});
await p.goto('https://film.local/');
const FILM = process.env.FILM || 'film.js';
await p.evaluate(async (f) => { window.F = await import('/' + f); await window.F.load(); }, FILM);
console.log('loaded');
if (mode === 'stills') {
  const times = arg.split(',').map(Number);
  for (const t of times) {
    const url = await p.evaluate(async (t) => { const c = await window.F.drawFrame(t); return c.toDataURL('image/jpeg', 0.85); }, t);
    writeFileSync(join(HERE, `still_${String(t).replace('.', '_')}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log('stills done');
} else {
  const OUT = outArg || join(HERE, 'PRO_NOW_film.mp4');
  writeFileSync(OUT, Buffer.alloc(0));
  await p.exposeFunction('__save', (b64) => appendFileSync(OUT, Buffer.from(b64, 'base64')));
  await p.exposeFunction('__log', (s) => console.log(s));
  const [a0, a1] = (arg || '').split(',').map(Number);
  const res = await p.evaluate(async ([a0, a1, mode]) => {
    const { Muxer, ArrayBufferTarget } = await import('/mux.mjs');
    const { renderScore } = await import('/' + (window.F.SCORE ?? (window.F.CUES ? 'music2.js' : 'music.js')));
    const TZ = mode === 'teaser'; const DUR = TZ ? window.F.TEASER_DURATION : window.F.DURATION, FPS = 30; const draw = TZ ? window.F.drawTeaser : window.F.drawFrame;
    const from = isNaN(a0) ? 0 : a0, to = isNaN(a1) ? DUR : a1;
    const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width: 1920, height: 1080, frameRate: FPS }, audio: { codec: 'aac', numberOfChannels: 2, sampleRate: 48000 }, fastStart: 'in-memory' });
    let err = null;
    const ve = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => (err = e) });
    ve.configure({ codec: 'avc1.640028', width: 1920, height: 1080, bitrate: 5e6, framerate: FPS, latencyMode: 'quality', avc: { format: 'avc' } });
    const n0 = Math.round(from * FPS), n1 = Math.round(to * FPS); const t0 = performance.now();
    for (let k = n0; k < n1; k++) {
      const cv = await draw(k / FPS);
      const vf = new VideoFrame(cv, { timestamp: Math.round((k - n0) * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
      ve.encode(vf, { keyFrame: (k - n0) % 60 === 0 }); vf.close();
      while (ve.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 5));
      if (err) throw err;
      if ((k - n0) % 150 === 0) await window.__log(`frame ${k}/${n1}  ${((performance.now() - t0) / 1000).toFixed(0)}s`);
    }
    await ve.flush();
    const buf = window.F.CUES ? await renderScore(DUR, window.F.CUES) : await renderScore(DUR, TZ ? 'teaser' : 'film');
    const ae = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => (err = e) });
    ae.configure({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 });
    const c0 = buf.getChannelData(0), c1 = buf.getChannelData(1);
    const s0 = Math.round(from * 48000), s1 = Math.min(buf.length, Math.round(to * 48000));
    for (let i = s0; i < s1; i += 4800) {
      const n = Math.min(4800, s1 - i); const data = new Float32Array(n * 2); data.set(c0.subarray(i, i + n), 0); data.set(c1.subarray(i, i + n), n);
      ae.encode(new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((i - s0) / 48000 * 1e6), data }));
    }
    await ae.flush();
    if (err) throw err;
    muxer.finalize();
    const u8 = new Uint8Array(muxer.target.buffer);
    for (let i = 0; i < u8.length; i += 6 << 20) {
      const part = u8.subarray(i, i + (6 << 20)); let s = '';
      for (let k = 0; k < part.length; k += 0x8000) s += String.fromCharCode(...part.subarray(k, k + 0x8000));
      await window.__save(btoa(s));
    }
    return { bytes: u8.length, secs: ((performance.now() - t0) / 1000).toFixed(0) };
  }, [a0, a1, mode]);
  console.log('wrote', OUT, res);
}
await b.close();
