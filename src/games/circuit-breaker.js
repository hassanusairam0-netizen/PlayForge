// GAME 12 — CIRCUIT BREAKER: rotate wiring tiles until every lamp is powered from the core.
import { createCanvas, makeGame, createHud, particles2D } from './lib/kit.js';

const SIZES = [[4, 4], [5, 4], [5, 5], [6, 5], [6, 6], [7, 6], [7, 7], [8, 7]];
const N = 1, E = 2, S = 4, W = 8, DIRS = [[N, 0, -1, S], [E, 1, 0, W], [S, 0, 1, N], [W, -1, 0, E]];
const rot = (m, k = 1) => { for (let i = 0; i < k; i++) m = ((m << 1) | (m >> 3)) & 15; return m; };

function generate(w, h) {
  const g = Array.from({ length: h }, () => Array(w).fill(0));
  const sx = Math.floor(w / 2), sy = Math.floor(h / 2), seen = new Set([`${sx},${sy}`]), stack = [[sx, sy]];
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const opts = DIRS.filter(([, dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < w && ny < h && !seen.has(`${nx},${ny}`); });
    // Prefer branching a bit so we get more lamps.
    if (!opts.length || (stack.length > 3 && Math.random() < 0.18)) { stack.pop(); if (!opts.length) continue; else continue; }
    const [d, dx, dy, back] = opts[Math.floor(Math.random() * opts.length)];
    g[y][x] |= d; g[y + dy][x + dx] |= back; seen.add(`${x + dx},${y + dy}`); stack.push([x + dx, y + dy]);
  }
  // Any unvisited cells (because of early pops) get attached to a visited neighbour.
  let changed = true;
  while (changed) { changed = false; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!seen.has(`${x},${y}`)) { for (const [d, dx, dy, back] of DIRS) { const nx = x + dx, ny = y + dy; if (seen.has(`${nx},${ny}`)) { g[y][x] |= d; g[ny][nx] |= back; seen.add(`${x},${y}`); changed = true; break; } } } }
  const tiles = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const m = g[y][x], count = [N, E, S, W].filter((b) => m & b).length;
    tiles.push({ x, y, solved: m, mask: rot(m, Math.floor(Math.random() * 4)), angle: 0, lamp: count === 1 && !(x === sx && y === sy), core: x === sx && y === sy, lit: false });
  }
  return { w, h, sx, sy, tiles };
}

