// GAME 08 — OFFROAD EXTREME: 4x4 rally over a heightmapped hill country with mud, rocks and suspension.
import { createThree, THREE, mat, glow, box, lights } from './lib/three-kit.js';
import { createInput, createHud, makeGame, clamp, rand } from './lib/kit.js';
import { buildCar, carState, stepCar, carControls } from './lib/car.js';

const H = (x, z) => 7 * Math.sin(x * 0.028) * Math.cos(z * 0.024) + 3 * Math.sin(x * 0.07 + 1) * Math.sin(z * 0.065) + 0.7 * Math.sin(x * 0.31) * Math.cos(z * 0.27);
const ROUTE = [[0, 110], [25, 70], [-5, 30], [25, -10], [65, -35], [45, -90], [-15, -110], [-60, -75], [-55, -25], [-95, 10]];
const MUD = [[12, 88, 9], [8, 10, 10], [50, -60, 11], [-38, -95, 9], [-58, -50, 8]];

export default function create(host) {
  const T = createThree(host.el, { bg: 0xa8d8ff, fov: 60, far: 700, fog: [0xc8e4ff, 80, 320], shadows: true });
  const { scene, camera } = T;
  const input = createInput(host.el, { touch: { stick: true, buttons: [{ label: 'GAS', key: 'KeyW' }, { label: 'RESET', key: 'KeyR' }] } });
  const hud = createHud(host.el);
  lights(scene, { hemi: [0xdff0ff, 0x5a6a3a, 0.9], sun: [0xfff4e0, 1.7], pos: [80, 120, 60], shadow: true, size: 60 });

  // Terrain mesh with vertex colours for grass, dirt track and mud.
  const segs = T.low ? 110 : 170;
  const geo = new THREE.PlaneGeometry(320, 320, segs, segs); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3), c = new THREE.Color();
  const distToRoute = (x, z) => { let d = Infinity; for (let i = 0; i < ROUTE.length - 1; i++) { const [ax, az] = ROUTE[i], [bx, bz] = ROUTE[i + 1]; const dx = bx - ax, dz = bz - az, t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1); d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return d; };
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = H(x, z); pos.setY(i, y);
    const mud = MUD.some(([mx, mz, r]) => Math.hypot(x - mx, z - mz) < r);
    const dr = distToRoute(x, z);
    if (mud) c.setHex(0x4a3420); else if (dr < 4) c.setHex(0xa8885a); else c.setHSL(0.26 + Math.sin(x * 0.1) * 0.02, 0.45, 0.32 + y * 0.012 + Math.random() * 0.03);
    cols.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
  const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true })); terrain.receiveShadow = true; scene.add(terrain);

  // Rocks, trees
  const rocks = [];
  const rockM = mat(0x8a8078, { flatShading: true });
  for (let i = 0; i < 70; i++) {
    const x = rand(-150, 150), z = rand(-150, 150); if (distToRoute(x, z) < 6) continue;
    const r = rand(1, 3.2); const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), rockM); m.position.set(x, H(x, z) + r * 0.4, z); m.castShadow = true; scene.add(m); rocks.push({ x, z, r });
  }
  for (let i = 0; i < 6; i++) { const k = (i * 7) % (ROUTE.length - 1), [ax, az] = ROUTE[k], [bx, bz] = ROUTE[k + 1], x = (ax + bx) / 2 + rand(-1.5, 1.5), z = (az + bz) / 2 + rand(-1.5, 1.5), r = 1.2; const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), rockM); m.position.set(x, H(x, z) + 0.5, z); scene.add(m); rocks.push({ x, z, r }); }
  const treeM = mat(0x2a5a2a, { flatShading: true }), trunkM = mat(0x5a3a22);
  for (let i = 0; i < 90; i++) { const x = rand(-155, 155), z = rand(-155, 155); if (distToRoute(x, z) < 8) continue; const y = H(x, z); const tr = new THREE.Mesh(new THREE.ConeGeometry(2.2, 7, 6), treeM); tr.position.set(x, y + 4.5, z); tr.castShadow = true; scene.add(tr, box(0.5, 1.5, 0.5, trunkM, x, y + 0.75, z)); rocks.push({ x, z, r: 0.8 }); }

  // Checkpoint flags + finish arch
  const flags = ROUTE.slice(1).map(([x, z], i) => {
    const last = i === ROUTE.length - 2, y = H(x, z), g = new THREE.Group(); g.position.set(x, y, z);
    if (last) { g.add(box(0.6, 7, 0.6, mat(0x222222), -6, 3.5, 0), box(0.6, 7, 0.6, mat(0x222222), 6, 3.5, 0), box(12.6, 1.4, 0.4, glow(0xff3d3d, 1), 0, 7, 0)); }
    else { g.add(box(0.15, 4, 0.15, mat(0xeeeeee), 0, 2, 0)); const f = box(1.6, 1, 0.05, glow(0xff9a3d, 1.5), 0.8, 3.5, 0); g.add(f); g.userData.f = f; }
    const ring = new THREE.Mesh(new THREE.RingGeometry(6.5, 7, 40), new THREE.MeshBasicMaterial({ color: 0xffd23d, transparent: true, opacity: 0.5, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.4; g.add(ring);
    scene.add(g); return { x, z, g, ring, last };
  });

  const truck = buildCar(0xd8442a, { truck: true }); truck.traverse((o) => (o.castShadow = true)); scene.add(truck);
  const [sx, sz] = ROUTE[0], [nx, nz] = ROUTE[1];
  const C = carState(sx, sz, Math.atan2(-(nx - sx), -(nz - sz)));
  const eng = host.engine(38, 'square');
  let next = 0, t = -3, lastCp = { x: sx, z: sz, h: C.h }, flipT = 0, done = false, pitch = 0, roll = 0;

  const recover = () => { C.x = lastCp.x; C.z = lastCp.z; C.h = lastCp.h; C.vx = C.vz = 0; host.sfx('flip'); };
  const update = (dt) => {
    t += dt;
    const ctl = carControls(input); if (t < 0) ctl.throttle = 0;
    const inMud = MUD.some(([mx, mz, r]) => Math.hypot(C.x - mx, C.z - mz) < r);
    stepCar(C, ctl, dt, { accel: 20, maxSpeed: 30, grip: inMud ? 2 : 6, steerRate: 1.7, drag: 0.2, offDrag: inMud ? 2.2 : 0 });
    // Gravity along the slope
    const fx = -Math.sin(C.h), fz = -Math.cos(C.h), rx = Math.cos(C.h), rz = -Math.sin(C.h);
    const hf = H(C.x + fx * 1.4, C.z + fz * 1.4), hb = H(C.x - fx * 1.4, C.z - fz * 1.4), hl = H(C.x - rx, C.z - rz), hr = H(C.x + rx, C.z + rz);
    const slope = (hf - hb) / 2.8;
    C.vx -= fx * slope * 13 * dt; C.vz -= fz * slope * 13 * dt;
    for (const r of rocks) { const dx = C.x - r.x, dz = C.z - r.z, d = Math.hypot(dx, dz), m = r.r + 1.3; if (d < m) { C.x = r.x + dx / d * m; C.z = r.z + dz / d * m; const vn = (C.vx * dx + C.vz * dz) / d; if (vn < 0) { C.vx -= dx / d * vn * 1.4; C.vz -= dz / d * vn * 1.4; if (vn < -6) host.sfx('thud'); } } }
    C.x = clamp(C.x, -155, 155); C.z = clamp(C.z, -155, 155);
    if (input.pressed('KeyR')) recover();

    // Suspension pose
    const y = (hf + hb + hl + hr) / 4;
    pitch += (Math.atan2(hf - hb, 2.8) - pitch) * Math.min(1, dt * 8); roll += (Math.atan2(hr - hl, 2) - roll) * Math.min(1, dt * 8);
    truck.position.set(C.x, y, C.z); truck.rotation.set(0, 0, 0); truck.rotateY(C.h); truck.rotateX(-pitch); truck.rotateZ(roll);
    const { wheels, body, r } = truck.userData;
    wheels.forEach((w, i) => { w.rotation.x -= (C.speed / r) * dt; if (i < 2) w.rotation.y = -C.steer * 0.5; });
    body.position.y = Math.sin(t * 20) * Math.min(0.06, Math.abs(C.speed) * 0.002) * (inMud ? 2 : 1);
    eng.set(clamp(Math.abs(C.speed) / 30 + Math.max(0, slope) * 0.5, 0, 1));
    flipT = Math.abs(roll) > 0.8 || Math.abs(pitch) > 0.9 ? flipT + dt : 0;

    // Checkpoints
    flags.forEach((f, i) => { f.ring.visible = i === next; if (f.g.userData.f) f.g.userData.f.rotation.y = Math.sin(t * 4 + i) * 0.3; });
    const f = flags[next];
    if (f && Math.hypot(C.x - f.x, C.z - f.z) < 7) {
      lastCp = { x: f.x, z: f.z, h: C.h }; next++; host.sfx(f.last ? 'win' : 'coin');
      if (f.last && !done) { done = true; host.end({ won: true, score: t, title: 'Finish line!', msg: `All ${flags.length - 1} checkpoints and the finish in ${t.toFixed(2)}s.` }); }
    }

    camera.position.lerp(new THREE.Vector3(C.x - fx * 13, y + 6.5, C.z - fz * 13), 1 - Math.exp(-dt * 4));
    camera.position.y = Math.max(camera.position.y, H(camera.position.x, camera.position.z) + 2);
    camera.lookAt(C.x + fx * 4, y + 1.5, C.z + fz * 4);

    const target = flags[next]; const bearing = target ? Math.atan2(target.x - C.x, target.z - C.z) - Math.atan2(fx, fz) : 0;
    host.score(Math.max(0, t)); host.status(`Checkpoint ${Math.min(next + 1, flags.length)}/${flags.length}`);
    hud.set(`<div class="row"><span class="pill">⏱ ${Math.max(0, t).toFixed(2)}</span><span class="pill">CP ${next}/${flags.length - 1}</span><span class="pill">${Math.round(Math.abs(C.speed) * 3.6)} km/h</span>${inMud ? '<span class="pill" style="color:#c98a3d">MUD</span>' : ''}</div>
      ${target ? `<div style="position:absolute;left:50%;top:8px;transform:translateX(-50%) rotate(${-bearing}rad);font-size:34px;color:#ffd23d">▲</div>` : ''}
      ${t < 0 ? `<div class="center">${Math.ceil(-t)}</div>` : ''}
      ${flipT > 1 ? `<div class="hint">Stuck? Press ${host.touch ? 'RESET' : 'R'} to recover</div>` : ''}`);
    T.render(); input.endFrame();
  };
  return makeGame(update, () => { eng.stop(); input.destroy(); hud.remove(); T.dispose(); });
}
