// GAME 13 — MEMORY VAULT: watch the glyph sequence, repeat it before the input timer drains.
import { makeGame } from './lib/kit.js';

const GLYPHS = ['✦', '◆', '▲', '●', '✚', '◐', '★', '⬢', '♦', '☾', '☀', '✿', '♠', '♣', '♥', '⚑'];
const MODES = {
  easy: { label: 'Apprentice', grid: 3, show: 0.75, per: 4, mult: 1 },
  normal: { label: 'Safecracker', grid: 3, show: 0.5, per: 2.6, mult: 2 },
  hard: { label: 'Mastermind', grid: 4, show: 0.36, per: 1.9, mult: 3 },
};
const GOAL = 15;

export default function create(host) {
  const root = document.createElement('div'); root.className = 'g-dom mv';
  root.innerHTML = `<style>
    .mv{background:radial-gradient(circle at 50% 40%,#2a1650,#0b0618 70%);color:#fff;font-family:Space Grotesk,sans-serif}
    .mv-wrap{display:grid;gap:18px;justify-items:center;width:min(520px,100%)}
    .mv-top{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}.mv-top span{padding:6px 12px;border-radius:99px;background:#ffffff12;font-size:14px}
    .mv-msg{font-size:clamp(20px,3vw,28px);height:36px;text-align:center}
    .mv-timer{width:100%;height:8px;border-radius:8px;background:#ffffff14;overflow:hidden}.mv-timer i{display:block;height:100%;background:linear-gradient(90deg,#b45cff,#3dd8ff);width:100%}
    .mv-grid{display:grid;gap:12px;width:100%;aspect-ratio:1;padding:18px;border-radius:28px;background:linear-gradient(145deg,#2a1d48,#160d2a);box-shadow:inset 0 2px 0 #ffffff14,0 30px 60px -20px #000}
    .mv-grid button{border:0;border-radius:18px;background:#2a1d48;color:#7b6aa8;font-size:clamp(26px,6vw,44px);box-shadow:inset 0 -4px 0 #0004;transition:transform .08s,background .15s,color .15s,box-shadow .15s}
    .mv-grid button.lit{background:#b45cff;color:#fff;box-shadow:0 0 40px #b45cffaa,inset 0 -4px 0 #0003;transform:scale(1.04)}
    .mv-grid button.ok{background:#3dd8a0;color:#fff}.mv-grid button.bad{background:#ff3d5a;color:#fff}
    .mv-grid button:active{transform:scale(.95)}
    .mv-modes{display:grid;gap:12px;width:min(420px,100%)}.mv-modes button{border:0;padding:18px;border-radius:18px;background:#ffffff10;color:#fff;font:600 18px Space Grotesk;text-align:left;display:flex;justify-content:space-between}.mv-modes button:hover{background:#b45cff}
    .mv-modes small{opacity:.7;font-weight:400}
  </style><div class="mv-wrap"></div>`;
  host.el.appendChild(root);
  const wrap = root.querySelector('.mv-wrap');
  let mode, seq = [], pos = 0, round = 0, score = 0, phase = 'menu', showT = 0, showI = 0, inputT = 0, btns = [], done = false;

  function menu() {
    wrap.innerHTML = `<h2 style="font-size:34px;margin:0">Choose your clearance</h2><p style="opacity:.7;margin:0;text-align:center">Crack ${GOAL} codes to open the vault.</p>
      <div class="mv-modes">${Object.entries(MODES).map(([k, m]) => `<button data-m="${k}">${m.label}<small>${m.grid}×${m.grid} · ${m.per}s per press · x${m.mult} pts</small></button>`).join('')}</div>`;
  }
  function begin(k) {
    mode = MODES[k]; phase = 'show';
    const n = mode.grid * mode.grid;
    wrap.innerHTML = `<div class="mv-top"><span data-r>Code 1/${GOAL}</span><span>${mode.label}</span><span data-s>0 pts</span></div><div class="mv-msg">Watch…</div><div class="mv-timer"><i></i></div>
      <div class="mv-grid" style="grid-template-columns:repeat(${mode.grid},1fr)">${GLYPHS.slice(0, n).map((g, i) => `<button data-i="${i}" aria-label="Glyph ${i + 1}">${g}</button>`).join('')}</div>`;
    btns = [...wrap.querySelectorAll('.mv-grid button')];
    seq = [Math.floor(Math.random() * n)]; nextRound();
  }
  function nextRound() {
    round = seq.length; pos = 0; phase = 'show'; showT = 0.8; showI = 0;
    wrap.querySelector('.mv-msg').textContent = `Watch the code (${seq.length})`;
    wrap.querySelector('[data-r]').textContent = `Code ${round}/${GOAL}`;
  }
  function press(i) {
    if (phase !== 'input') return;
    const b = btns[i];
    if (i === seq[pos]) {
      b.classList.add('ok'); setTimeout(() => b.classList.remove('ok'), 180); host.sfx('blip', 400 + i * 60);
      pos++; inputT = mode.per;
      if (pos === seq.length) {
        score += seq.length * 10 * mode.mult; host.sfx('success');
        wrap.querySelector('[data-s]').textContent = `${score} pts`;
        if (seq.length >= GOAL) { phase = 'over'; finish(true); return; }
        phase = 'gap'; showT = 0.8; wrap.querySelector('.mv-msg').textContent = 'Access granted ✓';
        seq.push(Math.floor(Math.random() * btns.length));
      }
    } else { b.classList.add('bad'); fail('Wrong glyph — vault locked'); }
  }
  function fail(m) { phase = 'over'; host.sfx('error'); wrap.querySelector('.mv-msg').textContent = m; btns[seq[pos]]?.classList.add('lit'); setTimeout(() => finish(false), 1100); }
  function finish(won) { if (done) return; done = true; host.end({ won, score, title: won ? 'Vault opened' : 'Vault locked', msg: `You recalled a ${won ? seq.length : seq.length - 1}-glyph code on ${mode.label}.` }); }

  root.addEventListener('click', (e) => { const m = e.target.closest('[data-m]'); if (m) { host.sfx('click'); begin(m.dataset.m); } const g = e.target.closest('[data-i]'); if (g) press(+g.dataset.i); });
  const key = (e) => { const n = parseInt(e.key, 10); if (phase === 'input' && n >= 1 && n <= btns.length) press(n - 1); };
  window.addEventListener('keydown', key);
  menu();

  const update = (dt) => {
    host.score(score); host.status(mode ? `Code ${round}/${GOAL}` : 'Choose mode');
    if (phase === 'show') {
      showT -= dt;
      if (showT <= 0) {
        btns.forEach((b) => b.classList.remove('lit'));
        if (showI >= seq.length * 2) { phase = 'input'; inputT = mode.per + 1; wrap.querySelector('.mv-msg').textContent = 'Your turn!'; return; }
        if (showI % 2 === 0) { const i = seq[showI / 2]; btns[i].classList.add('lit'); host.sfx('blip', 400 + i * 60); showT = mode.show; } else showT = mode.show * 0.45;
        showI++;
      }
    } else if (phase === 'gap') { showT -= dt; if (showT <= 0) nextRound(); }
    else if (phase === 'input') {
      inputT -= dt;
      const bar = wrap.querySelector('.mv-timer i'); if (bar) bar.style.width = `${Math.max(0, inputT / (mode.per + 1)) * 100}%`;
      if (inputT <= 0) fail('Too slow — vault locked');
    }
  };
  return makeGame(update, () => { window.removeEventListener('keydown', key); root.remove(); });
}
