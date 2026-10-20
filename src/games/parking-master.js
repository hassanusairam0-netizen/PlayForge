// GAME 09 — PARKING MASTER: precision parking across six increasingly tight levels.
import { createThree, THREE, mat, glow, box, lights, canvasTexture } from './lib/three-kit.js';
import { createInput, createHud, makeGame, clamp } from './lib/kit.js';
import { buildCar, carState, stepCar, poseCar, carControls } from './lib/car.js';

const PI = Math.PI;
const car = (x, z, h = 0) => ({ type: 'car', x, z, h, hw: 0.95, hl: 2.05 });
const cone = (x, z) => ({ type: 'cone', x, z, h: 0, hw: 0.3, hl: 0.3 });
const wall = (x, z, w, l, h = 0) => ({ type: 'wall', x, z, h, hw: w / 2, hl: l / 2 });
const LEVELS = [
  { name: 'Easy In', start: [0, 12, 0], bay: [0, -8, 0, 3.6, 6.2], obs: [car(-3.8, -8), car(3.8, -8), wall(0, -12.5, 1, 14, PI / 2)] },
  { name: 'Side Street', start: [-8, 10, 0], bay: [7, -5, PI / 2, 3.2, 5.8], obs: [car(7, -1.6, PI / 2), car(7, -8.4, PI / 2), cone(3, -2), cone(3, -8)] },
  { name: 'Parallel Park', start: [3, 12, 0], bay: [8, 0, 0, 3, 6.6], obs: [car(8, -7.2), car(8, 7.2), wall(10.6, 0, 1, 26)] },
  { name: 'Angled Cones', start: [-10, 12, 0], bay: [4, -6, 0.6, 2.9, 5.4], obs: [car(1.2, -4.2, 0.6), car(6.8, -7.8, 0.6), cone(-2, -2), cone(0, 2), cone(-4, 4), cone(8, 0), cone(6, 2)] },
  { name: 'The Garage', start: [0, 10, PI], bay: [0, -10, 0, 2.6, 5.2], obs: [wall(-1.9, -10, 0.4, 5.6), wall(1.9, -10, 0.4, 5.6), wall(0, -12.8, 4.2, 0.4), cone(-3, -4), cone(3, -4), car(-5, -9), car(5, -9)] },
  { name: 'Downtown Squeeze', start: [-10, 10, -PI / 2], bay: [6, 6, PI / 2, 2.5, 5.2], obs: [car(6, 9.6, PI / 2), car(6, 2.4, PI / 2), wall(9.4, 6, 1, 14), cone(0, 4), cone(2, 0), cone(-2, 8), car(-4, -2, 0.3), car(2, -6, -0.4)] },
];

function corners(o) {
  const fx = -Math.sin(o.h), fz = -Math.cos(o.h), rx = Math.cos(o.h), rz = -Math.sin(o.h);
  return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([a, b]) => [o.x + rx * o.hw * a + fx * o.hl * b, o.z + rz * o.hw * a + fz * o.hl * b]);
}
function overlap(a, b) {
  const ca = corners(a), cb = corners(b);
  for (const o of [a, b]) for (const ax of [[Math.cos(o.h), -Math.sin(o.h)], [-Math.sin(o.h), -Math.cos(o.h)]]) {
    const pa = ca.map(([x, z]) => x * ax[0] + z * ax[1]), pb = cb.map(([x, z]) => x * ax[0] + z * ax[1]);
    if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) return false;
  }
  return true;
}
const inside = ([px, pz], bay) => { const dx = px - bay.x, dz = pz - bay.z, rx = Math.cos(bay.h), rz = -Math.sin(bay.h), fx = -Math.sin(bay.h), fz = -Math.cos(bay.h); return Math.abs(dx * rx + dz * rz) <= bay.hw && Math.abs(dx * fx + dz * fz) <= bay.hl; };

