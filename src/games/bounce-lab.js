// GAME 17 — BOUNCE LAB: an always-bouncing ball, ramps, springs and moving platforms across five labs.
import { createCanvas, createInput, makeGame, particles2D, clamp } from './lib/kit.js';

const TS = 40, R = 14, G = 1500, BOUNCE = 640, POWER = 900, SPRING = 1100;
// # solid · / \ ramps · S spring · ^ spikes · * star · C checkpoint · O exit · B start · M / U moving platforms
const LEVELS = [
  { name: 'Lab 1 · First Bounce', moves: {}, map: [
    '', '', '', '', '', '', '',
    '..........*..........*..................',
    '.........###........###.........*.......',
    '...............................####.....',
    '.....*.........*........................',
    '....###.......###.........C.............',
    '.B...............^^^..................O.',
    '########################################',
    '########################################'] },
  { name: 'Lab 2 · Springs & Slopes', moves: {}, map: [
    '', '',
    '.....................*..................',
    '....................###.................',
    '',
    '......*.................................',
    '.....###...................*......O.....',
    '..........................###....###....',
    '', '',
    '.............../#\\.....................',
    '............../###\\....................',
    '.B...S......./#####\\.....S.......^^.....',
    '##############################...#######',
    '##############################...#######'] },
  { name: 'Lab 3 · Moving Parts', moves: { M: [7, 0, 0.35], U: [0, -5, 0.3] }, map: [
    '', '', '',
    '.................................*......',
    '...............................#####.O..',
    '................*..................#####',
    '',
    '...........*............................',
    '', '',
    '.......................*................',
    '',
    '.B.....M.........C.....U................',
    '######.........#####.........###########',
    '######.........#####.........###########'] },
  { name: 'Lab 4 · The Shaft', moves: { M: [6, 0, 0.4] }, map: [
    '##.......................*.........O..##',
    '##......................###.......###.##',
    '##.................................../##',
    '##..*.............................../###',
    '##.###........M.......................##',
    '##....................................##',
    '##..........................*.........##',
    '##.......S.................###........##',
    '##......###...........................##',
    '##..................*.................##',
    '##.................###.......C........##',
    '##.....*.....................###......##',
    '##.B..........S.......^^^^^...........##',
    '########################################',
    '########################################'] },
  { name: 'Lab 5 · Gauntlet', moves: { M: [5, 0, 0.5], U: [0, -4, 0.4] }, map: [
    '', '',
    '..................................*.....',
    '.............*...................###..O.',
    '............###.......................#.',
    '.......................U..............#.',
    '.....*..................................',
    '....###............*....................',
    '...................#....................',
    '..........M......./#\\..........S.......',
    '................./###\\......#####.......',
    '.....C........../#####\\................',
    '.B..........^^^^^#######^^^^^...........',
    '#########.........#######.....##########',
    '#########.........#######.....##########'] },
];

