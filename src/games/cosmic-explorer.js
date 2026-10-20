// GAME 25 — COSMIC EXPLORER: 6-DOF-ish scout ship in an asteroid belt; harvest crystals, manage energy, return home.
import { createThree, THREE, mat, glow, box, sparks } from './lib/three-kit.js';
import { createInput, createHud, makeGame, bar, clamp, rand } from './lib/kit.js';

const GOAL = 25, FIELD = 140;

export default function create(host) {
  const T = createThree(host.el, { bg: 0x02020a, fov: 65, far: 900, fog: [0x05030f, 120, 300] });
  const { scene, camera } = T;
  const input = createInput(host.el, { touch: { stick: true, buttons: [{ label: 'THRUST', key: 'KeyW' }, { label: 'BRAKE', key: 'KeyS' }] } });
  const hud = createHud(host.el);
  scene.add(new THREE.AmbientLight(0x6a5aaa, 1.6));
  const star = new THREE.PointLight(0x8a7bff, 3000, 600); star.position.set(150, 60, -200); scene.add(star);
  const key = new THREE.DirectionalLight(0x3dfff0, 0.8); key.position.set(-1, 1, 1); scene.add(key);
  // Starfield + nebula
  const sg = new THREE.BufferGeometry(), sp = new Float32Array(3000 * 3);
  for (let i = 0; i < 3000; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(rand(400, 800)); sp.set([v.x, v.y, v.z], i * 3); }
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.4, fog: false })); scene.add(stars);
  const neb = new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, fog: false, depthWrite: false, transparent: true,
    vertexShader: 'varying vec3 p;void main(){p=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec3 p;void main(){float a=pow(max(0.,dot(p,normalize(vec3(.6,.3,-.7)))),3.);float b=pow(max(0.,dot(p,normalize(vec3(-.7,-.2,-.5)))),4.);gl_FragColor=vec4(vec3(.55,.35,1.)*a+vec3(.1,.8,.9)*b,(a+b)*.55);}' }));
  scene.add(neb);
  const planet = new THREE.Mesh(new THREE.SphereGeometry(60, 48, 32), mat(0x5a3aa8, { roughness: 0.9, emissive: 0x1a0a3a })); planet.position.set(220, -80, -380); scene.add(planet);

  // Mothership (start / finish)
  const mother = new THREE.Group();
  mother.add(box(30, 6, 10, mat(0x8a90a8, { metalness: 0.7, roughness: 0.3 })), box(8, 10, 8, mat(0x6a708a, { metalness: 0.7 }), -8, 5, 0));
  const dock = new THREE.Mesh(new THREE.TorusGeometry(6, 0.4, 8, 32), glow(0x5aff8a, 2)); dock.position.set(0, 0, 8); mother.add(dock);
  for (let i = -12; i <= 12; i += 4) mother.add(box(0.6, 0.6, 0.6, glow(0x3dfff0, 3), i, 3.3, 5));
  mother.position.set(0, 0, 30); scene.add(mother);

  // Asteroids (instanced, each with its own spin and drift)
  const NA = T.low ? 180 : 320;
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 1), mat(0x9a8a92, { flatShading: true, roughness: 0.9 }), NA);
  const ast = [];
  for (let i = 0; i < NA; i++) {
    let p; do { p = new THREE.Vector3(rand(-FIELD, FIELD), rand(-45, 45), rand(-FIELD * 1.6, 0)); } while (p.distanceTo(mother.position) < 30);
    ast.push({ p, r: rand(1.2, 6.5) * (Math.random() < 0.1 ? 2 : 1), q: new THREE.Quaternion().random(), spin: new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize(), w: rand(0.1, 0.6), v: new THREE.Vector3(rand(-1, 1), rand(-0.4, 0.4), rand(-1, 1)) });
  }
  scene.add(rocks);
  const m4 = new THREE.Matrix4(), dq = new THREE.Quaternion(), sc = new THREE.Vector3();
  // Crystals
  const crystals = [];
  for (let i = 0; i < GOAL + 12; i++) {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(1), glow(0x3dfff0, 2.5)); m.scale.set(0.8, 1.4, 0.8);
    m.position.set(rand(-FIELD * 0.9, FIELD * 0.9), rand(-35, 35), rand(-FIELD * 1.5, -15)); scene.add(m); crystals.push(m);
  }
  const fx = sparks(scene, 0x3dfff0, 300), boom = sparks(scene, 0xff9a3d, 200);

  // Ship
  const ship = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3.2, 8), mat(0xd8dff0, { metalness: 0.8, roughness: 0.25 })); hull.rotation.x = -Math.PI / 2; ship.add(hull);
  ship.add(box(3.6, 0.1, 1.2, mat(0x8a7bff, { metalness: 0.6 }), 0, 0, 0.6), box(0.1, 0.8, 0.9, mat(0x8a7bff), 0, 0.4, 1.1));
  ship.add(box(0.5, 0.25, 0.6, glow(0x3dfff0, 1.5), 0, 0.3, -0.2));
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.6, 10), new THREE.MeshBasicMaterial({ color: 0x8a7bff, transparent: true, opacity: 0.85 })); flame.rotation.x = Math.PI / 2; flame.position.z = 2.3; ship.add(flame);
  const shipLight = new THREE.PointLight(0x8a7bff, 20, 12); shipLight.position.z = 2.5; ship.add(shipLight);
  scene.add(ship);

  const pos = new THREE.Vector3(0, 0, 14), vel = new THREE.Vector3(), quat = new THREE.Quaternion();
  let hull_ = 100, energy = 100, got = 0, t = 0, hitCd = 0, msg = 'Harvest 25 crystals, then return to the mothership.', msgT = 5, done = false;
  const amb = host.ambient('space');
  const eng = host.engine(70, 'triangle');
  const fwd = new THREE.Vector3(), up = new THREE.Vector3(), right = new THREE.Vector3(), tmp = new THREE.Vector3();

  const update = (dt) => {
    t += dt; hitCd -= dt; msgT -= dt;
    // Steering: keys / stick, plus mouse offset from centre on desktop
    const ax = input.axis();
    const thrust = input.down('KeyW', 'ShiftLeft') ? 1 : 0, brake = input.down('KeyS');
    let yaw = -(input.down('ArrowLeft', 'KeyA') ? -1 : 0) - (input.down('ArrowRight', 'KeyD') ? 1 : 0) - input.stick.x;
    let pitch = (input.down('ArrowUp') ? 1 : 0) - (input.down('ArrowDown') ? 1 : 0) + input.stick.y;
    if (!host.touch && input.pointer.x) { const px = clamp(input.pointer.nx, -1, 1), py = clamp(input.pointer.ny, -1, 1); if (Math.abs(px) > 0.15) yaw -= (px - Math.sign(px) * 0.15) * 1.4; if (Math.abs(py) > 0.15) pitch += (py - Math.sign(py) * 0.15) * 1.2; }
    yaw = clamp(yaw, -1, 1); pitch = clamp(pitch, -1, 1);
    dq.setFromEuler(new THREE.Euler(pitch * 1.3 * dt, yaw * 1.5 * dt, -yaw * 0.6 * dt)); quat.multiply(dq).normalize();
    // Gentle auto-level of roll
    fwd.set(0, 0, -1).applyQuaternion(quat); up.set(0, 1, 0).applyQuaternion(quat); right.set(1, 0, 0).applyQuaternion(quat);
    const roll = Math.asin(clamp(right.y, -1, 1)); quat.multiply(dq.setFromAxisAngle(tmp.set(0, 0, 1), -roll * dt * 1.5));
    if (thrust && energy > 0) { vel.addScaledVector(fwd, 32 * dt); energy -= dt * 2.2; }
    if (brake) vel.multiplyScalar(1 - 2.5 * dt);
    vel.multiplyScalar(1 - 0.35 * dt); if (vel.length() > 40) vel.setLength(40);
    energy = Math.max(0, energy - dt * 0.55);
    pos.addScaledVector(vel, dt);
    if (pos.length() > 320) { vel.addScaledVector(pos.clone().normalize(), -30 * dt); if (msgT < 0) { msg = 'Leaving the sector — turn back!'; msgT = 2; } }
    ship.position.copy(pos); ship.quaternion.copy(quat);
    flame.scale.set(1, thrust && energy > 0 ? 1.2 + Math.random() * 0.5 : 0.3, 1); shipLight.intensity = thrust ? 30 : 6;
    eng.set(clamp(vel.length() / 40, 0, 1) * 0.6);

    // Asteroids
    for (let i = 0; i < NA; i++) {
      const a = ast[i];
      a.p.addScaledVector(a.v, dt); a.q.multiply(dq.setFromAxisAngle(a.spin, a.w * dt));
      m4.compose(a.p, a.q, sc.setScalar(a.r)); rocks.setMatrixAt(i, m4);
      const d = a.p.distanceTo(pos);
      if (d < a.r + 1.2) {
        const n = tmp.copy(pos).sub(a.p).normalize(); pos.copy(a.p).addScaledVector(n, a.r + 1.25);
        const vn = vel.dot(n); if (vn < 0) vel.addScaledVector(n, -1.6 * vn);
        if (hitCd <= 0) { const dmg = clamp(Math.abs(vn) * 1.6, 4, 30); hull_ -= dmg; hitCd = 0.5; host.sfx('explode'); boom.burst(pos, 25, 8); host.el.style.boxShadow = 'inset 0 0 80px #ff5a3d'; setTimeout(() => (host.el.style.boxShadow = ''), 150); }
      }
    }
    rocks.instanceMatrix.needsUpdate = true;
    for (const c of crystals) {
      if (!c.visible) continue;
      c.rotation.y += dt * 2; c.position.y += Math.sin(t * 2 + c.position.x) * dt * 0.3;
      if (c.position.distanceTo(pos) < 3.2) { c.visible = false; got++; energy = Math.min(100, energy + 18); host.sfx('coin'); fx.burst(c.position, 30, 7); if (got === GOAL) { msg = 'Cargo full! Return to the green dock on the mothership.'; msgT = 6; host.sfx('success'); } }
    }
    fx.update(dt); boom.update(dt);
    dock.material.emissiveIntensity = got >= GOAL ? 3 + Math.sin(t * 6) * 2 : 0.6;
    if (got >= GOAL && pos.distanceTo(tmp.copy(mother.position).add(dock.position)) < 8 && !done) { done = true; host.sfx('win'); host.end({ won: true, score: got * 100 + Math.round(hull_) * 10 + Math.round(energy) * 10 + Math.max(0, 600 - Math.round(t)) * 2, title: 'Mission complete', msg: `${got} crystals delivered in ${Math.floor(t / 60)}m ${Math.floor(t % 60)}s.` }); }

    // Chase camera
    const camPos = tmp.copy(pos).addScaledVector(fwd, -9).addScaledVector(up, 2.6);
    camera.position.lerp(camPos, 1 - Math.exp(-dt * 6)); camera.up.lerp(up, 0.1); camera.lookAt(pos.clone().addScaledVector(fwd, 8));
    stars.position.copy(camera.position); neb.position.copy(camera.position);

    // Nearest-crystal / home marker
    let target = null;
    if (got >= GOAL) target = mother.position.clone().add(dock.position);
    else { let bd = Infinity; for (const c of crystals) if (c.visible) { const d = c.position.distanceTo(pos); if (d < bd) { bd = d; target = c.position; } } }
    let marker = '';
    if (target) {
      const pr = target.clone().project(camera), behind = pr.z > 1, dist = Math.round(target.distanceTo(pos));
      let x = behind ? -pr.x : pr.x, y = behind ? -pr.y : pr.y; const off = behind || Math.abs(x) > 0.9 || Math.abs(y) > 0.85;
      if (off) { const m = Math.max(Math.abs(x), Math.abs(y)) || 1; x = (x / m) * 0.88; y = (y / m) * 0.82; }
      marker = `<div style="position:absolute;left:${(x + 1) * 50}%;top:${(1 - y) * 50}%;transform:translate(-50%,-50%);color:${got >= GOAL ? '#5aff8a' : '#3dfff0'};font-size:${off ? 26 : 18}px;text-align:center">${off ? '◆' : '◇'}<div style="font-size:11px">${dist}m</div></div>`;
    }
    host.score(got * 100); host.status(`${got}/${GOAL} crystals`);
    hud.set(`${bar('Hull', hull_ / 100, '#ff9a3d')}${bar('Energy', energy / 100, '#3dfff0')}
      <div class="row"><span class="pill">💎 ${got}/${GOAL}</span><span class="pill">${Math.round(vel.length() * 10)} m/s</span></div>${marker}
      ${msgT > 0 ? `<div class="hint">${msg}</div>` : t < 10 ? `<div class="hint">${host.touch ? 'Stick steers · THRUST to fly' : 'W thrust · mouse or arrows steer · S brake'}</div>` : ''}
      ${energy < 20 ? '<div class="center" style="color:#ff5a3d;font-size:22px">LOW ENERGY — grab crystals</div>' : ''}`);
    T.render(); input.endFrame();
    if (!done && (hull_ <= 0 || (energy <= 0 && vel.length() < 1))) { done = true; host.end({ won: false, score: got * 100, title: hull_ <= 0 ? 'Hull breached' : 'Adrift', msg: `${got} crystals collected before the mission failed.` }); }
  };
  return makeGame(update, () => { host.el.style.boxShadow = ''; amb.stop(); eng.stop(); input.destroy(); hud.remove(); T.dispose(); });
}
