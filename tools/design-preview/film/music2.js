// An original score, synthesised offline and cut to the film's cues.
export async function renderScore(DUR, CUES) {
  const SR = 48000;
  const ac = new OfflineAudioContext(2, Math.ceil(DUR * SR), SR);
  const master = ac.createGain(); master.gain.value = 0.84;
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
  master.connect(comp).connect(ac.destination);
  // reverb
  const irLen = SR * 3.2, ir = ac.createBuffer(2, irLen, SR);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < irLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 3.2); }
  const verb = ac.createConvolver(); verb.buffer = ir; const verbOut = ac.createGain(); verbOut.gain.value = 0.55; verb.connect(verbOut).connect(master);
  // delay for plucks
  const dl = ac.createDelay(2); dl.delayTime.value = 0.45; const fb = ac.createGain(); fb.gain.value = 0.32; const dlOut = ac.createGain(); dlOut.gain.value = 0.35;
  dl.connect(fb).connect(dl); dl.connect(dlOut).connect(master); dlOut.connect(verb);
  const noise = ac.createBuffer(1, SR * 2, SR); { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  const BEAT = 0.6; // 100 bpm
  const CH = { C: [48, 55, 60, 64, 67], G: [43, 55, 59, 62, 67], Am: [45, 57, 60, 64, 69], F: [41, 53, 57, 60, 65], Cadd9: [48, 55, 62, 64, 67, 72] };
  const PROG = ['C', 'G', 'Am', 'F'];
  const chordAt = (t) => PROG[Math.floor(Math.max(0, t - 9) / (BEAT * 8)) % 4];

  function pad(t0, t1, notes, vol = 0.05, cut = 1400) {
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut; f.Q.value = 0.6;
    const gn = ac.createGain(); gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(vol, t0 + 1.0); gn.gain.setValueAtTime(vol, Math.max(t0 + 1.0, t1 - 0.6)); gn.gain.linearRampToValueAtTime(0, t1 + 0.9);
    f.connect(gn); gn.connect(master); gn.connect(verb);
    notes.forEach((m, i) => [-8, 0, 8].forEach((det) => {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = det + (i % 2 ? 3 : -3);
      const p = ac.createStereoPanner(); p.pan.value = det / 12; o.connect(p).connect(f); o.start(t0); o.stop(t1 + 1);
    }));
  }
  function pluck(t, m, vol = 0.06, type = 'triangle', dec = 0.35, pan = 0) {
    const o = ac.createOscillator(); o.type = type; o.frequency.value = hz(m);
    const gn = ac.createGain(); gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(vol, t + 0.005); gn.gain.exponentialRampToValueAtTime(0.0008, t + dec);
    const p = ac.createStereoPanner(); p.pan.value = pan;
    o.connect(gn).connect(p); p.connect(master); p.connect(dl); o.start(t); o.stop(t + dec + 0.05);
  }
  function kick(t, vol = 0.9) {
    const o = ac.createOscillator(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    const gn = ac.createGain(); gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    o.connect(gn).connect(master); o.start(t); o.stop(t + 0.4);
  }
  function noiseHit(t, { type = 'highpass', freq = 7000, dec = 0.05, vol = 0.12, q = 0.7, pan = 0, toVerb = false } = {}) {
    const s = ac.createBufferSource(); s.buffer = noise; const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const gn = ac.createGain(); gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.001, t + dec);
    const p = ac.createStereoPanner(); p.pan.value = pan;
    s.connect(f).connect(gn).connect(p); p.connect(master); if (toVerb) p.connect(verb); s.start(t, Math.random()); s.stop(t + dec + 0.02);
  }
  function bass(t, m, dur, vol = 0.22) {
    const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(m - 12);
    const s = ac.createOscillator(); s.type = 'sine'; s.frequency.value = hz(m - 24);
    const gn = ac.createGain(); gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(vol, t + 0.01); gn.gain.exponentialRampToValueAtTime(0.01, t + dur);
    o.connect(gn); s.connect(gn); gn.connect(master); o.start(t); s.start(t); o.stop(t + dur); s.stop(t + dur);
  }
  function riser(t0, t1, vol = 0.18) {
    const s = ac.createBufferSource(); s.buffer = noise; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(300, t0); f.frequency.exponentialRampToValueAtTime(7000, t1);
    const gn = ac.createGain(); gn.gain.setValueAtTime(0.0001, t0); gn.gain.exponentialRampToValueAtTime(vol, t1 - 0.02); gn.gain.linearRampToValueAtTime(0, t1);
    s.connect(f).connect(gn); gn.connect(master); gn.connect(verb); s.start(t0); s.stop(t1 + 0.05);
  }
  function boom(t, vol = 0.9) {
    const o = ac.createOscillator(); o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(34, t + 1.2);
    const gn = ac.createGain(); gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 2.4);
    o.connect(gn); gn.connect(master); gn.connect(verb); o.start(t); o.stop(t + 2.5);
    noiseHit(t, { type: 'lowpass', freq: 900, dec: 1.4, vol: 0.4, toVerb: true });
  }
  function bell(t, pan = 0, vol = 0.09) {
    [[88, 1], [95, 0.5], [100, 0.3]].forEach(([m, v]) => pluck(t, m, vol * v, 'sine', 1.1, pan));
  }
  function whoosh(t, vol = 0.12) {
    const s = ac.createBufferSource(); s.buffer = noise; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(3500, t + 0.35); f.frequency.exponentialRampToValueAtTime(600, t + 0.7);
    const gn = ac.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(vol, t + 0.3); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
    s.connect(f).connect(gn); gn.connect(master); gn.connect(verb); s.start(t); s.stop(t + 0.8);
  }

  function groove(a, b, { drums = true, claps = true, energy = 1 } = {}) {
    for (let bar = a; bar < b - 0.01; bar += BEAT * 8) {
      const ch = CH[chordAt(bar)];
      pad(bar, Math.min(b, bar + BEAT * 8), ch.slice(1), 0.03 * energy, 1600 + 400 * energy);
    }
    for (let t = a, i = 0; t < b - 0.01; t += BEAT / 2, i++) {
      const ch = CH[chordAt(t)];
      if (drums && i % 2 === 0) kick(t, 0.75 * energy);
      if (drums) noiseHit(t + BEAT / 4, { vol: 0.05 * energy, dec: 0.04, pan: 0.25 });
      if (claps && drums && i % 4 === 2) noiseHit(t, { type: 'bandpass', freq: 1600, q: 0.9, dec: 0.16, vol: 0.16 * energy, toVerb: true });
      if (i % 2 === 0) bass(t, ch[0], BEAT * 0.9, 0.2 * energy);
      const arp = [ch[2], ch[3], ch[4], ch[3] + 12][i % 4] + 12;
      pluck(t, arp, 0.03 * energy, 'triangle', 0.3, (i % 2 ? 0.35 : -0.35));
    }
  }

  const at = (m) => CUES.filter((c) => c.mood === m);
  const first = (m) => at(m)[0], last = (m) => at(m).at(-1);
  // ---- the opening: a pulse, a clock, and nobody answering
  const ten = first('tension'); const tEnd = ten.start + ten.dur;
  pad(0, 20.9, [33, 40, 45], 0.05, 420);
  for (let t = 0.3; t < 20.6; t += 0.86) { kick(t, 0.55); kick(t + 0.18, 0.35); }
  for (let t = 0.2, i = 0; t < 20.8; i++) { noiseHit(t, { type: 'bandpass', freq: 3400, q: 9, dec: 0.025, vol: 0.16 }); t += t < 17.8 ? 0.5 : Math.max(0.09, 0.5 - (t - 17.8) * 0.16); }
  [0.8, 5.2, 9.6, 14.0].forEach((t, i) => { whoosh(t - 0.2, 0.12); noiseHit(t, { type: 'lowpass', freq: 300, dec: 0.5, vol: 0.35, toVerb: true }); pluck(t + 0.05, [45, 44, 43, 41][i], 0.06, 'sawtooth', 1.4); });
  riser(18.2, 20.9, 0.2);
  pad(21.3, tEnd, [57, 60, 64], 0.03, 1200);
  // ---- the reveal
  const rev = first('reveal'); boom(rev.start + 0.4);
  pad(rev.start + 0.4, rev.start + rev.dur, CH.Cadd9, 0.045, 2200);
  for (let t = rev.start + 2.2; t < rev.start + rev.dur - 0.2; t += BEAT / 2) pluck(t, CH.Cadd9[3 + Math.floor((t - rev.start) / (BEAT / 2)) % 3] + 12, 0.035, 'triangle', 0.4, 0.3);
  // ---- the explanation, in time
  const g0 = first('groove').start, g1 = last('groove').start + last('groove').dur;
  groove(g0, g0 + 10, { claps: false, energy: 0.7 });
  groove(g0 + 10, g1, { energy: 0.86 });
  for (const c of at('groove')) whoosh(c.start - 0.15, 0.07);
  for (const c of CUES) if (c.ping != null) { bell(c.ping, 0.3); bell(c.ping + 0.95, -0.2, 0.06); }
  // ---- a breath: trust and family
  const c0 = first('calm').start, c1 = last('calm').start + last('calm').dur;
  pad(c0, (c0 + c1) / 2, CH.F.slice(1), 0.04, 1300); pad((c0 + c1) / 2, c1, CH.C.slice(1), 0.04, 1500);
  for (let t = c0 + 0.2, i = 0; t < c1 - 0.3; t += BEAT, i++) pluck(t, (t < (c0 + c1) / 2 ? CH.F : CH.C)[1 + (i % 4)] + 12, 0.045, 'sine', 0.9, (i % 2 ? 0.3 : -0.3));
  riser(c1 - 1.1, c1, 0.12);
  // ---- the lift: innovation, sponsors, the list
  const l0 = first('lift').start, l1 = last('lift').start + last('lift').dur;
  groove(l0, l1, { energy: 1.05 });
  for (const c of at('lift')) whoosh(c.start - 0.15, 0.1);
  // ---- the end
  const e = first('end');
  riser(e.start - 2, e.start + 0.3, 0.24); boom(e.start + 0.3, 1.0);
  pad(e.start + 0.3, DUR - 0.8, CH.Cadd9, 0.055, 2400);
  for (let t = e.start + 0.3, i = 0; t < DUR - 1.5; t += BEAT / 2, i++) pluck(t, CH.Cadd9[1 + (i % 5)] + 12, 0.03 * Math.max(0, 1 - (t - e.start) / 8), 'triangle', 0.5, (i % 2 ? 0.3 : -0.3));
  master.gain.setValueAtTime(0.84, DUR - 2); master.gain.linearRampToValueAtTime(0, DUR - 0.05);
  return await ac.startRendering();
}