export default function create(host) {
  const VW = 960, VH = 600;
  const cv = createCanvas(host.el, VW, VH, { bg: '#e8fff6' });
  const { ctx } = cv;
  const input = createInput(host.el, { touch: { stick: true, buttons: [{ label: 'POWER', key: 'Space' }] } });
  const fx = particles2D();
  let li = 0, grid, rows, cols, plats, stars, check, exit, ball, power = false, got = 0, deaths = 0, t = 0, lvlT = 0, total = 0, banner = 2, done = false, camX = 0, camY = 0;

  function load(i) {
    const L = LEVELS[i]; rows = L.map.length; cols = 40;
    grid = L.map.map((r) => r.padEnd(cols, '.').split(''));
    plats = []; stars = [];
    grid.forEach((row, r) => row.forEach((ch, c) => {
      const x = c * TS, y = r * TS;
      if (ch === 'B') check = { x: x + TS / 2, y: y + TS / 2 };
      if (ch === '*') stars.push({ x: x + TS / 2, y: y + TS / 2, got: false });
      if (ch === 'C') grid[r][c] = 'C';
      if (ch === 'O') exit = { x: x + TS / 2, y: y + TS / 2 };
      if (ch === 'M' || ch === 'U') { const [dx, dy, sp] = L.moves[ch]; plats.push({ x0: x, y0: y + TS - 14, x, y: y + TS - 14, w: TS * 3, h: 14, dx: dx * TS, dy: dy * TS, sp, ph: 0, vx: 0 }); grid[r][c] = '.'; }
    }));
    ball = { x: check.x, y: check.y, vx: 0, vy: 0, squash: 0 }; lvlT = 0; banner = 2;
  }
  load(0);

  const tile = (c, r) => (c < 0 || c >= cols ? '#' : r < 0 || r >= rows ? '.' : grid[r][c]);
  const die = () => { deaths++; host.sfx('hurt'); fx.burst(ball.x, ball.y, '#ff6b3d', 20, 260); ball = { x: check.x, y: check.y, vx: 0, vy: 0, squash: 0 }; };
  function ground(kind, platVx = 0) {
    ball.vy = -(kind === 'spring' ? SPRING : power ? POWER : BOUNCE); ball.squash = 1;
    if (kind === 'spring') host.sfx('jump'); else host.sfx('bounce');
    if (power && kind !== 'spring') { fx.burst(ball.x, ball.y + R, '#8a5cff', 14, 200); }
    power = false; ball.vx += platVx * 0.6;
  }
  function collideRect(x, y, w, h, kind, pv) {
    const cx = clamp(ball.x, x, x + w), cy = clamp(ball.y, y, y + h), dx = ball.x - cx, dy = ball.y - cy, d = Math.hypot(dx, dy);
    if (d >= R || d === 0) return;
    const nx = dx / d, ny = dy / d; ball.x = cx + nx * R; ball.y = cy + ny * R;
    const vn = ball.vx * nx + ball.vy * ny; if (vn >= 0) return;
    if (ny < -0.6) ground(kind, pv);
    else { ball.vx -= 1.5 * vn * nx; ball.vy -= 1.5 * vn * ny; if (ny > 0.6) ball.vy = Math.max(ball.vy, 60); host.sfx('thud'); }
  }
  function collideSeg(ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, k = clamp(((ball.x - ax) * dx + (ball.y - ay) * dy) / (dx * dx + dy * dy), 0, 1);
    const px = ax + dx * k, py = ay + dy * k, ex = ball.x - px, ey = ball.y - py, d = Math.hypot(ex, ey);
    if (d >= R || d === 0) return;
    const nx = ex / d, ny = ey / d; ball.x = px + nx * R; ball.y = py + ny * R;
    const vn = ball.vx * nx + ball.vy * ny;
    if (vn < 0) { ball.vx -= 2 * vn * nx; ball.vy -= 2 * vn * ny; const out = ball.vx * nx + ball.vy * ny; if (out < 520) { ball.vx += nx * (520 - out); ball.vy += ny * (520 - out); } ball.squash = 0.6; host.sfx('bounce'); }
  }

  function physics(dt) {
    const ax = input.axis().x;
    ball.vx += ax * 1500 * dt; ball.vx *= 1 - 1.2 * dt; ball.vx = clamp(ball.vx, -420, 420);
    ball.vy = Math.min(ball.vy + G * dt, 1100);
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    const c0 = Math.floor(ball.x / TS), r0 = Math.floor(ball.y / TS);
    for (let r = r0 - 1; r <= r0 + 1; r++) for (let c = c0 - 1; c <= c0 + 1; c++) {
      const ch = tile(c, r), x = c * TS, y = r * TS;
      if (ch === '#') collideRect(x, y, TS, TS, 'solid');
      else if (ch === 'S') collideRect(x + 4, y + 26, TS - 8, 14, 'spring');
      else if (ch === '/') collideSeg(x, y + TS, x + TS, y);
      else if (ch === '\\') collideSeg(x, y, x + TS, y + TS);
      else if (ch === '^' && Math.abs(ball.x - (x + TS / 2)) < TS / 2 + R * 0.6 && ball.y + R > y + 18 && ball.y - R < y + TS) { die(); return; }
    }
    for (const p of plats) collideRect(p.x, p.y, p.w, p.h, 'solid', p.vx);
  }

  const update = (dt) => {
    t += dt; lvlT += dt; banner -= dt;
    if (input.pressed('Space', 'KeyW', 'ArrowUp') && !power) { power = true; host.sfx('blip', 900); }
    for (const p of plats) { p.ph += dt * p.sp; const k = (1 - Math.cos(p.ph * Math.PI)) / 2, nx = p.x0 + p.dx * k; p.vx = (nx - p.x) / dt; p.x = nx; p.y = p.y0 + p.dy * k; }
    const steps = 3; for (let i = 0; i < steps; i++) physics(dt / steps);
    ball.squash = Math.max(0, ball.squash - dt * 5);
    if (ball.y > rows * TS + 80) die();
    stars.forEach((s) => { if (!s.got && Math.hypot(s.x - ball.x, s.y - ball.y) < 28) { s.got = true; got++; total += 100; host.sfx('coin'); fx.burst(s.x, s.y, '#ffd23d', 14, 180); } });
    const cc = Math.floor(ball.x / TS), cr = Math.floor(ball.y / TS);
    if (tile(cc, cr) === 'C') { const cp = { x: cc * TS + TS / 2, y: cr * TS + TS / 2 }; if (check.x !== cp.x) { check = cp; host.sfx('success'); } }
    if (Math.hypot(exit.x - ball.x, exit.y - ball.y) < 30) {
      total += Math.max(100, 800 - Math.round(lvlT * 10)); host.sfx('win'); li++;
      if (li >= LEVELS.length) { if (!done) { done = true; host.end({ won: true, score: total - deaths * 25, title: 'Lab complete', msg: `${got} stars collected · ${deaths} pops` }); } return; }
      load(li);
    }
    fx.update(dt, 400);

    // Render
    camX += (clamp(ball.x - VW / 2, 0, cols * TS - VW) - camX) * Math.min(1, dt * 6);
    camY += (clamp(ball.y - VH / 2, 0, Math.max(0, rows * TS - VH)) - camY) * Math.min(1, dt * 6);
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#f0fffa'); g.addColorStop(1, '#c4f0e0'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    ctx.save(); ctx.translate(-Math.round(camX), -Math.round(camY));
    ctx.strokeStyle = '#a8e0cc55'; ctx.lineWidth = 1;
    for (let x = 0; x <= cols * TS; x += TS) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, rows * TS); ctx.stroke(); }
    grid.forEach((row, r) => row.forEach((ch, c) => {
      const x = c * TS, y = r * TS;
      if (ch === '#') { ctx.fillStyle = '#20504a'; ctx.fillRect(x, y, TS, TS); ctx.fillStyle = '#2a6a60'; ctx.fillRect(x, y, TS, 5); }
      else if (ch === '/' || ch === '\\') { ctx.fillStyle = '#20504a'; ctx.beginPath(); if (ch === '/') { ctx.moveTo(x, y + TS); ctx.lineTo(x + TS, y); ctx.lineTo(x + TS, y + TS); } else { ctx.moveTo(x, y); ctx.lineTo(x + TS, y + TS); ctx.lineTo(x, y + TS); } ctx.fill(); }
      else if (ch === 'S') { ctx.fillStyle = '#ff6b3d'; ctx.fillRect(x + 4, y + 26, TS - 8, 6); ctx.strokeStyle = '#ff6b3d'; ctx.lineWidth = 3; ctx.beginPath(); for (let k = 0; k < 4; k++) { ctx.moveTo(x + 8, y + 32 + k * 2); ctx.lineTo(x + TS - 8, y + 33 + k * 2); } ctx.stroke(); }
      else if (ch === '^') { ctx.fillStyle = '#ff3d6a'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x + k * 13, y + TS); ctx.lineTo(x + k * 13 + 6.5, y + 18); ctx.lineTo(x + k * 13 + 13, y + TS); ctx.fill(); } }
      else if (ch === 'C') { ctx.fillStyle = '#555'; ctx.fillRect(x + 18, y + 4, 3, 36); ctx.fillStyle = check.x === x + TS / 2 && check.y === y + TS / 2 ? '#3dffb2' : '#ffd23d'; ctx.fillRect(x + 21, y + 4, 16, 11); }
    }));
    plats.forEach((p) => { ctx.fillStyle = '#8a5cff'; ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, 6); ctx.fill(); });
    stars.forEach((s) => { if (s.got) return; ctx.save(); ctx.translate(s.x, s.y + Math.sin(t * 3 + s.x) * 4); ctx.rotate(Math.sin(t * 2) * 0.3); ctx.fillStyle = '#ffd23d'; ctx.font = '28px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('★', 0, 0); ctx.restore(); });
    ctx.save(); ctx.translate(exit.x, exit.y); ctx.rotate(t * 2); ctx.strokeStyle = '#8a5cff'; ctx.lineWidth = 5; ctx.shadowColor = '#8a5cff'; ctx.shadowBlur = 20; ctx.beginPath(); ctx.ellipse(0, 0, 16, 24, 0, 0, Math.PI * 1.6); ctx.stroke(); ctx.restore();
    fx.draw(ctx);
    const sq = ball.squash; ctx.save(); ctx.translate(ball.x, ball.y); ctx.scale(1 + sq * 0.3, 1 - sq * 0.3);
    ctx.shadowColor = power ? '#8a5cff' : '#3dffb2'; ctx.shadowBlur = power ? 26 : 12;
    const bg2 = ctx.createRadialGradient(-4, -5, 2, 0, 0, R); bg2.addColorStop(0, '#fff'); bg2.addColorStop(0.4, power ? '#b49aff' : '#3dffb2'); bg2.addColorStop(1, power ? '#5a2acc' : '#1a8a6a');
    ctx.fillStyle = bg2; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.restore();
    ctx.fillStyle = '#20504a'; ctx.font = '600 16px Space Grotesk, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`${LEVELS[li].name}   ★ ${got}   ✕ ${deaths}${power ? '   ⚡ POWER READY' : ''}`, 18, 30);
    if (banner > 0) { ctx.textAlign = 'center'; ctx.font = 'bold 40px Space Grotesk, sans-serif'; ctx.fillText(LEVELS[li].name, VW / 2, 120); }
    host.score(total); host.status(`Lab ${li + 1}/5`);
    input.endFrame();
  };
  return makeGame(update, () => { input.destroy(); cv.dispose(); });
}
