// GAME 16 — SLICE MASTER: swipe through flying gems, avoid bombs, chain combos.
import { createCanvas, makeGame, particles2D, rand, pick } from './lib/kit.js';

const KINDS = [
  { col: '#ff5a5a', in: '#ffd0d0', pts: 10 }, { col: '#ffd23d', in: '#fff4c0', pts: 10 }, { col: '#5ad86b', in: '#d8ffd8', pts: 10 },
  { col: '#5ab8ff', in: '#d0ecff', pts: 10 }, { col: '#c45cff', in: '#f0d8ff', pts: 15 },
];

export default function create(host) {
  const W = 960, H = 600;
  const cv = createCanvas(host.el, W, H, { bg: '#1a0812' });
  const { ctx } = cv;
  const fx = particles2D();
  let objs = [], halves = [], trail = [], down = false, swipeCount = 0, score = 0, lives = 3, t = 0, spawnT = 1, combo = '', comboT = 0, done = false, sliced = 0, shake = 0;

  function spawnWave() {
    const n = Math.min(6, 1 + Math.floor(t / 15) + (Math.random() < 0.4 ? 1 : 0));
    for (let i = 0; i < n; i++) {
      const bomb = Math.random() < Math.min(0.28, 0.06 + t / 300), gold = !bomb && Math.random() < 0.05;
      const x = rand(140, W - 140);
      objs.push({ x, y: H + 40, vx: (W / 2 - x) * rand(0.2, 0.6) + rand(-60, 60), vy: -rand(620, 820), r: bomb ? 30 : gold ? 24 : rand(28, 36), rot: 0, vr: rand(-4, 4), bomb, gold, kind: pick(KINDS), delay: i * 0.12 });
    }
  }
  const segHits = (ax, ay, bx, by, o) => { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1, k = Math.max(0, Math.min(1, ((o.x - ax) * dx + (o.y - ay) * dy) / l)); return Math.hypot(ax + dx * k - o.x, ay + dy * k - o.y) < o.r; };

  const pd = (e) => { down = true; swipeCount = 0; trail = [{ ...cv.toLocal(e), t }]; cv.canvas.setPointerCapture(e.pointerId); };
  const pm = (e) => {
    if (!down) return;
    const p = cv.toLocal(e), last = trail[trail.length - 1]; trail.push({ ...p, t });
    if (Math.hypot(p.x - last.x, p.y - last.y) < 4) return;
    for (const o of objs) {
      if (o.delay > 0 || o.dead || !segHits(last.x, last.y, p.x, p.y, o)) continue;
      o.dead = true;
      if (o.bomb) { host.sfx('explode'); fx.burst(o.x, o.y, '#ffb23d', 60, 500, 1); fx.burst(o.x, o.y, '#fff', 30, 300, 0.6); shake = 0.6; lives = 0; return; }
      sliced++; swipeCount++; const pts = o.gold ? 50 : o.kind.pts; score += pts;
      host.sfx('slice'); fx.burst(o.x, o.y, o.gold ? '#ffd23d' : o.kind.col, 18, 260, 0.7, 6);
      const ang = Math.atan2(p.y - last.y, p.x - last.x);
      [-1, 1].forEach((s) => halves.push({ x: o.x, y: o.y, vx: o.vx + Math.cos(ang + s * Math.PI / 2) * 120, vy: o.vy * 0.5 + Math.sin(ang + s * Math.PI / 2) * 120, r: o.r, rot: ang, vr: s * 4, side: s, o }));
      if (swipeCount >= 3) { const b = swipeCount * 10; score += b; combo = `${swipeCount}× COMBO +${b}`; comboT = 1.2; host.sfx('coin'); }
    }
  };
  const pu = () => { down = false; };
  cv.canvas.addEventListener('pointerdown', pd); cv.canvas.addEventListener('pointermove', pm); window.addEventListener('pointerup', pu);

  function drawGem(o, half) {
    ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot);
    if (half) { ctx.beginPath(); ctx.rect(-o.r - 2, half < 0 ? -o.r - 2 : 0, o.r * 2 + 4, o.r + 2); ctx.clip(); }
    if (o.bomb) {
      ctx.fillStyle = '#1a1a22'; ctx.beginPath(); ctx.arc(0, 0, o.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ff3d3d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, o.r - 6, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#8a6a4a'; ctx.fillRect(-3, -o.r - 10, 6, 12);
      ctx.fillStyle = Math.sin(t * 30) > 0 ? '#ffd23d' : '#ff5a3d'; ctx.beginPath(); ctx.arc(0, -o.r - 12, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff3d3d'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✕', 0, 1);
    } else {
      const col = o.gold ? '#ffd23d' : o.kind.col, g = ctx.createRadialGradient(-o.r * 0.3, -o.r * 0.3, 2, 0, 0, o.r);
      g.addColorStop(0, '#fff'); g.addColorStop(0.25, col); g.addColorStop(1, '#00000088');
      ctx.shadowColor = col; ctx.shadowBlur = 20; ctx.fillStyle = g;
      ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, rr = i % 2 ? o.r * 0.92 : o.r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
      if (half) { ctx.shadowBlur = 0; ctx.fillStyle = o.gold ? '#fff4c0' : o.kind.in; ctx.fillRect(-o.r * 0.85, -2, o.r * 1.7, 4); }
    }
    ctx.restore();
  }

  const update = (dt) => {
    t += dt; spawnT -= dt; comboT -= dt; shake = Math.max(0, shake - dt);
    if (spawnT <= 0 && lives > 0) { spawnWave(); spawnT = Math.max(0.9, 2.4 - t / 40); }
    const g = 900;
    for (const o of objs) {
      if (o.delay > 0) { o.delay -= dt; continue; }
      o.vy += g * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.rot += o.vr * dt;
      if (o.vy > 0 && o.y > H + 60 && !o.dead) { o.dead = true; if (!o.bomb) { lives--; host.sfx('hurt'); } }
    }
    objs = objs.filter((o) => !o.dead);
    const tgt = objs.find((o) => !o.bomb && o.delay <= 0 && o.y > 80 && o.y < H - 40); host.el.dataset.target = tgt ? `${(tgt.x / W).toFixed(3)},${(tgt.y / H).toFixed(3)}` : ''; // for automated tests
    for (const h of halves) { h.vy += g * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.vr * dt; }
    halves = halves.filter((h) => h.y < H + 80);
    trail = trail.filter((p) => t - p.t < 0.15);
    fx.update(dt, 500);

    ctx.save(); if (shake) ctx.translate(rand(-10, 10) * shake, rand(-10, 10) * shake);
    const bg = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 600); bg.addColorStop(0, '#3a1028'); bg.addColorStop(1, '#12040c'); ctx.fillStyle = bg; ctx.fillRect(-20, -20, W + 40, H + 40);
    ctx.strokeStyle = '#ffffff08'; for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.arc(W / 2, H / 2, 60 + i * 50, 0, Math.PI * 2); ctx.stroke(); }
    halves.forEach((h) => drawGem({ ...h.o, x: h.x, y: h.y, rot: h.rot }, h.side));
    objs.forEach((o) => o.delay <= 0 && drawGem(o));
    if (trail.length > 1) {
      ctx.lineCap = 'round'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 16;
      for (let i = 1; i < trail.length; i++) { ctx.strokeStyle = `rgba(255,255,255,${i / trail.length})`; ctx.lineWidth = (i / trail.length) * 9; ctx.beginPath(); ctx.moveTo(trail[i - 1].x, trail[i - 1].y); ctx.lineTo(trail[i].x, trail[i].y); ctx.stroke(); }
      ctx.shadowBlur = 0;
    }
    fx.draw(ctx);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 34px Space Grotesk, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(score, 24, 50);
    ctx.textAlign = 'right'; ctx.font = '30px sans-serif'; ctx.fillText('♥'.repeat(Math.max(0, lives)) + '♡'.repeat(3 - Math.max(0, lives)), W - 24, 48);
    if (comboT > 0) { ctx.textAlign = 'center'; ctx.fillStyle = '#ffd23d'; ctx.font = 'bold 40px Space Grotesk, sans-serif'; ctx.fillText(combo, W / 2, 120 - (1.2 - comboT) * 30); }
    if (t < 3) { ctx.textAlign = 'center'; ctx.fillStyle = '#ffffffaa'; ctx.font = '20px Inter, sans-serif'; ctx.fillText('Drag or swipe to slice · avoid the bombs', W / 2, H - 30); }
    ctx.restore();
    host.score(score); host.status(`${'♥'.repeat(Math.max(0, lives))} · ${sliced} sliced`);
    if (lives <= 0 && !done) { done = true; setTimeout(() => host.end({ won: score >= 500, score, title: shake > 0 ? 'Kaboom!' : 'Out of lives', msg: `${sliced} gems sliced in ${t.toFixed(0)} seconds.` }), shake > 0 ? 700 : 200); }
  };
  return makeGame(update, () => { cv.canvas.removeEventListener('pointerdown', pd); cv.canvas.removeEventListener('pointermove', pm); window.removeEventListener('pointerup', pu); cv.dispose(); });
}
