// GAME 14 — ESCAPE THE ROOM: point-and-click puzzle in a locked observatory study.
import { createCanvas, makeGame } from './lib/kit.js';

const ITEMS = {
  key: { name: 'Small key', icon: '🗝️' }, torch: { name: 'UV torch', icon: '🔦' }, lens: { name: 'Brass lens', icon: '🔍' },
  gear: { name: 'Brass gear', icon: '⚙️' }, doorkey: { name: 'Door key', icon: '🔑' },
};
const CODE = '4729', DIAL = ['☾', '★', '☀'], SYMBOLS = ['☀', '☾', '★', '✦', '♠'];

export default function create(host) {
  const cv = createCanvas(host.el, 960, 540, { bg: '#1e140e' });
  const { ctx } = cv;
  const ui = document.createElement('div'); ui.className = 'g-panel'; ui.style.cssText = 'left:50%;bottom:10px;transform:translateX(-50%);display:flex;gap:8px;align-items:center;max-width:calc(100% - 20px);flex-wrap:wrap;justify-content:center';
  host.el.appendChild(ui);
  const modal = document.createElement('div'); modal.className = 'g-panel'; modal.style.cssText = 'left:50%;top:50%;transform:translate(-50%,-50%);display:none;padding:22px;text-align:center;min-width:280px';
  host.el.appendChild(modal);

  const S = { inv: [], sel: null, rug: false, keyTaken: false, drawer: false, torchTaken: false, globe: 0, lensTaken: false, lens: false, painting: false, safe: false, gearTaken: false, gear: false, doorkeyTaken: false, uv: false, dial: false };
  let msg = 'You wake in a locked study. Moonlight spills through the window…', msgT = 6, t = 0, hints = 0, hover = null, done = false;
  const say = (m) => { msg = m; msgT = 5; };
  const take = (k) => { S.inv.push(k); host.sfx('coin'); say(`Picked up: ${ITEMS[k].name}.`); renderUI(); };
  const use = (k) => { S.inv = S.inv.filter((x) => x !== k); S.sel = null; renderUI(); };

  function renderUI() {
    ui.innerHTML = `<span style="opacity:.7;font-size:12px;letter-spacing:.1em">INVENTORY</span>${S.inv.length ? S.inv.map((k) => `<button data-item="${k}" class="${S.sel === k ? 'on' : ''}" title="${ITEMS[k].name}">${ITEMS[k].icon} ${ITEMS[k].name}</button>`).join('') : '<span style="opacity:.5">empty</span>'}<button data-hint style="margin-left:8px">💡 Hint</button>`;
  }
  ui.addEventListener('click', (e) => {
    const it = e.target.closest('[data-item]');
    if (it) { S.sel = S.sel === it.dataset.item ? null : it.dataset.item; host.sfx('click'); if (S.sel) say(`Using ${ITEMS[S.sel].name} — click where to use it.`); renderUI(); }
    if (e.target.closest('[data-hint]')) { hints++; host.sfx('blip', 800); say('Hint: ' + nextHint()); }
  });
  function nextHint() {
    if (!S.keyTaken) return 'The rug looks a little rumpled at one corner.';
    if (!S.drawer) return 'The desk drawer has a tiny keyhole.';
    if (!S.torchTaken) return 'Take what is inside the drawer.';
    if (!S.lensTaken) return 'The globe on the desk has a seam. Keep inspecting it.';
    if (!S.lens) return 'The telescope needs a lens.';
    if (!S.painting) return 'Paintings sometimes hide things.';
    if (!S.safe) return 'Look through the telescope and count the stars in each constellation, I to IV.';
    if (!S.gearTaken) return 'Take what is inside the safe.';
    if (!S.gear) return 'The grandfather clock is missing a gear.';
    if (!S.doorkeyTaken) return 'Something opened at the base of the clock.';
    if (!S.uv) return 'Some books are best "read by moonlight" — try the UV torch on the bookshelf.';
    if (!S.dial) return 'The door dial wants the glowing symbols from the bookshelf, in order.';
    return 'Use the door key on the door.';
  }

  function showModal(html, onClick) {
    modal.innerHTML = html + '<div style="margin-top:14px"><button data-close>Close</button></div>'; modal.style.display = 'block';
    modal.onclick = (e) => { if (e.target.closest('[data-close]')) { modal.style.display = 'none'; return; } onClick?.(e); };
  }
  function keypad() {
    let entry = '';
    const draw = () => showModal(`<div style="font:600 13px Space Grotesk;letter-spacing:.14em;opacity:.7">WALL SAFE</div><div style="font:700 36px Space Grotesk;letter-spacing:.3em;margin:10px 0;padding:8px;border-radius:10px;background:#000;color:#5aff8a;min-height:52px">${entry.padEnd(4, '·')}</div>
      <div style="display:grid;grid-template-columns:repeat(3,64px);gap:8px;justify-content:center">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '↵'].map((k) => `<button data-k="${k}" style="height:52px;font-size:20px">${k}</button>`).join('')}</div>`, (e) => {
      const k = e.target.closest('[data-k]')?.dataset.k; if (k == null) return;
      host.sfx('blip', 600);
      if (k === 'C') entry = ''; else if (k === '↵') {
        if (entry === CODE) { S.safe = true; modal.style.display = 'none'; host.sfx('success'); say('Click! The safe swings open. A brass gear sits inside.'); return; }
        host.sfx('error'); entry = ''; say('The keypad buzzes. Wrong code.');
      } else if (entry.length < 4) entry += k;
      draw();
    });
    draw();
  }
  function dialLock() {
    const v = [0, 0, 0];
    const draw = () => showModal(`<div style="font:600 13px Space Grotesk;letter-spacing:.14em;opacity:.7">DOOR SYMBOL DIAL</div><div style="display:flex;gap:10px;justify-content:center;margin:14px 0">${v.map((x, i) => `<button data-d="${i}" style="width:74px;height:90px;font-size:40px">${SYMBOLS[x]}</button>`).join('')}</div><button data-try>Try the handle</button>`, (e) => {
      const d = e.target.closest('[data-d]'); if (d) { v[d.dataset.d] = (v[d.dataset.d] + 1) % SYMBOLS.length; host.sfx('rotate'); draw(); }
      if (e.target.closest('[data-try]')) { if (v.every((x, i) => SYMBOLS[x] === DIAL[i])) { S.dial = true; modal.style.display = 'none'; host.sfx('success'); say('The dial clunks into place. Now the keyhole…'); } else { host.sfx('error'); say('The dial does not budge.'); } }
    });
    draw();
  }
  function telescope() {
    const groups = [4, 7, 2, 9];
    showModal(`<div style="font:600 13px Space Grotesk;letter-spacing:.14em;opacity:.7">THROUGH THE TELESCOPE</div><svg viewBox="0 0 400 220" width="360" style="background:radial-gradient(#1a2a5a,#02040c);border-radius:50%;margin-top:10px">${groups.map((n, g) => { const cx = 60 + g * 95, cy = 110; let s = `<text x="${cx}" y="200" fill="#8a9ad8" font-size="14" text-anchor="middle">${['I', 'II', 'III', 'IV'][g]}</text>`; for (let i = 0; i < n; i++) { const a = i * 2.4 + g, r = 10 + i * 5; s += `<circle cx="${cx + Math.cos(a) * r * 0.8}" cy="${cy + Math.sin(a) * r}" r="3" fill="#fff"/>`; } return s; }).join('')}</svg>`);
  }

  const H = [
    { id: 'rug', x: 250, y: 455, w: 380, h: 70, act() { if (!S.rug) { S.rug = true; host.sfx('slice'); say('You lift the rug corner. Something glints!'); } else if (!S.keyTaken) { S.keyTaken = true; take('key'); } else say('Just floorboards now.'); } },
    { id: 'drawer', x: 300, y: 360, w: 100, h: 40, act() { if (!S.drawer) { if (S.sel === 'key') { S.drawer = true; use('key'); host.sfx('success'); say('The drawer slides open. A UV torch and a note: "The heavens hold the code."'); } else say('The drawer is locked. A tiny keyhole.'); } else if (!S.torchTaken) { S.torchTaken = true; take('torch'); } else say('An empty drawer.'); } },
    { id: 'globe', x: 425, y: 268, w: 80, h: 72, act() { if (S.globe === 0) { S.globe = 1; say('A thin seam runs around the equator…'); } else if (S.globe === 1) { S.globe = 2; host.sfx('rotate'); say('You twist the globe. It splits open — a brass lens inside!'); } else if (!S.lensTaken) { S.lensTaken = true; take('lens'); } else say('An empty hollow globe.'); } },
    { id: 'telescope', x: 570, y: 240, w: 90, h: 180, act() { if (!S.lens) { if (S.sel === 'lens') { S.lens = true; use('lens'); host.sfx('success'); say('The lens clicks into the eyepiece.'); } else say('The telescope is missing its lens.'); } else { telescope(); say('Four constellations, numbered I to IV.'); } } },
    { id: 'painting', x: 600, y: 85, w: 150, h: 120, act() { if (!S.painting) { S.painting = true; host.sfx('slice'); say('The painting swings aside, revealing a wall safe!'); } else if (!S.safe) keypad(); else if (!S.gearTaken) { S.gearTaken = true; take('gear'); } else say('The safe is empty.'); } },
    { id: 'clock', x: 775, y: 110, w: 80, h: 310, act() { if (!S.gear) { if (S.sel === 'gear') { S.gear = true; use('gear'); host.sfx('win'); say('The clock whirs to life and chimes. A compartment at its base pops open!'); } else say('The grandfather clock has stopped. A gear seems to be missing.'); } else if (!S.doorkeyTaken) { S.doorkeyTaken = true; take('doorkey'); } else say('Tick… tock…'); } },
    { id: 'shelf', x: 40, y: 110, w: 170, h: 310, act() { if (S.sel === 'torch') { S.uv = true; S.sel = null; renderUI(); host.sfx('success'); say('Under UV light, glowing symbols appear across the spines: ☾ ★ ☀'); } else say(S.uv ? 'The glowing symbols read: ☾ ★ ☀' : 'Astronomy books. One spine reads "Read by Moonlight".'); } },
    { id: 'door', x: 875, y: 140, w: 78, h: 282, act() { if (!S.dial) dialLock(); else if (S.sel === 'doorkey') { use('doorkey'); escape(); } else say('The dial is set. The door still needs a key.'); } },
    { id: 'window', x: 375, y: 60, w: 190, h: 170, act() { say('A clear, starry night. Perfect for stargazing.'); } },
  ];
  function escape() {
    if (done) return; done = true; host.sfx('win'); say('The door creaks open. Fresh night air. You are free!');
    const score = Math.max(200, Math.round(4000 - t * 3 - hints * 250));
    setTimeout(() => host.end({ won: true, score, title: 'You escaped!', msg: `Escaped in ${Math.floor(t / 60)}m ${Math.floor(t % 60)}s using ${hints} hint${hints === 1 ? '' : 's'}.` }), 900);
  }

  const hit = (p) => H.find((h) => p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h && !(h.id === 'window' && p.y > 230));
  const onMove = (e) => { hover = hit(cv.toLocal(e)); cv.canvas.style.cursor = hover ? 'pointer' : 'default'; };
  const onDown = (e) => { if (modal.style.display === 'block') return; const h = hit(cv.toLocal(e)); if (h) { host.sfx('click'); h.act(); } else if (S.sel) { S.sel = null; renderUI(); } };
  cv.canvas.addEventListener('pointermove', onMove); cv.canvas.addEventListener('pointerdown', onDown);
  renderUI();

  function draw() {
    const c = ctx, g = c.createLinearGradient(0, 0, 0, 430); g.addColorStop(0, '#3e2c20'); g.addColorStop(1, '#24170f'); c.fillStyle = g; c.fillRect(0, 0, 960, 430);
    for (let x = 0; x < 960; x += 80) { c.fillStyle = '#ffffff06'; c.fillRect(x, 0, 2, 430); }
    c.fillStyle = '#2e1f15'; c.fillRect(0, 330, 960, 100); c.fillStyle = '#4a3222'; c.fillRect(0, 326, 960, 6);
    for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? '#5a3c28' : '#523624'; c.fillRect(0, 430 + i * 10, 960, 10); }
    // Window
    const wg = c.createLinearGradient(0, 60, 0, 230); wg.addColorStop(0, '#0a1230'); wg.addColorStop(1, '#1e2a5a'); c.fillStyle = wg; c.fillRect(380, 65, 180, 160);
    c.fillStyle = '#fff'; for (let i = 0; i < 26; i++) { c.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t + i)); c.fillRect(385 + ((i * 53) % 170), 70 + ((i * 37) % 150), 2, 2); } c.globalAlpha = 1;
    c.fillStyle = '#fff8d8'; c.beginPath(); c.arc(520, 100, 18, 0, 7); c.fill(); c.fillStyle = '#0e1838'; c.beginPath(); c.arc(528, 95, 16, 0, 7); c.fill();
    c.strokeStyle = '#6a4a2a'; c.lineWidth = 8; c.strokeRect(380, 65, 180, 160); c.lineWidth = 4; c.beginPath(); c.moveTo(470, 65); c.lineTo(470, 225); c.moveTo(380, 145); c.lineTo(560, 145); c.stroke();
    // Moonlight beam
    c.fillStyle = 'rgba(180,200,255,.05)'; c.beginPath(); c.moveTo(380, 225); c.lineTo(560, 225); c.lineTo(700, 520); c.lineTo(300, 520); c.fill();
    // Bookshelf
    c.fillStyle = '#3a2416'; c.fillRect(40, 110, 170, 310); c.fillStyle = '#24160c'; c.fillRect(50, 120, 150, 290);
    const bc = ['#7a2a2a', '#2a4a7a', '#3a6a3a', '#7a6a2a', '#5a2a6a', '#2a6a6a'];
    for (let s = 0; s < 4; s++) { c.fillStyle = '#3a2416'; c.fillRect(50, 120 + s * 72 + 66, 150, 6); let x = 54; for (let b = 0; x < 192; b++) { const w = 10 + ((s * 7 + b * 3) % 8), h = 44 + ((s + b) % 4) * 5; c.fillStyle = bc[(s + b) % 6]; c.fillRect(x, 186 + s * 72 - h, w, h); if (S.uv && b % 4 === 1 && s < 3) { c.save(); c.shadowColor = '#b45cff'; c.shadowBlur = 12; c.fillStyle = '#e8b0ff'; c.font = '16px sans-serif'; c.fillText(DIAL[s], x - 2, 180 + s * 72 - h / 2); c.restore(); } x += w + 2; } }
    // Painting / safe
    if (S.painting) { c.fillStyle = '#5a5a60'; c.fillRect(630, 105, 90, 80); c.fillStyle = '#2a2a30'; c.fillRect(638, 113, 74, 64); c.fillStyle = S.safe ? '#1a1a1a' : '#8a8a90'; c.beginPath(); c.arc(675, 145, 14, 0, 7); c.fill(); if (S.safe && !S.gearTaken) { c.font = '26px sans-serif'; c.fillText('⚙️', 660, 156); } }
    c.save(); if (S.painting) { c.translate(750, 85); c.rotate(0.25); c.translate(-750, -85); }
    c.fillStyle = '#c89a4a'; c.fillRect(600, 85, 150, 120); const pg = c.createLinearGradient(0, 95, 0, 195); pg.addColorStop(0, '#f2a86a'); pg.addColorStop(1, '#5a3a6a'); c.fillStyle = pg; c.fillRect(610, 95, 130, 100);
    c.fillStyle = '#2a1a3a'; c.beginPath(); c.moveTo(610, 195); c.lineTo(650, 140); c.lineTo(690, 175); c.lineTo(720, 130); c.lineTo(740, 195); c.fill(); c.restore();
    // Desk + globe + candle
    c.fillStyle = '#5a3a22'; c.fillRect(260, 340, 270, 20); c.fillRect(270, 360, 20, 70); c.fillRect(500, 360, 20, 70); c.fillStyle = '#4a2e1a'; c.fillRect(300, 360, 100, 40);
    if (S.drawer) { c.fillStyle = '#3a2214'; c.fillRect(296, 396, 108, 26); if (!S.torchTaken) { c.font = '20px sans-serif'; c.fillText('🔦', 330, 418); } }
    c.fillStyle = '#d8a35a'; c.fillRect(342, 376, 16, 5);
    c.fillStyle = '#6a4a2a'; c.fillRect(458, 320, 14, 20);
    if (S.globe < 2) { c.fillStyle = '#2a6aa8'; c.beginPath(); c.arc(465, 296, 26, 0, 7); c.fill(); c.fillStyle = '#5aa85a'; c.beginPath(); c.ellipse(458 + Math.sin(t * 0.5) * 6, 290, 10, 14, 0.4, 0, 7); c.fill(); if (S.globe === 1) { c.strokeStyle = '#d8a35a'; c.lineWidth = 2; c.beginPath(); c.moveTo(439, 296); c.lineTo(491, 296); c.stroke(); } }
    else { c.fillStyle = '#2a6aa8'; c.beginPath(); c.arc(465, 290, 26, Math.PI, 0); c.fill(); c.beginPath(); c.arc(465, 308, 26, 0, Math.PI); c.fill(); if (!S.lensTaken) { c.font = '18px sans-serif'; c.fillText('🔍', 455, 306); } }
    c.fillStyle = '#efe6d0'; c.fillRect(285, 318, 12, 22); c.save(); c.shadowColor = '#ffb84a'; c.shadowBlur = 30; c.fillStyle = '#ffcf6a'; c.beginPath(); c.ellipse(291, 312 + Math.sin(t * 9) * 1, 4, 8, 0, 0, 7); c.fill(); c.restore();
    // Telescope
    c.strokeStyle = '#8a6a3a'; c.lineWidth = 5; c.beginPath(); c.moveTo(615, 330); c.lineTo(585, 420); c.moveTo(615, 330); c.lineTo(645, 420); c.moveTo(615, 330); c.lineTo(615, 420); c.stroke();
    c.save(); c.translate(615, 320); c.rotate(-0.6); c.fillStyle = '#c89a4a'; c.fillRect(-50, -10, 100, 20); c.fillStyle = S.lens ? '#7bd8ff' : '#2a2a2a'; c.fillRect(48, -12, 8, 24); c.restore();
    // Clock
    c.fillStyle = '#4a2a18'; c.fillRect(780, 115, 70, 305); c.fillStyle = '#efe6d0'; c.beginPath(); c.arc(815, 165, 28, 0, 7); c.fill();
    c.strokeStyle = '#222'; c.lineWidth = 3; const ang = S.gear ? t : 2.6; c.beginPath(); c.moveTo(815, 165); c.lineTo(815 + Math.cos(ang - 1.57) * 22, 165 + Math.sin(ang - 1.57) * 22); c.moveTo(815, 165); c.lineTo(815 + Math.cos(ang / 12 + 2) * 14, 165 + Math.sin(ang / 12 + 2) * 14); c.stroke();
    c.fillStyle = '#2a180c'; c.fillRect(795, 210, 40, 130); c.fillStyle = '#d8a35a'; c.beginPath(); c.arc(815 + (S.gear ? Math.sin(t * 3) * 12 : 0), 310, 9, 0, 7); c.fill();
    if (S.gear) { c.fillStyle = '#120a04'; c.fillRect(795, 360, 40, 40); if (!S.doorkeyTaken) { c.font = '22px sans-serif'; c.fillText('🔑', 802, 388); } }
    // Door
    c.fillStyle = '#5a3a20'; c.fillRect(875, 140, 78, 282); c.strokeStyle = '#3a2410'; c.lineWidth = 4; c.strokeRect(885, 155, 58, 110); c.strokeRect(885, 285, 58, 120);
    c.fillStyle = '#d8a35a'; c.beginPath(); c.arc(890, 290, 6, 0, 7); c.fill(); c.fillStyle = S.dial ? '#5aff8a' : '#ff5a5a'; c.beginPath(); c.arc(915, 310, 4, 0, 7); c.fill();
    // Rug
    c.fillStyle = '#7a2a2a'; c.beginPath(); c.ellipse(440, 488, 190, 34, 0, 0, 7); c.fill(); c.strokeStyle = '#d8a35a'; c.lineWidth = 3; c.beginPath(); c.ellipse(440, 488, 170, 26, 0, 0, 7); c.stroke();
    if (S.rug) { c.fillStyle = '#5a1a1a'; c.beginPath(); c.moveTo(580, 470); c.lineTo(625, 478); c.lineTo(600, 505); c.fill(); if (!S.keyTaken) { c.save(); c.shadowColor = '#ffd23d'; c.shadowBlur = 16; c.font = '18px sans-serif'; c.fillText('🗝️', 590, 512); c.restore(); } }
    // Darkness vignette
    const v = c.createRadialGradient(480, 280, 200, 480, 280, 620); v.addColorStop(0, 'transparent'); v.addColorStop(1, 'rgba(0,0,0,.6)'); c.fillStyle = v; c.fillRect(0, 0, 960, 540);
    if (hover) { c.strokeStyle = S.sel ? '#5affb4' : '#ffd88a'; c.lineWidth = 2; c.setLineDash([6, 6]); c.strokeRect(hover.x, hover.y, hover.w, hover.h); c.setLineDash([]); }
    if (msgT > 0) { c.globalAlpha = Math.min(1, msgT); c.fillStyle = 'rgba(10,6,4,.8)'; c.beginPath(); c.roundRect(130, 14, 700, 40, 12); c.fill(); c.fillStyle = '#f4e4c8'; c.font = '16px Inter, sans-serif'; c.textAlign = 'center'; c.fillText(msg, 480, 40); c.textAlign = 'left'; c.globalAlpha = 1; }
  }

  const update = (dt) => {
    t += dt; msgT -= dt; draw();
    const solvedCount = [S.keyTaken, S.drawer, S.lensTaken, S.lens, S.safe, S.gear, S.doorkeyTaken, S.uv, S.dial].filter(Boolean).length;
    host.score(solvedCount * 100); host.status(`${solvedCount}/9 puzzles · ${hints} hints`);
  };
  return makeGame(update, () => { cv.canvas.removeEventListener('pointermove', onMove); cv.canvas.removeEventListener('pointerdown', onDown); ui.remove(); modal.remove(); cv.dispose(); });
}