export default function create(host) {
  const cv = createCanvas(host.el, 960, 600, { bg: '#0e1122' });
  const { ctx } = cv;
  const hud = createHud(host.el);
  const fx = particles2D();
  let level = 0, B, moves = 0, total = 0, t = 0, winT = 0, done = false;

  function load(i) {
    const [w, h] = SIZES[i];
    do { B = generate(w, h); } while (power() === B.tiles.filter((x) => x.lamp).length);
    moves = 0; winT = 0;
  }
  function power() {
    B.tiles.forEach((x) => (x.lit = false));
    const at = (x, y) => B.tiles[y * B.w + x];
    const q = [at(B.sx, B.sy)]; q[0].lit = true;
    while (q.length) {
      const c = q.shift();
      for (const [d, dx, dy, back] of DIRS) {
        if (!(c.mask & d)) continue; const nx = c.x + dx, ny = c.y + dy;
        if (nx < 0 || ny < 0 || nx >= B.w || ny >= B.h) continue;
        const n = at(nx, ny); if (!n.lit && n.mask & back) { n.lit = true; q.push(n); }
      }
    }
    return B.tiles.filter((x) => x.lamp && x.lit).length;
  }
  load(0); power();

  const layout = () => { const s = Math.min(800 / B.w, 520 / B.h); return { s, ox: 480 - (B.w * s) / 2, oy: 330 - (B.h * s) / 2 }; };
  const onDown = (e) => {
    if (winT > 0) return;
    const p = cv.toLocal(e), { s, ox, oy } = layout();
    const x = Math.floor((p.x - ox) / s), y = Math.floor((p.y - oy) / s);
    if (x < 0 || y < 0 || x >= B.w || y >= B.h) return;
    const tile = B.tiles[y * B.w + x]; const ccw = e.button === 2;
    tile.mask = rot(tile.mask, ccw ? 3 : 1); tile.angle += ccw ? Math.PI / 2 : -Math.PI / 2; moves++;
    host.sfx('rotate');
    const lamps = B.tiles.filter((q) => q.lamp).length;
    if (power() === lamps) {
      const pts = Math.max(60, 200 + B.w * B.h * 12 - moves * 4); total += pts; winT = 1.6; host.sfx('success');
      B.tiles.filter((q) => q.lamp).forEach((q) => fx.burst(ox + (q.x + 0.5) * s, oy + (q.y + 0.5) * s, '#ffe23d', 14, 160));
    }
  };
  const noCtx = (e) => e.preventDefault();
  cv.canvas.addEventListener('pointerdown', onDown); cv.canvas.addEventListener('contextmenu', noCtx);

  const update = (dt) => {
    t += dt; fx.update(dt, 200);
    if (winT > 0) { winT -= dt; if (winT <= 0) { level++; if (level >= SIZES.length) { if (!done) { done = true; host.end({ won: true, score: total, title: 'Grid online', msg: 'All eight boards fully powered.' }); } return; } load(level); power(); } }
    const { s, ox, oy } = layout();
    ctx.fillStyle = '#0e1122'; ctx.fillRect(0, 0, 960, 600);
    ctx.fillStyle = '#ffe23d'; ctx.font = '600 15px Space Grotesk, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`BOARD ${level + 1}/${SIZES.length}   ·   MOVES ${moves}`, 24, 34);
    const lamps = B.tiles.filter((q) => q.lamp), lit = lamps.filter((q) => q.lit).length;
    ctx.textAlign = 'right'; ctx.fillText(`LAMPS ${lit}/${lamps.length}`, 936, 34);
    for (const tile of B.tiles) {
      tile.angle *= Math.pow(0.0001, dt);
      const cx = ox + (tile.x + 0.5) * s, cy = oy + (tile.y + 0.5) * s;
      ctx.fillStyle = '#171b33'; ctx.beginPath(); ctx.roundRect(cx - s / 2 + 3, cy - s / 2 + 3, s - 6, s - 6, 10); ctx.fill();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(tile.angle);
      const col = tile.lit ? '#ffe23d' : '#3a4270';
      ctx.strokeStyle = col; ctx.lineWidth = s * 0.16; ctx.lineCap = 'round';
      if (tile.lit) { ctx.shadowColor = '#ffe23d'; ctx.shadowBlur = 14; }
      for (const [d, dx, dy] of DIRS) if (tile.mask & d) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(dx * s / 2, dy * s / 2); ctx.stroke(); }
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, s * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.restore(); ctx.shadowBlur = 0;
      if (tile.core) { ctx.save(); ctx.shadowColor = '#3dffb2'; ctx.shadowBlur = 24; ctx.fillStyle = '#3dffb2'; ctx.beginPath(); ctx.arc(cx, cy, s * 0.22 + Math.sin(t * 4) * 2, 0, Math.PI * 2); ctx.fill(); ctx.restore(); ctx.fillStyle = '#0e1122'; ctx.font = `bold ${s * 0.22}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⚡', cx, cy + 1); ctx.textBaseline = 'alphabetic'; }
      if (tile.lamp) { ctx.save(); if (tile.lit) { ctx.shadowColor = '#ffe23d'; ctx.shadowBlur = 30; } ctx.fillStyle = tile.lit ? '#fff6b0' : '#2a2f50'; ctx.beginPath(); ctx.arc(cx, cy, s * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.restore(); ctx.strokeStyle = tile.lit ? '#ffe23d' : '#4a5280'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, s * 0.2, 0, Math.PI * 2); ctx.stroke(); }
    }
    fx.draw(ctx);
    if (winT > 0) { ctx.fillStyle = '#3dffb2'; ctx.font = 'bold 44px Space Grotesk, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('CIRCUIT COMPLETE', 480, 70); }
    host.score(total); host.status(`Board ${level + 1}/${SIZES.length}`);
  };
  return makeGame(update, () => { cv.canvas.removeEventListener('pointerdown', onDown); cv.canvas.removeEventListener('contextmenu', noCtx); hud.remove(); cv.dispose(); });
}
