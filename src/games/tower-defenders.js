// GAME 23 — TOWER DEFENDERS: build, upgrade and sell towers to hold ten waves.
import { createCanvas, makeGame, particles2D } from './lib/kit.js';

const TS = 60, COLS = 16, ROWS = 10;
const PATH = [[-1, 2], [4, 2], [4, 7], [9, 7], [9, 1], [13, 1], [13, 5], [11, 5], [11, 8], [16, 8]];
const TOWERS = {
  cannon: { label: 'Cannon', icon: '💣', cost: 60, color: '#ffd23d', range: 2.3, rate: 1.0, dmg: 22, splash: 0.9 },
  frost: { label: 'Frost Spire', icon: '❄️', cost: 70, color: '#5ab8ff', range: 2.1, rate: 0.7, dmg: 6, slow: 0.5 },
  tesla: { label: 'Tesla Coil', icon: '⚡', cost: 110, color: '#c45cff', range: 2.6, rate: 1.3, dmg: 16, chain: 3 },
};
const ENEMY = { grunt: { hp: 40, speed: 1.1, reward: 6, color: '#ff5a5a', r: 13 }, runner: { hp: 26, speed: 2.1, reward: 7, color: '#ffb23d', r: 10 }, tank: { hp: 160, speed: 0.65, reward: 18, color: '#8a5a5a', r: 19 }, boss: { hp: 1400, speed: 0.5, reward: 150, color: '#ff3d9a', r: 26 } };

function waveList(n) {
  const list = [], k = 1 + n * 0.32;
  for (let i = 0; i < 6 + n * 2; i++) list.push({ type: 'grunt', k });
  if (n >= 2) for (let i = 0; i < n * 2; i++) list.push({ type: 'runner', k });
  if (n >= 4) for (let i = 0; i < n - 2; i++) list.push({ type: 'tank', k });
  if (n === 10) list.push({ type: 'boss', k: 1 });
  return list.sort(() => Math.random() - 0.5);
}

