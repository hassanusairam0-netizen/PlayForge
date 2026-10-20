// GAME 15 — WORD WIZARD: find words in seven letters. Uses a bundled offline word list (SCOWL-derived).
import { makeGame } from './lib/kit.js';
import WORDS, { bases as BASES } from '../data/words.js';

const DICT = new Set(WORDS.split(' '));
const BASE_LIST = BASES.split(' ');
const MODES = { easy: { label: 'Novice', len: 6, time: 120, target: 0.2 }, normal: { label: 'Adept', len: 7, time: 100, target: 0.25 }, hard: { label: 'Archmage', len: 7, time: 70, target: 0.3 } };
const PTS = (w) => [0, 0, 0, 30, 60, 100, 150, 250][w.length] || 300;
const ROUNDS = 3;

const counts = (w) => { const c = {}; for (const ch of w) c[ch] = (c[ch] || 0) + 1; return c; };
function answers(letters) {
  const pool = counts(letters), out = [];
  for (const w of DICT) { if (w.length > letters.length) continue; const c = counts(w); if (Object.keys(c).every((k) => c[k] <= (pool[k] || 0))) out.push(w); }
  return out.sort((a, b) => a.length - b.length || a.localeCompare(b));
}

export default function create(host) {
  const root = document.createElement('div'); root.className = 'g-dom ww';
  root.innerHTML = `<style>
    .ww{background:radial-gradient(circle at 50% 30%,#164a3a,#06140f 75%);color:#f5f0e0;font-family:Space Grotesk,sans-serif}
    .ww-w{display:grid;gap:16px;justify-items:center;width:min(720px,100%)}
    .ww-top{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}.ww-top span{padding:6px 12px;border-radius:99px;background:#ffffff12;font-size:14px}
    .ww-entry{min-height:62px;display:flex;gap:6px;align-items:center;justify-content:center;font-size:38px;letter-spacing:.2em;font-weight:700;color:#5affb4;text-shadow:0 0 24px #5affb466}
    .ww-entry.shake{animation:wwsh .3s}@keyframes wwsh{25%{transform:translateX(-10px)}75%{transform:translateX(10px)}}
    .ww-tiles{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
    .ww-tiles button{width:clamp(48px,9vw,66px);aspect-ratio:1;border:0;border-radius:14px;background:#f5f0e0;color:#163a30;font:700 clamp(24px,4vw,32px) Space Grotesk;box-shadow:0 6px 0 #b8b098,0 10px 20px #0006;transition:transform .1s,opacity .15s}
    .ww-tiles button:active{transform:translateY(4px);box-shadow:0 2px 0 #b8b098}.ww-tiles button.used{opacity:.25}
    .ww-act{display:flex;gap:10px}.ww-act button,.ww-modes button{border:0;padding:12px 18px;border-radius:12px;background:#ffffff14;color:#fff;font:600 15px Space Grotesk}.ww-act button.cast{background:#5affb4;color:#06140f}
    .ww-fb{height:24px;font-size:16px}.ww-bar{width:100%;height:8px;border-radius:8px;background:#ffffff14;overflow:hidden}.ww-bar i{display:block;height:100%;background:#5affb4}
    .ww-found{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-height:120px;overflow:auto}.ww-found span{padding:4px 10px;border-radius:8px;background:#ffffff10;font-size:14px;text-transform:uppercase}
    .ww-modes{display:grid;gap:12px;width:min(420px,100%)}.ww-modes button{padding:18px;font-size:18px;text-align:left;display:flex;justify-content:space-between}.ww-modes button:hover{background:#5affb4;color:#06140f}
  </style><div class="ww-w"></div>`;
  host.el.appendChild(root);
  const W = root.querySelector('.ww-w');
  let mode, round = 0, letters = '', order = [], picked = [], found = [], all = [], score = 0, roundScore = 0, target = 0, timeLeft = 0, phase = 'menu', done = false, fbT = 0, base = '';

  W.innerHTML = `<h2 style="font-size:36px;margin:0">Choose your rank</h2><p style="opacity:.7;margin:0">Hit the target score in each of ${ROUNDS} rounds.</p><div class="ww-modes">${Object.entries(MODES).map(([k, m]) => `<button data-m="${k}">${m.label}<small style="opacity:.7">${m.len} letters · ${m.time}s</small></button>`).join('')}</div>`;

  function startRound() {
    round++; phase = 'play';
    const pool = BASE_LIST.filter((w) => w.length === mode.len);
    base = pool[Math.floor(Math.random() * pool.length)];
    letters = base; order = [...base].sort(() => Math.random() - 0.5);
    all = answers(base); found = []; picked = []; roundScore = 0; timeLeft = mode.time;
    const totalPts = all.reduce((a, w) => a + PTS(w), 0);
    target = Math.max(200, Math.round((totalPts * mode.target) / 10) * 10);
    W.innerHTML = `<div class="ww-top"><span>Round ${round}/${ROUNDS}</span><span data-sc></span><span data-wc></span></div><div class="ww-bar"><i></i></div>
      <div class="ww-entry" aria-live="polite"></div><div class="ww-fb"></div><div class="ww-tiles"></div>
      <div class="ww-act"><button data-a="del">⌫ Delete</button><button data-a="shuf">⟳ Shuffle</button><button data-a="cast" class="cast">✦ Cast</button></div><div class="ww-found"></div>`;
    render();
  }
  function render() {
    W.querySelector('.ww-tiles').innerHTML = order.map((ch, i) => `<button data-t="${i}" class="${picked.includes(i) ? 'used' : ''}">${ch.toUpperCase()}</button>`).join('');
    W.querySelector('.ww-entry').textContent = picked.map((i) => order[i]).join('').toUpperCase() || ' ';
    W.querySelector('[data-sc]').textContent = `${roundScore} / ${target} pts`;
    W.querySelector('[data-wc]').textContent = `${found.length} of ${all.length} words`;
    W.querySelector('.ww-found').innerHTML = found.map((w) => `<span>${w}</span>`).join('');
  }
  const fb = (m, col) => { const e = W.querySelector('.ww-fb'); e.textContent = m; e.style.color = col; fbT = 1.6; };
  function addLetter(ch) { const i = order.findIndex((c, k) => c === ch && !picked.includes(k)); if (i >= 0) { picked.push(i); host.sfx('blip', 500 + picked.length * 60); render(); } }
  function cast() {
    const w = picked.map((i) => order[i]).join('');
    picked = [];
    if (w.length < 3) { fb('Words need 3+ letters', '#ffb23d'); host.sfx('error'); }
    else if (found.includes(w)) { fb('Already found', '#ffb23d'); host.sfx('error'); }
    else if (DICT.has(w)) {
      const p = PTS(w) + (w.length === letters.length ? 500 : 0); found.unshift(w); roundScore += p; score += p;
      fb(w.length === letters.length ? `✦ WIZARD WORD! +${p}` : `+${p}`, '#5affb4'); host.sfx(w.length >= 6 ? 'win' : 'success');
    } else { fb(`“${w.toUpperCase()}” is not in the spellbook`, '#ff6a8a'); host.sfx('error'); const e = W.querySelector('.ww-entry'); e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); }
    render();
  }
  root.addEventListener('click', (e) => {
    const m = e.target.closest('[data-m]'); if (m) { mode = MODES[m.dataset.m]; host.sfx('click'); startRound(); return; }
    const t = e.target.closest('[data-t]'); if (t && phase === 'play') { const i = +t.dataset.t; if (!picked.includes(i)) { picked.push(i); host.sfx('blip', 500 + picked.length * 60); render(); } }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'del') { picked.pop(); render(); } if (a === 'shuf') { order = order.sort(() => Math.random() - 0.5); picked = []; render(); host.sfx('rotate'); } if (a === 'cast') cast();
  });
  const key = (e) => {
    if (phase !== 'play') return;
    if (/^[a-z]$/i.test(e.key)) addLetter(e.key.toLowerCase());
    else if (e.key === 'Backspace') { picked.pop(); render(); }
    else if (e.key === 'Enter') { e.preventDefault(); cast(); }
    else if (e.code === 'Space') { e.preventDefault(); order = order.sort(() => Math.random() - 0.5); picked = []; render(); }
  };
  window.addEventListener('keydown', key);

  const update = (dt) => {
    host.score(score); host.status(mode ? `Round ${round}/${ROUNDS}` : 'Choose rank');
    if (phase !== 'play') return;
    timeLeft -= dt; fbT -= dt;
    if (fbT <= 0) { const e = W.querySelector('.ww-fb'); if (e) e.textContent = ''; }
    W.querySelector('.ww-bar i').style.width = `${Math.max(0, timeLeft / mode.time) * 100}%`;
    if (timeLeft <= 0) {
      phase = 'between';
      const passed = roundScore >= target;
      const longest = all.filter((w) => w.length === letters.length);
      if (!passed || round >= ROUNDS) {
        if (!done) { done = true; host.end({ won: passed, score, title: passed ? 'Grand Wizard' : 'Spell fizzled', msg: `${passed ? 'All rounds cleared!' : `Round ${round} target was ${target}.`} The ${letters.length}-letter word was “${(longest[0] || base).toUpperCase()}”.` }); }
      } else {
        W.innerHTML = `<h2 style="font-size:34px;margin:0">Round ${round} cleared!</h2><p style="opacity:.8">The hidden word was <b style="color:#5affb4">${(longest[0] || base).toUpperCase()}</b>. You found ${found.length} of ${all.length} words.</p><button class="g-btn" data-next style="padding:14px 24px;background:#5affb4;color:#06140f">Next round →</button>`;
        W.querySelector('[data-next]').onclick = () => startRound();
        host.sfx('win');
      }
    }
  };
  return makeGame(update, () => { window.removeEventListener('keydown', key); root.remove(); });
}
