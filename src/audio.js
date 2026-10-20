// Procedural Web Audio: no audio files to license or download.
// Muted until the visitor turns sound on (and the context is created on that gesture).
import { store } from './store.js';

let ctx, master;
const enabled = () => store.get().sound;

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function setSound(on) {
  store.setSound(on);
  if (on) ensure();
  if (master) master.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, 0.03);
}

function tone({ f = 440, f2, type = 'sine', d = 0.12, v = 0.25, delay = 0 }) {
  const c = ensure(); if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + d);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(master); o.start(t); o.stop(t + d + 0.02);
}

let noiseBuf;
function noise({ d = 0.2, v = 0.3, freq = 1200, q = 1, type = 'lowpass', delay = 0 }) {
  const c = ensure(); if (!c) return;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const a = noiseBuf.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
  }
  const t = c.currentTime + delay;
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + d + 0.05);
}

const presets = {
  click: () => tone({ f: 880, f2: 660, d: 0.05, v: 0.12, type: 'triangle' }),
  hover: () => tone({ f: 1200, d: 0.03, v: 0.04, type: 'sine' }),
  start: () => [523, 659, 784, 1047].forEach((f, i) => tone({ f, d: 0.18, v: 0.18, type: 'triangle', delay: i * 0.07 })),
  win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ f, d: 0.3, v: 0.2, type: 'square', delay: i * 0.09 })),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone({ f, d: 0.3, v: 0.18, type: 'sawtooth', delay: i * 0.12 })),
  shoot: () => { tone({ f: 900, f2: 120, d: 0.12, v: 0.2, type: 'square' }); noise({ d: 0.08, v: 0.15, freq: 3000 }); },
  laser: () => tone({ f: 1600, f2: 200, d: 0.15, v: 0.15, type: 'sawtooth' }),
  hit: () => noise({ d: 0.12, v: 0.35, freq: 900 }),
  hurt: () => tone({ f: 200, f2: 80, d: 0.25, v: 0.3, type: 'sawtooth' }),
  explode: () => { noise({ d: 0.6, v: 0.5, freq: 500 }); tone({ f: 120, f2: 30, d: 0.5, v: 0.3 }); },
  coin: () => { tone({ f: 988, d: 0.06, v: 0.15, type: 'square' }); tone({ f: 1319, d: 0.15, v: 0.15, type: 'square', delay: 0.06 }); },
  jump: () => tone({ f: 300, f2: 700, d: 0.15, v: 0.15, type: 'square' }),
  bounce: () => tone({ f: 220, f2: 440, d: 0.1, v: 0.15, type: 'sine' }),
  flip: () => tone({ f: 600, f2: 200, d: 0.12, v: 0.15, type: 'triangle' }),
  success: () => [660, 880, 1320].forEach((f, i) => tone({ f, d: 0.16, v: 0.16, type: 'sine', delay: i * 0.06 })),
  error: () => tone({ f: 160, d: 0.2, v: 0.2, type: 'square' }),
  rotate: () => tone({ f: 500, f2: 700, d: 0.05, v: 0.1, type: 'triangle' }),
  slice: () => noise({ d: 0.12, v: 0.25, freq: 4000, type: 'highpass' }),
  thud: () => tone({ f: 140, f2: 60, d: 0.15, v: 0.3 }),
  reload: () => { noise({ d: 0.05, v: 0.2, freq: 2500, type: 'bandpass', q: 4 }); noise({ d: 0.05, v: 0.2, freq: 1800, type: 'bandpass', q: 4, delay: 0.25 }); },
  build: () => { noise({ d: 0.1, v: 0.2, freq: 600 }); tone({ f: 330, d: 0.1, v: 0.12, type: 'triangle', delay: 0.05 }); },
  blip: (f = 600) => tone({ f, d: 0.12, v: 0.18, type: 'sine' }),
  skid: () => noise({ d: 0.25, v: 0.12, freq: 2200, type: 'bandpass', q: 3 }),
};

export function sfx(name, arg) {
  if (!enabled()) return;
  try { presets[name]?.(arg); } catch {}
}

// Continuous engine hum for racing games. set(0..1) changes pitch/volume.
export function engine(base = 55, type = 'sawtooth') {
  let o, o2, g, f;
  return {
    set(x) {
      if (!enabled()) { if (g) g.gain.value = 0; return; }
      const c = ensure(); if (!c) return;
      if (!o) {
        o = c.createOscillator(); o2 = c.createOscillator(); g = c.createGain(); f = c.createBiquadFilter();
        o.type = type; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 900; g.gain.value = 0;
        o.connect(f); o2.connect(f); f.connect(g).connect(master); o.start(); o2.start();
      }
      const t = c.currentTime;
      o.frequency.setTargetAtTime(base + x * base * 3, t, 0.05);
      o2.frequency.setTargetAtTime((base + x * base * 3) / 2, t, 0.05);
      g.gain.setTargetAtTime(0.05 + x * 0.06, t, 0.05);
    },
    stop() { try { o?.stop(); o2?.stop(); g?.disconnect(); } catch {} o = null; },
  };
}

// Soft ambient bed for exploration games (wind/waves/space hum).
export function ambient(kind = 'wind') {
  if (!enabled()) return { stop() {} };
  const c = ensure(); if (!c) return { stop() {} };
  const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), a = buf.getChannelData(0);
  let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; a[i] = last * 3; }
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
  s.buffer = buf; s.loop = true; f.type = 'lowpass'; f.frequency.value = kind === 'space' ? 300 : 700;
  g.gain.value = kind === 'space' ? 0.25 : 0.18; lfo.frequency.value = kind === 'waves' ? 0.15 : 0.07; lg.gain.value = 0.12;
  lfo.connect(lg).connect(g.gain); s.connect(f).connect(g).connect(master); s.start(); lfo.start();
  return { stop() { try { s.stop(); lfo.stop(); g.disconnect(); } catch {} } };
}
