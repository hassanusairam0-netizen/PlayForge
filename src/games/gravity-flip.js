// GAME 19 — GRAVITY FLIP: no jumping — flip gravity to run along floors and ceilings past hazards.
import { createCanvas, createInput, makeGame, particles2D, clamp } from './lib/kit.js';

const TS = 40, ROWS = 15, PW = 24, PH = 32, RUN = 250, G = 2100;
// Stage specs: o=open, f=floor pit, F=floor spikes, c=ceiling pit, C=ceiling spikes (number = length);
// p/q = floor/ceiling pillar (number = height). Checkpoints land after every third hazard.
const STAGES = [
  { name: 'Stage 1 · Upside Down', spec: 'o8 f5 o5 p6 o5 F6 o6 c6 o4 q5 o6 f4 o8' },
  { name: 'Stage 2 · Zig Zag', spec: 'o6 f5 o3 C5 o3 p7 o3 c6 o3 F5 o3 q6 o3 f6 o4 C4 o3 p5 o6' },
  { name: 'Stage 3 · Pillars', spec: 'o5 q7 o3 F6 o3 p6 o2 c5 o3 C5 o3 p7 o2 f7 o3 q6 o3 F4 o2 c6 o3 p4 o6' },
  { name: 'Stage 4 · The Gauntlet', spec: 'o5 C4 o2 f4 o2 p6 o2 F4 o2 c5 o2 q6 o2 f5 o2 C4 o2 p7 o2 F6 o2 c6 o2 q5 o2 f6 o2 C4 o2 p6 o6' },
];
function buildStage(spec) {
  let floor = '', ceil = '', hazards = 0; const pillars = [], cps = [];
  for (const tok of spec.split(' ')) {
    const k = tok[0], n = +tok.slice(1);
    if (k === 'p' || k === 'q') { pillars.push([floor.length, k === 'p' ? 'f' : 'c', n]); floor += '##'; ceil += '##'; hazards++; continue; }
    if (k === 'o' && hazards >= 3 && n >= 2) { cps.push(floor.length + Math.floor(n / 2)); hazards = 0; }
    floor += (k === 'f' ? '.' : k === 'F' ? '^' : '#').repeat(n);
    ceil += (k === 'c' ? '.' : k === 'C' ? '^' : '#').repeat(n);
    if (k !== 'o') hazards++;
  }
  return { floor, ceil, pillars, cps, exit: floor.length - 3 };
}