export default function create(host) {
  const T = createThree(host.el, { bg: 0x8aa0b4, fov: 50, shadows: true });
  const { scene, camera } = T;
  const input = createInput(host.el, { touch: { stick: true } });
  const hud = createHud(host.el);
  lights(scene, { hemi: [0xffffff, 0x445566, 1], sun: [0xffffff, 1.5], pos: [10, 30, 12], shadow: true, size: 25 });
  const asphalt = canvasTexture(256, 256, (g, s) => { g.fillStyle = '#4e555e'; g.fillRect(0, 0, s, s); for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; g.fillRect(Math.random() * s, Math.random() * s, 2, 2); } }, [12, 12]);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.9 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const border = [wall(0, -16, 1, 34, PI / 2), wall(0, 16, 1, 34, PI / 2), wall(-16, 0, 1, 34), wall(16, 0, 1, 34)];

  const player = buildCar(0x3dd8ff); player.traverse((o) => (o.castShadow = true)); scene.add(player);
  let level = 0, group, C, bay, obs, bumps, lvlT, parkT, total = 0, bumpCd = 0, msg = '', msgT = 0, done = false, prev;
  const carCols = [0xe04848, 0xf2c94c, 0x9b51e0, 0x27ae60, 0xffffff, 0x2a2a2a];

  function build(i) {
    if (group) scene.remove(group);
    group = new THREE.Group(); scene.add(group);
    const L = LEVELS[i];
    C = carState(L.start[0], L.start[1], L.start[2]);
    bay = { x: L.bay[0], z: L.bay[1], h: L.bay[2], hw: L.bay[3] / 2, hl: L.bay[4] / 2 };
    obs = [...L.obs, ...border];
    obs.forEach((o, k) => {
      let m;
      if (o.type === 'car') { m = buildCar(carCols[k % carCols.length]); m.position.set(o.x, 0, o.z); m.rotation.y = o.h; }
      else if (o.type === 'cone') { m = new THREE.Group(); m.add(new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 12), mat(0xff7a2f))); m.children[0].position.y = 0.4; m.add(box(0.6, 0.05, 0.6, mat(0xff7a2f), 0, 0.03, 0)); m.position.set(o.x, 0, o.z); }
      else { m = box(o.hw * 2, 1, o.hl * 2, mat(0xb8bcc4), o.x, 0.5, o.z); m.rotation.y = o.h; }
      m.traverse((x) => (x.castShadow = true)); group.add(m);
    });
    const pts = corners(bay).map(([x, z]) => new THREE.Vector3(x, 0.05, z)); pts.push(pts[0].clone());
    bay.line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffe23d })); group.add(bay.line);
    bay.fill = new THREE.Mesh(new THREE.PlaneGeometry(bay.hw * 2, bay.hl * 2), new THREE.MeshBasicMaterial({ color: 0xffe23d, transparent: true, opacity: 0.18 }));
    bay.fill.rotation.x = -Math.PI / 2; bay.fill.rotation.z = bay.h; bay.fill.position.set(bay.x, 0.04, bay.z); group.add(bay.fill);
    bumps = 0; lvlT = 0; parkT = 0; msg = L.name; msgT = 2;
  }
  build(0);

  const update = (dt, t) => {
    lvlT += dt; bumpCd -= dt; msgT -= dt;
    prev = { x: C.x, z: C.z, h: C.h };
    stepCar(C, carControls(input), dt, { accel: 9, maxSpeed: 11, reverse: 7, grip: 14, steerRate: 2.6, drag: 0.4, brake: 18 });
    const me = { x: C.x, z: C.z, h: C.h, hw: 0.92, hl: 2.0 };
    if (obs.some((o) => overlap(me, o))) {
      C.x = prev.x; C.z = prev.z; C.h = prev.h; C.vx *= -0.25; C.vz *= -0.25;
      if (bumpCd <= 0) { bumps++; bumpCd = 0.6; host.sfx('thud'); host.el.style.boxShadow = 'inset 0 0 60px #ff3030'; setTimeout(() => (host.el.style.boxShadow = ''), 150); }
    }
    poseCar(player, C, dt);
    const cs = corners(me), allIn = cs.every((p) => inside(p, bay));
    const ang = Math.abs(((C.h - bay.h) % PI + PI * 1.5) % PI - PI / 2);
    const aligned = allIn && ang < 0.22;
    bay.fill.material.color.setHex(aligned ? 0x5ad86b : allIn ? 0xffb23d : 0xffe23d);
    bay.line.material.color.setHex(aligned ? 0x5ad86b : 0xffe23d);
    bay.fill.material.opacity = 0.18 + (aligned ? Math.sin(t * 8) * 0.08 + 0.1 : 0);
    parkT = aligned && Math.abs(C.speed) < 0.4 ? parkT + dt : 0;

    if (parkT > 1) {
      const pts = Math.max(100, Math.round(1000 - lvlT * 8 - bumps * 150)); total += pts; host.sfx('success');
      level++;
      if (level >= LEVELS.length) { if (!done) { done = true; host.end({ won: true, score: total, title: 'Parking master', msg: 'All six bays nailed. Valet of the year.' }); } }
      else { build(level); msg = `Parked! +${pts}`; msgT = 1.8; }
    }
    if (bumps >= 3 || lvlT > 60) { msg = bumps >= 3 ? 'Three bumps — try again' : 'Out of time — try again'; host.sfx('error'); const m = msg; build(level); msg = m; msgT = 2; total = Math.max(0, total - 100); }

    const cx = (C.x + bay.x) / 2, cz = (C.z + bay.z) / 2;
    camera.position.lerp(new THREE.Vector3(cx, 24, cz + 14), 1 - Math.exp(-dt * 3)); camera.lookAt(cx, 0, cz);

    host.score(total); host.status(`Level ${level + 1}/6`);
    hud.set(`<div class="row"><span class="pill">${LEVELS[Math.min(level, 5)].name}</span><span class="pill">Bumps ${'●'.repeat(bumps)}${'○'.repeat(3 - bumps)}</span><span class="pill">⏱ ${Math.max(0, 60 - lvlT).toFixed(0)}s</span><span class="pill">${C.speed < -0.2 ? 'R' : 'D'} · ${Math.abs(C.speed * 3.6).toFixed(0)} km/h</span></div>
      ${msgT > 0 ? `<div class="center">${msg}</div>` : ''}
      ${aligned ? `<div class="hint" style="color:#5ad86b">Hold still… ${Math.round(Math.min(1, parkT) * 100)}%</div>` : allIn ? '<div class="hint">Straighten up!</div>' : ''}`);
    T.render(); input.endFrame();
  };
  return makeGame(update, () => { host.el.style.boxShadow = ''; input.destroy(); hud.remove(); T.dispose(); });
}
