// GAME 06 — TURBO CIRCUIT: three-lap time trial on a neon night circuit, with a ghost of your best lap run.
import { createThree, THREE, mat, glow, box, canvasTexture } from './lib/three-kit.js';
import { createInput, createHud, makeGame, clamp, rand } from './lib/kit.js';
import { buildCar, carState, stepCar, poseCar, carControls, ribbon, nearest } from './lib/car.js';

const LAPS = 3, WIDTH = 14, GHOST_KEY = 'playforge.ghost.turbo';
const CTRL = [[0, 0], [0, -120], [40, -170], [110, -150], [130, -90], [90, -40], [140, 10], [120, 80], [40, 90], [-20, 60], [-60, 90], [-110, 60], [-90, 0], [-40, 20]];

export default function create(host) {
  const T = createThree(host.el, { bg: 0x0a0418, fov: 62, far: 900, fog: [0x0a0418, 120, 420] });
  const { scene, camera } = T;
  const input = createInput(host.el, { touch: { stick: true, buttons: [{ label: 'GAS', key: 'KeyW' }, { label: 'BRAKE', key: 'KeyS' }] } });
  const hud = createHud(host.el);
  scene.add(new THREE.HemisphereLight(0x8a6aff, 0x100818, 0.8));
  const moon = new THREE.DirectionalLight(0xc8b0ff, 0.7); moon.position.set(50, 100, -50); scene.add(moon);

  const curve = new THREE.CatmullRomCurve3(CTRL.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal');
  const pts = curve.getSpacedPoints(600).slice(0, -1);
  const N = pts.length;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), mat(0x0c0a14, { roughness: 1 })); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const roadTex = canvasTexture(64, 256, (g, w, h) => { g.fillStyle = '#26232e'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff33'; g.fillRect(w / 2 - 1, 0, 2, h / 2); g.fillStyle = '#ff3d7a'; g.fillRect(0, 0, 3, h); g.fillRect(w - 3, 0, 3, h); }, [1, 1]);
  roadTex.wrapT = THREE.RepeatWrapping;
  scene.add(ribbon(pts, WIDTH, new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.5, metalness: 0.2 })));
  const edgeL = ribbon(pts, WIDTH + 2.4, glow(0x3db8ff, 1.2), 0.01); scene.add(edgeL);
  // Neon posts and skyline
  for (let i = 0; i < N; i += 12) {
    const a = pts[i], b = pts[(i + 1) % N], dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz), nx = -dz / l, nz = dx / l;
    [-1, 1].forEach((s) => scene.add(box(0.3, 2.2, 0.3, glow(i % 24 ? 0xff3d7a : 0x3db8ff, 2), a.x + nx * s * (WIDTH / 2 + 2), 1.1, a.z + nz * s * (WIDTH / 2 + 2))));
  }
  for (let i = 0; i < 90; i++) {
    const ang = rand(0, Math.PI * 2), r = rand(230, 380), h = rand(20, 110);
    const b = box(rand(14, 30), h, rand(14, 30), mat(0x120a22, { emissive: [0x3db8ff, 0xff3d7a, 0x8a5cff][i % 3], emissiveIntensity: rand(0.02, 0.18) }), Math.cos(ang) * r, h / 2, Math.sin(ang) * r);
    scene.add(b);
  }
  // Checkpoints (gates)
  const GATES = 8, gates = [];
  for (let k = 0; k < GATES; k++) {
    const i = Math.floor((k / GATES) * N), a = pts[i], b = pts[(i + 2) % N];
    const g = new THREE.Group(); g.position.set(a.x, 0, a.z); g.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    const col = k === 0 ? 0xffffff : 0xffd23d;
    g.add(box(0.5, 6, 0.5, glow(col, 2), -WIDTH / 2 - 1, 3, 0), box(0.5, 6, 0.5, glow(col, 2), WIDTH / 2 + 1, 3, 0), box(WIDTH + 2.5, 0.5, 0.5, glow(col, 2), 0, 6, 0));
    if (k === 0) { const cl = canvasTexture(256, 32, (c, w, h) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 2; y++) { c.fillStyle = (x + y) % 2 ? '#fff' : '#111'; c.fillRect(x * 16, y * 16, 16, 16); } }); const fl = new THREE.Mesh(new THREE.PlaneGeometry(WIDTH, 2), new THREE.MeshBasicMaterial({ map: cl })); fl.rotation.x = -Math.PI / 2; fl.position.y = 0.04; g.add(fl); }
    scene.add(g); gates.push({ i, g });
  }

  const car = buildCar(0xff3d7a); scene.add(car);
  const start = pts[10], dirv = pts[14];
  const C = carState(start.x, start.z, Math.atan2(-(dirv.x - start.x), -(dirv.z - start.z)));
  // Ghost replay of best run
  let ghostData = null; try { ghostData = JSON.parse(localStorage.getItem(GHOST_KEY) || 'null'); } catch {}
  const ghost = buildCar(0x3db8ff); ghost.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.35; } });
  ghost.visible = !!ghostData; scene.add(ghost);
  const record = [];
  const eng = host.engine(45);

  let t = -3, lap = 1, nextGate = 1, hint = -1, lapStart = 0, bestLap = Infinity, done = false, recT = 0, wrong = 0;
  const update = (dt) => {
    t += dt;
    const ctl = carControls(input);
    const near = nearest(pts, C.x, C.z, hint); hint = near.i;
    const off = near.d > WIDTH / 2 + 0.5;
    if (t < 0) { ctl.throttle = 0; }
    stepCar(C, ctl, dt, { accel: 30, maxSpeed: 62, grip: 9, steerRate: 1.9, drag: 0.15, offDrag: off ? 1.6 : 0 });
    // Soft walls far off track
    if (near.d > WIDTH / 2 + 7) { const p = pts[near.i]; const k = (near.d - WIDTH / 2 - 7) / near.d; C.x -= (C.x - p.x) * k; C.z -= (C.z - p.z) * k; C.vx *= 0.9; C.vz *= 0.9; }
    poseCar(car, C, dt);
    eng.set(clamp(Math.abs(C.speed) / 62, 0, 1));

    if (t >= 0) {
      const g = gates[nextGate % GATES];
      const gi = g.i, di = ((near.i - gi + N) % N);
      if (di < 15 && near.d < WIDTH) {
        host.sfx('blip', 700);
        if (nextGate % GATES === 0) {
          const lt = t - lapStart; bestLap = Math.min(bestLap, lt); lapStart = t;
          if (lap >= LAPS) {
            if (!done) {
              done = true;
              const prev = host.best;
              if (prev == null || t < prev) try { localStorage.setItem(GHOST_KEY, JSON.stringify(record)); } catch {}
              host.end({ won: true, score: t, title: 'Chequered flag', msg: `Best lap ${bestLap.toFixed(2)}s · ${off ? '' : 'clean finish'}` });
            }
          } else { lap++; host.sfx('success'); }
        }
        nextGate++;
      }
      // Wrong-way detection
      const ahead = pts[(near.i + 5) % N]; const tdx = ahead.x - pts[near.i].x, tdz = ahead.z - pts[near.i].z;
      wrong = (C.vx * tdx + C.vz * tdz) < -5 ? wrong + dt : 0;
      recT += dt; if (recT > 0.1) { recT = 0; record.push([+C.x.toFixed(1), +C.z.toFixed(1), +C.h.toFixed(2)]); }
      if (ghostData) { const k = Math.min(ghostData.length - 1, Math.floor(t * 10)); const a = ghostData[k], b = ghostData[Math.min(ghostData.length - 1, k + 1)], f = t * 10 - Math.floor(t * 10); ghost.position.set(a[0] + (b[0] - a[0]) * f, 0, a[1] + (b[1] - a[1]) * f); ghost.rotation.y = a[2]; }
    }

    const fx = -Math.sin(C.h), fz = -Math.cos(C.h), sp = Math.abs(C.speed);
    camera.position.lerp(new THREE.Vector3(C.x - fx * (9 + sp * 0.06), 3.6, C.z - fz * (9 + sp * 0.06)), 1 - Math.exp(-dt * 8));
    camera.lookAt(C.x + fx * 6, 1.2, C.z + fz * 6);
    camera.fov = 62 + sp * 0.25; camera.updateProjectionMatrix();

    const cur = Math.max(0, t);
    host.score(cur); host.status(`Lap ${lap}/${LAPS}`);
    hud.set(`<div class="row"><span class="pill">LAP ${lap}/${LAPS}</span><span class="pill">⏱ ${cur.toFixed(2)}</span><span class="pill">Best lap ${bestLap < Infinity ? bestLap.toFixed(2) : '—'}</span>${ghostData ? '<span class="pill" style="color:#3db8ff">◆ Ghost active</span>' : ''}</div>
      <div style="position:absolute;right:0;bottom:0;text-align:right"><div style="font-size:54px;line-height:1">${Math.round(sp * 3.6)}</div><div style="font-size:12px;letter-spacing:.2em">KM/H</div></div>
      ${t < 0 ? `<div class="center">${Math.ceil(-t)}</div>` : t < 0.8 ? '<div class="center" style="color:#b4ff3d">GO!</div>' : ''}
      ${wrong > 1 ? '<div class="center" style="color:#ff3d3d">WRONG WAY</div>' : off ? '<div class="hint">Off track — get back on the asphalt</div>' : ''}`);
    T.render(); input.endFrame();
  };
  return makeGame(update, () => { eng.stop(); input.destroy(); hud.remove(); T.dispose(); });
}