export default function create(host) {
  const VW = 960, VH = 600;
  const cv = createCanvas(host.el, VW, VH, { bg: '#120a24' });
  const { ctx } = cv;
  const input = createInput(host.el, { touch: { stick: true, buttons: [{ label: 'FLIP', key: 'Space' }] } });
  const fx = particles2D();
  let si = 0, grid, cols, cps, exitC, P, check, deaths = 0, t = 0, total = 0, banner = 2, done = false, camX = 0, stageT = 0;

  function load(i) {
    const S = { ...STAGES[i], ...buildStage(STAGES[i].spec) }; cols = Math.max(S.floor.length, S.ceil.length);
    grid = Array.from({ length: ROWS }, () => Array(cols).fill('.'));
    for (let c = 0; c < cols; c++) {
      const f = S.floor[c] || '#', k = S.ceil[c] || '#';
      if (f !== '.') { grid[13][c] = grid[14][c] = '#'; if (f === '^') grid[12][c] = '^'; }
      if (k !== '.') { grid[0][c] = grid[1][c] = '#'; if (k === '^') grid[2][c] = 'v'; }
    }
    for (const [c, side, h] of S.pillars) for (let k = 0; k < h; k++) grid[side === 'f' ? 12 - k : 2 + k][c] = grid[side === 'f' ? 12 - k : 2 + k][c + 1] = '#';
    cps = S.cps.map((c) => ({ c, on: false })); exitC = S.exit;
    check = { x: 2 * TS, y: 13 * TS - PH / 2, g: 1 };
    respawn(); stageT = 0; banner = 2;
  }
  function respawn() { P = { x: check.x, y: check.y, vy: 0, g: check.g, ground: false, face: 1, rot: check.g > 0 ? 0 : Math.PI }; }
  const solid = (c, r) => (c < 0 ? true : c >= cols || r < 0 || r >= ROWS ? false : grid[r][c] === '#');
  const hazard = (c, r) => c >= 0 && c < cols && r >= 0 && r < ROWS && (grid[r][c] === '^' || grid[r][c] === 'v');
  const hits = (x, y, test) => { const x0 = Math.floor((x - PW / 2) / TS), x1 = Math.floor((x + PW / 2 - 1) / TS), y0 = Math.floor((y - PH / 2) / TS), y1 = Math.floor((y + PH / 2 - 1) / TS); for (let r = y0; r <= y1; r++) for (let c = x0; c <= x1; c++) if (test(c, r)) return true; return false; };
  const die = () => { deaths++; host.sfx('hurt'); fx.burst(P.x, P.y, '#5cffe2', 26, 300); respawn(); };
  load(0);

  const update = (dt) => {
    t += dt; stageT += dt; banner -= dt;
    const ax = input.axis().x;
    if ((input.pressed('Space', 'KeyW', 'ArrowUp') || (input.pointer.clicked && !host.touch)) && P.ground) { P.g *= -1; P.vy = -P.g * 120; P.ground = false; host.sfx('flip'); fx.burst(P.x, P.y + P.g * -PH / 2, '#c45cff', 10, 150); }
    if (ax) P.face = Math.sign(ax);
    let nx = P.x + ax * RUN * dt;
    if (!hits(nx, P.y, solid)) P.x = nx;
    P.vy = clamp(P.vy + P.g * G * dt, -900, 900);
    const ny = P.y + P.vy * dt; P.ground = false;
    if (hits(P.x, ny, solid)) {
      if (Math.sign(P.vy) === P.g) P.ground = true;
      P.y = P.vy > 0 ? Math.floor((ny + PH / 2) / TS) * TS - PH / 2 : Math.ceil((ny - PH / 2) / TS) * TS + PH / 2;
      P.vy = 0;
    } else P.y = ny;
    P.rot += ((P.g > 0 ? 0 : Math.PI) - P.rot) * Math.min(1, dt * 14);
    if (hits(P.x, P.y, hazard) || P.y < -60 || P.y > ROWS * TS + 60) die();
    for (const cp of cps) if (!cp.on && P.x > cp.c * TS && P.ground) { cp.on = true; check = { x: cp.c * TS + TS / 2, y: P.y, g: P.g }; host.sfx('coin'); }
    if (P.x > exitC * TS) {
      total += Math.max(200, 1500 - Math.round(stageT * 20)); host.sfx('win'); si++;
      if (si >= STAGES.length) { if (!done) { done = true; host.end({ won: true, score: Math.max(100, total - deaths * 60), title: 'Gravity defied', msg: `All four stages · ${deaths} wipe-outs` }); } input.endFrame(); return; }
      load(si);
    }
    fx.update(dt, 0);

    camX += (clamp(P.x - VW * 0.4, 0, cols * TS - VW) - camX) * Math.min(1, dt * 8);
    const bg = ctx.createLinearGradient(0, 0, 0, VH); bg.addColorStop(0, '#1a0a2e'); bg.addColorStop(0.5, '#120a24'); bg.addColorStop(1, '#0a1a2e'); ctx.fillStyle = bg; ctx.fillRect(0, 0, VW, VH);
    for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(196,92,255,${0.1 + (i % 3) * 0.08})`; ctx.fillRect(((i * 131 - camX * (0.2 + (i % 3) * 0.1)) % VW + VW) % VW, (i * 71) % VH, 2, 2); }
    ctx.save(); ctx.translate(-Math.round(camX), 0);
    const c0 = Math.max(0, Math.floor(camX / TS) - 1), c1 = Math.min(cols, c0 + 27);
    for (let r = 0; r < ROWS; r++) for (let c = c0; c < c1; c++) {
      const ch = grid[r][c], x = c * TS, y = r * TS;
      if (ch === '#') { ctx.fillStyle = '#3a2a5a'; ctx.fillRect(x, y, TS, TS); ctx.fillStyle = '#5a3a8a'; if (r === 13 || (r < 12 && r > 1 && grid[r - 1]?.[c] !== '#')) ctx.fillRect(x, y, TS, 4); if (r === 1 || (r > 1 && grid[r + 1]?.[c] !== '#')) ctx.fillRect(x, y + TS - 4, TS, 4); }
      else if (ch === '^' || ch === 'v') { ctx.fillStyle = '#ff3d6a'; for (let k = 0; k < 3; k++) { ctx.beginPath(); if (ch === '^') { ctx.moveTo(x + k * 13, y + TS); ctx.lineTo(x + k * 13 + 6.5, y + 14); ctx.lineTo(x + k * 13 + 13, y + TS); } else { ctx.moveTo(x + k * 13, y); ctx.lineTo(x + k * 13 + 6.5, y + TS - 14); ctx.lineTo(x + k * 13 + 13, y); } ctx.fill(); } }
    }
    for (const cp of cps) { const x = cp.c * TS + 20; ctx.fillStyle = cp.on ? '#5cffe2' : '#ffffff44'; ctx.fillRect(x, 80, 3, VH - 160); ctx.beginPath(); ctx.arc(x + 1, VH / 2, 8, 0, Math.PI * 2); ctx.fill(); }
    ctx.save(); ctx.shadowColor = '#5cffe2'; ctx.shadowBlur = 30; ctx.fillStyle = '#5cffe233'; ctx.fillRect(exitC * TS, 2 * TS, 12, 11 * TS); ctx.fillStyle = '#5cffe2'; ctx.fillRect(exitC * TS + 4, 2 * TS, 4, 11 * TS); ctx.restore();
    fx.draw(ctx);
    ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(P.rot); ctx.scale(P.face, 1);
    ctx.shadowColor = '#5cffe2'; ctx.shadowBlur = 14; ctx.fillStyle = '#5cffe2'; ctx.beginPath(); ctx.roundRect(-PW / 2, -PH / 2, PW, PH, 6); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#120a24'; ctx.fillRect(2, -PH / 2 + 7, 7, 6);
    const run = Math.abs(ax) > 0 && P.ground ? Math.sin(t * 20) * 4 : 0; ctx.fillStyle = '#3ab8a8'; ctx.fillRect(-8 + run, PH / 2 - 4, 7, 6); ctx.fillRect(2 - run, PH / 2 - 4, 7, 6);
    ctx.restore(); ctx.restore();
    ctx.fillStyle = '#e8d8ff'; ctx.font = '600 16px Space Grotesk, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`${STAGES[si].name}   ✕ ${deaths}   ${P.g > 0 ? '▼ gravity down' : '▲ gravity up'}`, 18, VH - 16);
    ctx.fillStyle = '#ffffff22'; ctx.fillRect(18, VH - 44, 300, 6); ctx.fillStyle = '#c45cff'; ctx.fillRect(18, VH - 44, 300 * clamp(P.x / (exitC * TS), 0, 1), 6);
    if (banner > 0) { ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = 'bold 40px Space Grotesk, sans-serif'; ctx.fillText(STAGES[si].name, VW / 2, VH / 2 - 40); }
    host.score(total); host.status(`Stage ${si + 1}/4 · ${deaths} deaths`);
    input.endFrame();
  };
  return makeGame(update, () => { input.destroy(); cv.dispose(); });
}
