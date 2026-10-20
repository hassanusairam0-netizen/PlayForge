// GAME 07 — DRIFT LEGENDS: canyon drift course with combo multipliers and hard walls.
import { createThree, THREE, mat, glow, box, lights, sparks } from './lib/three-kit.js';
import { createInput, createHud, makeGame, clamp, rand } from './lib/kit.js';
import { buildCar, carState, stepCar, poseCar, carControls, ribbon, nearest } from './lib/car.js';

const WIDTH = 18, LIMIT = 75;
const CTRL = [[0, 0], [10, -60], [60, -80], [80, -40], [50, -10], [70, 30], [40, 70], [-20, 60], [-40, 20], [-70, 10], [-60, -40], [-30, -30]];

export default function create(host) {
  const T = createThree(host.el, { bg: 0xffb27a, fov: 60, far: 600, fog: [0xffb27a, 90, 300] });
  const { scene, camera } = T;
  const input = createInput(host.el, { touch: { stick: true, buttons: [{ label: 'GAS', key: 'KeyW' }, { label: 'DRIFT', key: 'Brake' }] } });
  const hud = createHud(host.el);
  lights(scene, { hemi: [0xffd8b0, 0x6a3a2a, 0.9], sun: [0xffc890, 1.6], pos: [-60, 50, -40] });

  const curve = new THREE.CatmullRomCurve3(CTRL.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal');
  const pts = curve.getSpacedPoints(500).slice(0, -1), N = pts.length;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), mat(0xc0703a, { roughness: 1 })); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  scene.add(ribbon(pts, WIDTH, mat(0x4a4048, { roughness: 0.7 })));
  // Red/white barriers along both edges + canyon rocks beyond
  const barrierM = [mat(0xe8e0d8), mat(0xd83a2a)];
  for (let i = 0; i < N; i += 3) {
    const a = pts[i], b = pts[(i + 1) % N], dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz), nx = -dz / l, nz = dx / l;
    [-1, 1].forEach((s) => { const m = box(0.5, 1, 2, barrierM[(i / 3) % 2 | 0], a.x + nx * s * (WIDTH / 2 + 0.3), 0.5, a.z + nz * s * (WIDTH / 2 + 0.3)); m.rotation.y = Math.atan2(dx, dz); scene.add(m); });
  }
  const rockM = mat(0x8a4a2a, { flatShading: true, roughness: 1 });
  for (let i = 0; i < 120; i++) {
    const ang = rand(0, Math.PI * 2), r = rand(120, 260), s = rand(10, 40);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockM); rock.position.set(Math.cos(ang) * r, s * 0.3, Math.sin(ang) * r); rock.scale.y = rand(1, 2.2); scene.add(rock);
  }
  for (let i = 0; i < 30; i++) { const p = pts[(i * 17) % N]; const k = i % 2 ? 1 : -1; const c = new THREE.Mesh(new THREE.ConeGeometry(rand(1.5, 3), rand(4, 9), 6), mat(0x6a3a22, { flatShading: true })); c.position.set(p.x + k * rand(16, 30), 2, p.z + rand(-6, 6)); scene.add(c); }

  const car = buildCar(0xffb23d); scene.add(car);
  const smoke = sparks(scene, 0xdddddd, 400);
  const s0 = pts[0], s1 = pts[4];
  const C = carState(s0.x, s0.z, Math.atan2(-(s1.x - s0.x), -(s1.z - s0.z)));
  const eng = host.engine(50);

  let t = -3, score = 0, pending = 0, mult = 1, driftT = 0, calm = 0, hint = -1, best = 0, flash = '', flashT = 0, wallT = 0, done = false;
  const update = (dt) => {
    t += dt;
    const ctl = carControls(input); if (t < 0) ctl.throttle = 0;
    stepCar(C, ctl, dt, { accel: 26, maxSpeed: 44, grip: 3.2, handbrakeGrip: 0.6, steerRate: 2.6, drag: 0.2 });
    const near = nearest(pts, C.x, C.z, hint); hint = near.i;
    // Hard walls: push back, kill speed and break the combo.
    if (near.d > WIDTH / 2 - 1) {
      const p = pts[near.i], k = (near.d - (WIDTH / 2 - 1)) / near.d;
      C.x -= (C.x - p.x) * k; C.z -= (C.z - p.z) * k; C.vx *= 0.55; C.vz *= 0.55;
      if (wallT <= 0) { host.sfx('thud'); if (pending > 0) { flash = 'COMBO LOST'; flashT = 1.2; } pending = 0; mult = 1; driftT = 0; wallT = 0.5; }
    }
    wallT -= dt;
    poseCar(car, C, dt);
    eng.set(clamp(Math.abs(C.speed) / 44, 0, 1));

    const drifting = C.slip > 0.28 && Math.abs(C.speed) > 9 && t > 0;
    if (drifting) {
      driftT += dt; calm = 0;
      pending += Math.abs(C.speed) * C.slip * dt * 12;
      mult = Math.min(8, 1 + Math.floor(driftT / 1.2));
      if (Math.random() < 0.6) { const rx = Math.cos(C.h), rz = -Math.sin(C.h); smoke.burst(new THREE.Vector3(C.x + Math.sin(C.h) * 1.6 + rx * 0.9, 0.3, C.z + Math.cos(C.h) * 1.6 + rz * 0.9), 2, 2); }
      if (Math.random() < dt * 3) host.sfx('skid');
    } else if (pending > 0) {
      calm += dt;
      if (calm > 0.45) { const gain = Math.round(pending * mult); score += gain; best = Math.max(best, gain); flash = `+${gain.toLocaleString()}  x${mult}`; flashT = 1.4; host.sfx('coin'); pending = 0; mult = 1; driftT = 0; }
    }
    smoke.update(dt); flashT -= dt;

    const fx = -Math.sin(C.h), fz = -Math.cos(C.h);
    camera.position.lerp(new THREE.Vector3(C.x - fx * 11, 5, C.z - fz * 11), 1 - Math.exp(-dt * 5));
    camera.lookAt(C.x + fx * 4, 1, C.z + fz * 4);

    const left = Math.max(0, LIMIT - Math.max(0, t));
    host.score(score); host.status(`${Math.ceil(left)}s`);
    hud.set(`<div class="row"><span class="pill">⏱ ${left.toFixed(1)}</span><span class="pill">Best chain ${best.toLocaleString()}</span></div>
      ${pending > 0 ? `<div style="position:absolute;left:50%;top:18%;transform:translateX(-50%);text-align:center"><div style="font-size:40px;color:#fff">${Math.round(pending).toLocaleString()}</div><div style="font-size:26px;color:#ffd23d">x${mult} DRIFT</div></div>` : ''}
      ${flashT > 0 ? `<div class="center" style="top:30%;color:${flash.startsWith('+') ? '#b4ff3d' : '#ff3d3d'}">${flash}</div>` : ''}
      ${t < 0 ? `<div class="center">${Math.ceil(-t)}</div>` : ''}
      ${t > 0 && t < 5 ? `<div class="hint">${host.touch ? 'Hold DRIFT while turning' : 'Tap Space (handbrake) while turning to kick the rear out'}</div>` : ''}`);
    T.render(); input.endFrame();
    if (!done && t >= LIMIT) { done = true; score += Math.round(pending * mult); host.end({ won: score >= 5000, score, title: score >= 5000 ? 'Drift legend' : 'Time up', msg: `Best single chain ${best.toLocaleString()} pts. Reach 5,000 to earn legend status.` }); }
  };
  return makeGame(update, () => { eng.stop(); input.destroy(); hud.remove(); T.dispose(); });
}