export default function create(host) {
  const W = COLS * TS, H = ROWS * TS;
  const cv = createCanvas(host.el, W, H, { bg: '#4a9a3a' });
  const { ctx } = cv;
  const fx = particles2D();
  // Rasterise the path into tiles; build a polyline in pixels.
  const pathTiles = new Set(), pts = PATH.map(([c, r]) => ({ x: c * TS + TS / 2, y: r * TS + TS / 2 }));
  for (let i = 0; i < PATH.length - 1; i++) { let [c, r] = PATH[i]; const [c2, r2] = PATH[i + 1]; while (c !== c2 || r !== r2) { pathTiles.add(`${c},${r}`); c += Math.sign(c2 - c); r += Math.sign(r2 - r); } pathTiles.add(`${c2},${r2}`); }
  const segLen = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y)), total = segLen.reduce((a, b) => a + b, 0);
  const posAt = (d) => { for (let i = 0; i < segLen.length; i++) { if (d <= segLen[i]) { const k = d / segLen[i]; return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * k, y: pts[i].y + (pts[i + 1].y - pts[i].y) * k }; } d -= segLen[i]; } return pts[pts.length - 1]; };
  const deco = Array.from({ length: 40 }, (_, i) => ({ x: (i * 157) % W, y: (i * 89) % H, s: 3 + (i % 4) }));

  let money = 180, lives = 20, wave = 0, queue = [], spawnT = 0, enemies = [], towers = [], shots = [], sel = 'cannon', picked = null, done = false, t = 0, msg = '', msgT = 0, auto = false, kills = 0;
  const panel = document.createElement('div'); panel.className = 'g-panel'; panel.style.cssText = 'left:50%;bottom:8px;transform:translateX(-50%);display:flex;gap:6px;flex-wrap:wrap;justify-content:center;max-width:calc(100% - 16px)';
  host.el.appendChild(panel);
  function renderPanel() {
    if (picked) {
      const d = TOWERS[picked.type], up = Math.round(d.cost * 0.75 * picked.lvl), sell = Math.round(d.cost * 0.6 * picked.lvl);
      panel.innerHTML = `<span style="padding:0 6px">${d.icon} ${d.label} · Lv ${picked.lvl}</span><button data-up ${picked.lvl >= 3 || money < up ? 'disabled' : ''}>⬆ Upgrade $${up}</button><button data-sell>💰 Sell $${sell}</button><button data-x>✕</button>`;
    } else panel.innerHTML = Object.entries(TOWERS).map(([k, d]) => `<button data-t="${k}" class="${sel === k ? 'on' : ''}" ${money < d.cost ? 'style="opacity:.5"' : ''}>${d.icon} ${d.label} $${d.cost}</button>`).join('') + `<button data-w ${queue.length || enemies.length ? 'disabled' : ''}>▶ ${wave === 0 ? 'Start' : 'Next'} wave</button><button data-auto class="${auto ? 'on' : ''}">Auto</button>`;
  }
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.t) { sel = b.dataset.t; host.sfx('click'); }
    if (b.hasAttribute('data-w')) startWave();
    if (b.hasAttribute('data-auto')) auto = !auto;
    if (b.hasAttribute('data-x')) picked = null;
    if (b.hasAttribute('data-up')) { const c = Math.round(TOWERS[picked.type].cost * 0.75 * picked.lvl); money -= c; picked.lvl++; host.sfx('build'); }
    if (b.hasAttribute('data-sell')) { money += Math.round(TOWERS[picked.type].cost * 0.6 * picked.lvl); towers = towers.filter((x) => x !== picked); picked = null; host.sfx('coin'); }
    renderPanel();
  });
  function startWave() { if (queue.length || enemies.length || wave >= 10) return; wave++; queue = waveList(wave); spawnT = 0; msg = wave === 10 ? 'FINAL WAVE — BOSS INCOMING' : `Wave ${wave}`; msgT = 2; host.sfx('blip', 300); renderPanel(); }

  const onDown = (e) => {
    const p = cv.toLocal(e), c = Math.floor(p.x / TS), r = Math.floor(p.y / TS);
    const existing = towers.find((q) => q.c === c && q.r === r);
    if (existing) { picked = existing; renderPanel(); host.sfx('click'); return; }
    picked = null;
    if (pathTiles.has(`${c},${r}`) || c < 0 || r < 0 || c >= COLS || r >= ROWS) { renderPanel(); return; }
    const d = TOWERS[sel]; if (money < d.cost) { msg = 'Not enough gold'; msgT = 1.2; host.sfx('error'); return; }
    money -= d.cost; towers.push({ type: sel, c, r, x: c * TS + TS / 2, y: r * TS + TS / 2, lvl: 1, cd: 0, ang: 0 }); host.sfx('build'); renderPanel();
  };
  cv.canvas.addEventListener('pointerdown', onDown);
  renderPanel();

  const update = (dt) => {
    t += dt; msgT -= dt;
    if (queue.length) { spawnT -= dt; if (spawnT <= 0) { const q = queue.pop(), d = ENEMY[q.type]; enemies.push({ ...d, type: q.type, hp: d.hp * q.k, max: d.hp * q.k, d: 0, slowT: 0 }); spawnT = q.type === 'runner' ? 0.45 : 0.8; } }
    for (const en of enemies) {
      en.slowT -= dt; en.d += en.speed * TS * dt * (en.slowT > 0 ? 0.5 : 1);
      Object.assign(en, posAt(en.d));
      if (en.d >= total) { en.dead = true; lives -= en.type === 'boss' ? 10 : en.type === 'tank' ? 2 : 1; host.sfx('hurt'); }
    }
    for (const tw of towers) {
      const d = TOWERS[tw.type], range = d.range * TS * (1 + (tw.lvl - 1) * 0.15), dmg = d.dmg * (1 + (tw.lvl - 1) * 0.7);
      tw.cd -= dt;
      const inRange = enemies.filter((e) => !e.dead && Math.hypot(e.x - tw.x, e.y - tw.y) < range).sort((a, b) => b.d - a.d);
      if (!inRange.length) continue;
      tw.ang = Math.atan2(inRange[0].y - tw.y, inRange[0].x - tw.x);
      if (tw.cd > 0) continue;
      tw.cd = 1 / d.rate;
      if (tw.type === 'cannon') { shots.push({ x: tw.x, y: tw.y, tx: inRange[0], sp: 520, dmg, splash: d.splash * TS, color: d.color }); host.sfx('shoot'); }
      if (tw.type === 'frost') { inRange.slice(0, 2 + tw.lvl).forEach((e) => { e.hp -= dmg; e.slowT = 1.6 + tw.lvl * 0.4; fx.burst(e.x, e.y, '#bde8ff', 5, 60, 0.4); }); host.sfx('blip', 1200); }
      if (tw.type === 'tesla') { let from = tw; inRange.slice(0, d.chain + tw.lvl - 1).forEach((e, i) => { e.hp -= dmg * (1 - i * 0.2); shots.push({ bolt: true, x: from.x, y: from.y, x2: e.x, y2: e.y, life: 0.12, color: d.color }); from = e; }); host.sfx('laser'); }
    }
    for (const s of shots) {
      if (s.bolt) { s.life -= dt; continue; }
      const dx = s.tx.x - s.x, dy = s.tx.y - s.y, dist = Math.hypot(dx, dy);
      if (dist < 10 || s.tx.dead) { enemies.forEach((e) => { if (Math.hypot(e.x - s.tx.x, e.y - s.tx.y) < s.splash) e.hp -= s.dmg; }); fx.burst(s.tx.x, s.tx.y, '#ffd23d', 14, 160, 0.5); s.done = true; continue; }
      s.x += (dx / dist) * s.sp * dt; s.y += (dy / dist) * s.sp * dt;
    }
    shots = shots.filter((s) => !s.done && (!s.bolt || s.life > 0));
    for (const en of enemies) if (!en.dead && en.hp <= 0) { en.dead = true; money += en.reward; kills++; fx.burst(en.x, en.y, en.color, 12, 140, 0.5); fx.text(en.x, en.y - 10, `+${en.reward}`, '#ffd23d'); if (en.type === 'boss') host.sfx('explode'); }
    enemies = enemies.filter((e) => !e.dead);
    fx.update(dt, 0);
    if (!queue.length && !enemies.length && wave > 0) {
      if (wave >= 10 && !done) { done = true; host.end({ won: true, score: kills * 10 + lives * 100 + money, title: 'The realm holds!', msg: `All ten waves repelled with ${lives} lives left.` }); }
      else if (auto && !done) startWave();
    }
    if (lives <= 0 && !done) { done = true; host.end({ won: false, score: kills * 10 + wave * 100, title: 'The gates fell', msg: `You held out until wave ${wave}.` }); }
    if (Math.floor(t * 4) !== Math.floor((t - dt) * 4)) renderPanel();

    // Draw
    ctx.fillStyle = '#4a9a3a'; ctx.fillRect(0, 0, W, H);
    for (const d of deco) { ctx.fillStyle = '#3a8a2a'; ctx.beginPath(); ctx.arc(d.x, d.y, d.s, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = '#c8a868'; ctx.lineWidth = TS * 0.78; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
    ctx.strokeStyle = '#d8b878'; ctx.lineWidth = TS * 0.6; ctx.stroke();
    ctx.fillStyle = '#5a4a8a'; ctx.fillRect(W - 30, pts[pts.length - 1].y - 40, 30, 80); ctx.fillStyle = '#ffd23d'; ctx.font = '22px sans-serif'; ctx.fillText('🏰', W - 34, pts[pts.length - 1].y + 8);
    for (const tw of towers) {
      const d = TOWERS[tw.type];
      if (tw === picked) { ctx.fillStyle = '#ffffff22'; ctx.beginPath(); ctx.arc(tw.x, tw.y, d.range * TS * (1 + (tw.lvl - 1) * 0.15), 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#3a3a4a'; ctx.beginPath(); ctx.arc(tw.x, tw.y, 22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = d.color; ctx.beginPath(); ctx.arc(tw.x, tw.y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(tw.x, tw.y); ctx.rotate(tw.ang); ctx.fillStyle = '#2a2a3a'; ctx.fillRect(4, -4, 20, 8); ctx.restore();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Inter'; ctx.textAlign = 'center'; ctx.fillText('★'.repeat(tw.lvl), tw.x, tw.y + 34);
    }
    for (const en of enemies) {
      ctx.fillStyle = en.slowT > 0 ? '#9ad8ff' : en.color; ctx.beginPath(); ctx.arc(en.x, en.y, en.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000a'; ctx.fillRect(en.x - 14, en.y - en.r - 9, 28, 4); ctx.fillStyle = '#5aff6a'; ctx.fillRect(en.x - 14, en.y - en.r - 9, 28 * Math.max(0, en.hp / en.max), 4);
    }
    for (const s of shots) {
      if (s.bolt) { ctx.strokeStyle = s.color; ctx.lineWidth = 3; ctx.shadowColor = s.color; ctx.shadowBlur = 12; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo((s.x + s.x2) / 2 + (Math.random() - 0.5) * 16, (s.y + s.y2) / 2 + (Math.random() - 0.5) * 16); ctx.lineTo(s.x2, s.y2); ctx.stroke(); ctx.shadowBlur = 0; }
      else { ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(s.x, s.y, 6, 0, Math.PI * 2); ctx.fill(); }
    }
    fx.draw(ctx);
    ctx.fillStyle = '#0008'; ctx.beginPath(); ctx.roundRect(10, 10, 360, 36, 10); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '600 17px Space Grotesk, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`💰 ${money}    ❤ ${lives}    🌊 Wave ${wave}/10`, 22, 34);
    if (msgT > 0) { ctx.textAlign = 'center'; ctx.font = 'bold 40px Space Grotesk, sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2 - 60); }
    if (wave === 0 && !towers.length) { ctx.textAlign = 'center'; ctx.font = '18px Inter, sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText('Pick a tower below, click grass to build, then start the wave', W / 2, H / 2); }
    host.score(kills * 10 + lives * 100); host.status(`Wave ${wave}/10 · ❤ ${lives}`);
  };
  return makeGame(update, () => { cv.canvas.removeEventListener('pointerdown', onDown); panel.remove(); cv.dispose(); });
}
