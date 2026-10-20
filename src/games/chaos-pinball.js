// GAME 20 — CHAOS PINBALL: 2D rigid-ball physics rendered on a 3D neon table.
import { createThree, THREE, mat, glow, canvasTexture } from './lib/three-kit.js';
import { createInput, createHud, makeGame, clamp } from './lib/kit.js';

const BR = 11, GRAV = 1150, SUB = 6;
const S = 1 / 50; // table units → world units

export default function create(host) {
  const T = createThree(host.el, { bg: 0x0c0418, fov: 44 });
  const { scene, camera } = T;
  const input = createInput(host.el);
  const hud = createHud(host.el);
  scene.add(new THREE.HemisphereLight(0xb8a0ff, 0x200830, 0.8));
  const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(-4, 12, 8); scene.add(key);
  const table = new THREE.Group(); table.rotation.x = -0.12; scene.add(table);
  const W3 = (x, y, h = 0) => new THREE.Vector3((x - 250) * S, h, (y - 450) * S);

  // ---------- Geometry ----------
  const segs = [];
  const seg = (ax, ay, bx, by, o = {}) => segs.push({ ax, ay, bx, by, e: 0.45, ...o });
  const poly = (pts, o) => { for (let i = 0; i < pts.length - 1; i++) seg(...pts[i], ...pts[i + 1], o); };
  const arc = []; for (let i = 0; i <= 24; i++) { const a = Math.PI + (i / 24) * Math.PI; arc.push([267 + Math.cos(a) * 228, 210 + Math.sin(a) * 200]); }
  poly([[40, 900], [40, 690], [40, 210]]); poly(arc); poly([[495, 210], [495, 900]]);
  seg(462, 900, 462, 300); seg(462, 872, 495, 872, { plunger: true });
  poly([[40, 690], [152, 800]]); poly([[462, 690], [348, 800]]);
  // Slingshots (kickers)
  seg(85, 610, 140, 735, { kick: 520, sling: 'L' }); seg(85, 610, 85, 700); seg(85, 700, 140, 735);
  seg(417, 610, 362, 735, { kick: 520, sling: 'R' }); seg(417, 610, 417, 700); seg(417, 700, 362, 735);
  // Upper lane guides
  seg(110, 250, 110, 330); seg(400, 250, 420, 330);
  const bumpers = [[190, 300], [310, 300], [250, 395]].map(([x, y]) => ({ x, y, r: 28, flash: 0 }));
  const targets = [380, 425, 470].map((y) => ({ x: 52, y, down: false, mesh: null }));
  const rollovers = [[200, 128], [250, 118], [300, 128]].map(([x, y]) => ({ x, y, lit: false, mesh: null }));
  const rampSensor = { x: 80, y: 235, r: 22 };
  const flippers = [
    { px: 152, py: 802, len: 82, rest: 0.52, up: -0.48, a: 0.52, w: 0, side: 'L' },
    { px: 348, py: 802, len: 82, rest: Math.PI - 0.52, up: Math.PI + 0.48, a: Math.PI - 0.52, w: 0, side: 'R' },
  ];

  // ---------- 3D table ----------
  const art = canvasTexture(500, 900, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#2a0a4a'); bg.addColorStop(0.5, '#160630'); bg.addColorStop(1, '#0a0418'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ff3d9a33'; g.lineWidth = 2; for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(250, 380, 40 + i * 30, 0, Math.PI * 2); g.stroke(); }
    g.save(); g.translate(250, 560); g.rotate(-0.1); g.fillStyle = '#ff3d9a'; g.font = 'bold 64px Space Grotesk, sans-serif'; g.textAlign = 'center'; g.shadowColor = '#ff3d9a'; g.shadowBlur = 20; g.fillText('CHAOS', 0, 0); g.fillStyle = '#3dfff0'; g.font = 'bold 26px Space Grotesk'; g.fillText('PINBALL', 0, 34); g.restore();
    g.fillStyle = '#3dfff055'; [[250, 700], [150, 640], [350, 640]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x, y); g.lineTo(x - 12, y + 20); g.lineTo(x + 12, y + 20); g.fill(); });
    g.fillStyle = '#ffd23d44'; g.fillRect(465, 300, 28, 570);
  });
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(500 * S, 900 * S), new THREE.MeshStandardMaterial({ map: art, roughness: 0.35, metalness: 0.2 }));
  surf.rotation.x = -Math.PI / 2; table.add(surf);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(540 * S, 1, 940 * S), mat(0x1a0a2a, { metalness: 0.5 })); cab.position.y = -0.52; table.add(cab);
  const wallM = mat(0x3a2a6a, { metalness: 0.6, roughness: 0.3 }), kickM = glow(0xffd23d, 1.5);
  for (const s of segs) {
    const L = Math.hypot(s.bx - s.ax, s.by - s.ay) * S;
    const m = new THREE.Mesh(new THREE.BoxGeometry(L + 0.08, s.kick ? 0.3 : 0.45, 0.1), s.kick ? kickM : wallM);
    m.position.copy(W3((s.ax + s.bx) / 2, (s.ay + s.by) / 2, 0.2)); m.rotation.y = -Math.atan2(s.by - s.ay, s.bx - s.ax); table.add(m); s.mesh = m;
  }
  bumpers.forEach((b, i) => {
    const g = new THREE.Group(); g.position.copy(W3(b.x, b.y));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(b.r * S, b.r * S * 1.1, 0.3, 24), mat(0x2a1040)));
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(b.r * S * 0.85, b.r * S * 0.85, 0.12, 24), glow([0x3dfff0, 0xffd23d, 0xff3d9a][i], 1.5)); cap.position.y = 0.22; g.add(cap);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(b.r * S, 0.04, 8, 32), glow(0xffffff, 2)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.16; g.add(ring);
    table.add(g); b.mesh = g; b.cap = cap;
  });
  targets.forEach((t) => { t.mesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.6), glow(0xff3d9a, 1.5)); t.mesh.position.copy(W3(t.x, t.y, 0.17)); table.add(t.mesh); });
  rollovers.forEach((r) => { r.mesh = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20), glow(0x553300, 0.5)); r.mesh.rotation.x = -Math.PI / 2; r.mesh.position.copy(W3(r.x, r.y, 0.02)); table.add(r.mesh); });
  const ramp = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.06, 8, 24, Math.PI), glow(0x3dfff0, 2)); ramp.position.copy(W3(rampSensor.x, rampSensor.y, 0)); ramp.rotation.y = Math.PI / 4; table.add(ramp);
  flippers.forEach((f) => {
    const g = new THREE.Group(); g.position.copy(W3(f.px, f.py, 0.12));
    const m = new THREE.Mesh(new THREE.BoxGeometry(f.len * S, 0.22, 0.28), mat(0xffd23d, { metalness: 0.3, roughness: 0.3, emissive: 0x332200 })); m.position.x = f.len * S / 2; g.add(m);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.24, 16), mat(0xffffff)); g.add(cap);
    table.add(g); f.mesh = g;
  });
  const plungerMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.6), mat(0xff3d3d)); table.add(plungerMesh);
  const ballGeo = new THREE.SphereGeometry(BR * S, 24, 16), ballMat = mat(0xe8eef8, { metalness: 0.85, roughness: 0.15, emissive: 0x222233 });
  const lightUnder = new THREE.PointLight(0xff3d9a, 20, 8); lightUnder.position.set(0, 1.5, 0); table.add(lightUnder);

  // ---------- State ----------
  let balls = [], ballsLeft = 3, score = 0, mult = 1, charge = 0, multiT = 0, msg = '', msgT = 0, done = false, t = 0;
  const addBall = (x, y, vx = 0, vy = 0) => { const m = new THREE.Mesh(ballGeo, ballMat); table.add(m); balls.push({ x, y, vx, vy, m }); };
  const say = (m) => { msg = m; msgT = 2; };
  const newBall = () => addBall(478, 860);
  newBall();

  function collideSeg(b, s) {
    const dx = s.bx - s.ax, dy = s.by - s.ay, k = clamp(((b.x - s.ax) * dx + (b.y - s.ay) * dy) / (dx * dx + dy * dy), 0, 1);
    const px = s.ax + dx * k, py = s.ay + dy * k, ex = b.x - px, ey = b.y - py, d = Math.hypot(ex, ey);
    if (d >= BR || d === 0) return;
    const nx = ex / d, ny = ey / d; b.x = px + nx * BR; b.y = py + ny * BR;
    const vn = b.vx * nx + b.vy * ny; if (vn >= 0) return;
    b.vx -= (1 + s.e) * vn * nx; b.vy -= (1 + s.e) * vn * ny;
    if (s.kick && -vn > 80) { b.vx += nx * s.kick; b.vy += ny * s.kick; score += 50 * mult; host.sfx('bounce'); s.mesh.material.emissiveIntensity = 4; }
  }
  function collideFlipper(b, f) {
    const tx = f.px + Math.cos(f.a) * f.len, ty = f.py + Math.sin(f.a) * f.len;
    const dx = tx - f.px, dy = ty - f.py, k = clamp(((b.x - f.px) * dx + (b.y - f.py) * dy) / (dx * dx + dy * dy), 0, 1);
    const px = f.px + dx * k, py = f.py + dy * k, rad = 9 - k * 3, ex = b.x - px, ey = b.y - py, d = Math.hypot(ex, ey);
    if (d >= BR + rad || d === 0) return;
    const nx = ex / d, ny = ey / d; b.x = px + nx * (BR + rad); b.y = py + ny * (BR + rad);
    const vpx = -f.w * (py - f.py), vpy = f.w * (px - f.px);
    const rvx = b.vx - vpx, rvy = b.vy - vpy, vn = rvx * nx + rvy * ny;
    if (vn < 0) { b.vx = vpx + rvx - 1.35 * vn * nx; b.vy = vpy + rvy - 1.35 * vn * ny; if (Math.abs(f.w) > 2) host.sfx('thud'); }
  }

  function step(dt) {
    const L = input.down('KeyZ', 'ArrowLeft', 'KeyA', 'ShiftLeft', 'TouchL'), R = input.down('Slash', 'ArrowRight', 'KeyD', 'ShiftRight', 'TouchR');
    flippers.forEach((f) => {
      const target = (f.side === 'L' ? L : R) ? f.up : f.rest, prev = f.a;
      const sp = 22 * dt; f.a = Math.abs(target - f.a) < sp ? target : f.a + Math.sign(target - f.a) * sp;
      f.w = (f.a - prev) / dt;
    });
    for (const b of balls) {
      b.vy += GRAV * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      for (const s of segs) collideSeg(b, s);
      for (const f of flippers) collideFlipper(b, f);
      for (const bm of bumpers) {
        const dx = b.x - bm.x, dy = b.y - bm.y, d = Math.hypot(dx, dy);
        if (d < bm.r + BR) { const nx = dx / d, ny = dy / d; b.x = bm.x + nx * (bm.r + BR); b.y = bm.y + ny * (bm.r + BR); const vn = b.vx * nx + b.vy * ny; b.vx -= vn * nx; b.vy -= vn * ny; b.vx += nx * 620; b.vy += ny * 620; bm.flash = 0.2; score += 100 * mult; host.sfx('blip', 700 + Math.random() * 300); }
      }
      for (const tg of targets) {
        if (tg.down) continue;
        if (Math.abs(b.x - tg.x) < BR + 4 && Math.abs(b.y - tg.y) < 18) {
          tg.down = true; b.vx = Math.abs(b.vx) * 0.8 + 120; score += 250 * mult; host.sfx('coin');
          if (targets.every((q) => q.down)) { say('MULTIBALL!'); host.sfx('win'); addBall(250, 160, -200, 100); addBall(250, 160, 200, 100); multiT = 5; }
        }
      }
      for (const r of rollovers) if (!r.lit && Math.hypot(b.x - r.x, b.y - r.y) < 18) {
        r.lit = true; score += 150 * mult; host.sfx('coin');
        if (rollovers.every((q) => q.lit)) { mult = Math.min(5, mult + 1); score += 1000; say(`LANES! ×${mult}`); rollovers.forEach((q) => (q.lit = false)); }
      }
      const rs = rampSensor, inR = Math.hypot(b.x - rs.x, b.y - rs.y) < rs.r;
      if (inR && !b.inRamp && b.vy < -150) { mult = Math.min(5, mult + 1); score += 500 * mult; say(`RAMP SHOT ×${mult}`); host.sfx('success'); }
      b.inRamp = inR;
      const v = Math.hypot(b.vx, b.vy); if (v > 2200) { b.vx *= 2200 / v; b.vy *= 2200 / v; }
    }
  }

  const tapL = (e) => { if (e.pointerType === 'mouse') return; const r = host.el.getBoundingClientRect(); const left = e.clientX < r.left + r.width / 2; input.keys.add(left ? 'TouchL' : 'TouchR'); if (!left) input.keys.add('Space'); e.target._pin = left ? 'TouchL' : 'TouchR'; };
  const tapU = (e) => { input.keys.delete('TouchL'); input.keys.delete('TouchR'); if (e.pointerType !== 'mouse') input.keys.delete('Space'); };
  host.el.addEventListener('pointerdown', tapL); window.addEventListener('pointerup', tapU);

  const update = (dt) => {
    t += dt; msgT -= dt;
    const inLane = balls.find((b) => b.x > 462 && b.y > 830);
    if (input.down('Space', 'ArrowDown') && inLane) charge = Math.min(1, charge + dt * 1.2);
    else if (charge > 0) { if (inLane) { inLane.vy = -(1000 + charge * 1100); host.sfx('jump'); } charge = 0; }
    for (let i = 0; i < SUB; i++) step(dt / SUB);
    if (multiT > 0) { multiT -= dt; if (multiT <= 0) targets.forEach((q) => (q.down = false)); }
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      if (b.y > 930 || b.x < 0 || b.x > 520) {
        table.remove(b.m); balls.splice(i, 1);
        if (!balls.length) {
          ballsLeft--; mult = 1; host.sfx('lose');
          if (ballsLeft <= 0) { if (!done) { done = true; host.end({ won: score >= 25000, score, title: 'Game over', msg: 'Score 25,000 for a table victory.' }); } }
          else { say(`BALL ${4 - ballsLeft}`); newBall(); }
        }
      } else b.m.position.copy(W3(b.x, b.y, BR * S));
    }
    flippers.forEach((f) => (f.mesh.rotation.y = -f.a));
    bumpers.forEach((b) => { b.flash -= dt; b.mesh.scale.setScalar(b.flash > 0 ? 1.15 : 1); b.cap.material.emissiveIntensity = b.flash > 0 ? 5 : 1.5; });
    segs.forEach((s) => { if (s.kick) s.mesh.material.emissiveIntensity += (1.5 - s.mesh.material.emissiveIntensity) * dt * 5; });
    targets.forEach((tg) => { tg.mesh.position.y += ((tg.down ? -0.2 : 0.17) - tg.mesh.position.y) * dt * 10; });
    rollovers.forEach((r) => { r.mesh.material.emissive.setHex(r.lit ? 0xffd23d : 0x553300); r.mesh.material.emissiveIntensity = r.lit ? 3 : 0.6; });
    ramp.material.emissiveIntensity = 2 + Math.sin(t * 6);
    plungerMesh.position.copy(W3(478, 885 + charge * 25, 0.1));
    lightUnder.color.setHSL((t * 0.1) % 1, 1, 0.6);

    const asp = host.el.clientWidth / Math.max(1, host.el.clientHeight);
    const dist = asp < 0.8 ? 26 : 19;
    camera.position.set(0, dist * 0.82, dist * 0.55); camera.lookAt(0, 0, asp < 0.8 ? 0.3 : 0.9);
    host.score(score); host.status(`Ball ${Math.min(3, 4 - ballsLeft)}/3 · ×${mult}`);
    hud.set(`<div class="row"><span class="pill">BALL ${Math.min(3, 4 - ballsLeft)}/3</span><span class="pill" style="color:#ffd23d">×${mult}</span>${balls.length > 1 ? '<span class="pill" style="color:#3dfff0">MULTIBALL</span>' : ''}</div>
      ${inLane ? `<div class="hint">${host.touch ? 'Hold the right side, release to launch' : 'Hold Space to pull the plunger · release to launch'} ${charge ? `· ${Math.round(charge * 100)}%` : ''}</div>` : t < 6 ? `<div class="hint">${host.touch ? 'Tap left / right half for flippers' : 'Z / ← left flipper · / or → right flipper'}</div>` : ''}
      ${msgT > 0 ? `<div class="center" style="color:#ff3d9a">${msg}</div>` : ''}`);
    T.render(); input.endFrame();
  };
  return makeGame(update, () => { host.el.removeEventListener('pointerdown', tapL); window.removeEventListener('pointerup', tapU); input.destroy(); hud.remove(); T.dispose(); });
}
