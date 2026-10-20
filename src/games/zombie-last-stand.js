// GAME 03 — ZOMBIE LAST STAND: wave survival shooter in a dark city crossroads.
import { createThree, THREE, mat, glow, box, sparks } from './lib/three-kit.js';
import { createInput, createHud, makeGame, bar, clamp, rand, pick } from './lib/kit.js';

export default function create(host) {
  const T = createThree(host.el, { bg: 0x07050a, fov: 50, fog: [0x07050a, 25, 55] });
  const { scene, camera } = T;
  const input = createInput(host.el, { touch: { stick: true, stick2: true, buttons: [{ label: 'RLD', key: 'KeyR' }] } });
  const hud = createHud(host.el);
  scene.add(new THREE.HemisphereLight(0x4a5a8a, 0x100808, 0.35));
  const moon = new THREE.DirectionalLight(0x8aa0ff, 0.5); moon.position.set(-10, 20, -5); scene.add(moon);

  const L = 18;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mat(0x1a1616, { roughness: 1 })); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const road = mat(0x23202a, { roughness: 0.9 });
  scene.add(box(80, 0.02, 8, road, 0, 0.01, 0), box(8, 0.02, 80, road, 0, 0.01, 0));
  for (let i = -8; i <= 8; i++) if (Math.abs(i) > 1) { scene.add(box(1.2, 0.03, 0.15, mat(0xc8b060), i * 2.4, 0.02, 0)); scene.add(box(0.15, 0.03, 1.2, mat(0xc8b060), 0, 0.02, i * 2.4)); }
  // Buildings in the four quadrants
  const bM = [mat(0x2a2228), mat(0x22262e), mat(0x2e2620)];
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    for (let i = 0; i < 3; i++) {
      const h = rand(5, 14), x = sx * (8 + i * 4.5), z = sz * rand(9, 14);
      scene.add(box(4, h, 6, pick(bM), x, h / 2, z));
      for (let k = 0; k < 4; k++) if (Math.random() < 0.4) scene.add(box(0.8, 0.8, 0.05, glow(0xffb84a, 0.8), x + rand(-1.2, 1.2), rand(1.5, h - 1), z - sz * 3.03));
    }
  });
  // Street lights + barricade debris
  [[-5, -5], [5, 5], [5, -5], [-5, 5]].forEach(([x, z]) => {
    scene.add(box(0.15, 4, 0.15, mat(0x333333), x, 2, z));
    const l = new THREE.PointLight(0xffc070, 30, 14); l.position.set(x, 4, z); scene.add(l);
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), glow(0xffc070, 3)).translateX(x).translateY(4).translateZ(z));
  });
  const carM = [mat(0x5a1a1a), mat(0x1a3a5a)];
  [[-3, 6, 0.3], [4, -7, 1.2], [-8, -2.5, 1.6]].forEach(([x, z, r], i) => { const c = box(2, 1, 4, carM[i % 2], x, 0.5, z); c.rotation.y = r; scene.add(c); });
  const obst = [[-3, 6, 1.6], [4, -7, 1.6], [-8, -2.5, 1.6]];

  // Player
  const player = new THREE.Group();
  const pb = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.8, 4, 10), mat(0x3a5a8a)); pb.position.y = 0.8;
  const gunM = box(0.12, 0.12, 0.7, mat(0x222222), 0.25, 1, 0.45);
  player.add(pb, gunM); scene.add(player);
  const flashlight = new THREE.SpotLight(0xfff0d0, 60, 20, 0.5, 0.5); flashlight.position.set(0, 1.2, 0); player.add(flashlight); player.add(flashlight.target); flashlight.target.position.set(0, 0, 6);
  const P = { x: 0, z: 0, hp: 100, aim: 0, mag: 30, reserve: 90, reload: 0, cd: 0 };

  const zGeo = new THREE.CapsuleGeometry(0.35, 0.9, 4, 8), headGeo = new THREE.SphereGeometry(0.28, 8, 8), eyeGeo = new THREE.SphereGeometry(0.05, 4, 4);
  const zombies = [], crates = [], bullets = [];
  const fx = sparks(scene, 0x8a1a1a, 300);
  let wave = 0, toSpawn = 0, spawnT = 0, breakT = 2, kills = 0, score = 0, mult = 1, streakT = 0, done = false;

  function spawnZombie() {
    const type = wave >= 5 && Math.random() < 0.25 ? 'runner' : wave >= 3 && Math.random() < 0.2 ? 'brute' : 'walker';
    const g = new THREE.Group();
    const col = type === 'brute' ? 0x5a6a3a : type === 'runner' ? 0x7a8a5a : 0x4b7a52;
    const b = new THREE.Mesh(zGeo, mat(col)); b.position.y = 0.8; g.add(b);
    const h = new THREE.Mesh(headGeo, mat(0x6a8a5a)); h.position.y = 1.65; g.add(h);
    [-0.1, 0.1].forEach((x) => { const e = new THREE.Mesh(eyeGeo, glow(0xff2a1a, 4)); e.position.set(x, 1.7, 0.25); g.add(e); });
    const arms = box(0.9, 0.15, 0.15, mat(col), 0, 1.25, 0.35); g.add(arms);
    if (type === 'brute') g.scale.setScalar(1.45);
    const side = Math.floor(Math.random() * 4), off = rand(-3, 3);
    const pos = [[off, -L - 6], [off, L + 6], [-L - 6, off], [L + 6, off]][side];
    g.position.set(pos[0], 0, pos[1]); scene.add(g);
    g.userData = { type, hp: type === 'brute' ? 6 : type === 'runner' ? 1 : 2, speed: (type === 'runner' ? 3.6 : type === 'brute' ? 1.2 : 1.6) + wave * 0.08, ph: rand(0, 6), pts: type === 'brute' ? 300 : type === 'runner' ? 150 : 100 };
    zombies.push(g);
  }

  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1), hit = new THREE.Vector3();
  function fire() {
    if (P.reload > 0 || P.cd > 0) return;
    if (P.mag <= 0) { reload(); return; }
    P.mag--; P.cd = 0.11; host.sfx('shoot');
    const dx = Math.sin(P.aim) + rand(-0.04, 0.04), dz = Math.cos(P.aim) + rand(-0.04, 0.04);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 4, 4), glow(0xffe08a, 4));
    m.position.set(P.x + dx * 0.8, 1, P.z + dz * 0.8); m.userData = { vx: dx * 40, vz: dz * 40, life: 0.6 };
    scene.add(m); bullets.push(m);
  }
  function reload() { if (P.reload > 0 || P.mag === 30 || P.reserve <= 0) return; P.reload = 1.4; host.sfx('reload'); }

  const update = (dt, t) => {
    // Waves
    if (toSpawn === 0 && zombies.length === 0) {
      breakT -= dt;
      if (breakT <= 0) { wave++; toSpawn = 5 + wave * 4; breakT = 4; host.sfx('blip', 300); }
    }
    spawnT -= dt;
    if (toSpawn > 0 && spawnT <= 0) { spawnZombie(); toSpawn--; spawnT = Math.max(0.25, 1.4 - wave * 0.1); }

    // Movement
    const ax = input.axis();
    P.x = clamp(P.x + ax.x * 6 * dt, -L, L); P.z = clamp(P.z - ax.y * 6 * dt, -L, L);
    if (Math.abs(P.x) > 3.6 && Math.abs(P.z) > 3.6) { if (Math.abs(P.x) < Math.abs(P.z)) P.x = Math.sign(P.x) * 3.6; else P.z = Math.sign(P.z) * 3.6; }
    for (const [ox, oz, r] of obst) { const dx = P.x - ox, dz = P.z - oz, d = Math.hypot(dx, dz); if (d < r + 0.4) { P.x = ox + dx / d * (r + 0.4); P.z = oz + dz / d * (r + 0.4); } }
    player.position.set(P.x, 0, P.z);

    // Aim
    let firing = false;
    if (input.stick2.active) { if (Math.hypot(input.stick2.x, input.stick2.y) > 0.3) { P.aim = Math.atan2(input.stick2.x, -input.stick2.y); firing = true; } }
    else {
      ray.setFromCamera({ x: input.pointer.nx, y: input.pointer.ny }, camera);
      if (ray.ray.intersectPlane(plane, hit)) P.aim = Math.atan2(hit.x - P.x, hit.z - P.z);
      firing = input.pointer.down && !host.touch;
    }
    player.rotation.y = P.aim;
    P.cd -= dt;
    if (P.reload > 0) { P.reload -= dt; if (P.reload <= 0) { const n = Math.min(30 - P.mag, P.reserve); P.mag += n; P.reserve -= n; } }
    if (input.pressed('KeyR')) reload();
    if (firing) fire();

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i], u = b.userData; b.position.x += u.vx * dt; b.position.z += u.vz * dt; u.life -= dt;
      let gone = u.life <= 0;
      for (const z of zombies) {
        if (gone) break;
        const r = z.userData.type === 'brute' ? 0.8 : 0.55;
        if (Math.hypot(z.position.x - b.position.x, z.position.z - b.position.z) < r) {
          gone = true; z.userData.hp--; fx.burst(b.position, 8, 4); z.position.x += u.vx * 0.004; z.position.z += u.vz * 0.004;
          if (z.userData.hp <= 0) {
            kills++; streakT = 2; mult = Math.min(5, mult + 0.25); score += Math.round(z.userData.pts * Math.floor(mult)); host.sfx('hit');
            if (Math.random() < (P.reserve < 15 ? 0.5 : 0.18)) { const c = box(0.6, 0.4, 0.6, glow(0x3dff8a, 0.8), z.position.x, 0.2, z.position.z); scene.add(c); crates.push(c); }
            scene.remove(z); zombies.splice(zombies.indexOf(z), 1);
          }
        }
      }
      if (gone) { scene.remove(b); bullets.splice(i, 1); }
    }
    streakT -= dt; if (streakT <= 0) mult = Math.max(1, mult - dt);

    let hurt = false;
    for (const z of zombies) {
      const u = z.userData; u.ph += dt * u.speed * 3;
      const dx = P.x - z.position.x, dz = P.z - z.position.z, d = Math.hypot(dx, dz);
      // Simple separation so the horde spreads out.
      for (const o of zombies) { if (o === z) continue; const ex = z.position.x - o.position.x, ez = z.position.z - o.position.z, e = Math.hypot(ex, ez); if (e < 0.9 && e > 0) { z.position.x += ex / e * dt; z.position.z += ez / e * dt; } }
      if (d > 0.9) { z.position.x += dx / d * u.speed * dt; z.position.z += dz / d * u.speed * dt; }
      else { P.hp -= (u.type === 'brute' ? 30 : 14) * dt; hurt = true; }
      z.rotation.y = Math.atan2(dx, dz); z.rotation.z = Math.sin(u.ph) * 0.12;
    }
    if (hurt) { mult = 1; if (Math.random() < dt * 4) host.sfx('hurt'); }
    host.el.style.boxShadow = hurt ? 'inset 0 0 90px #a00' : '';
    for (let i = crates.length - 1; i >= 0; i--) { const c = crates[i]; c.rotation.y += dt; if (Math.hypot(c.position.x - P.x, c.position.z - P.z) < 1) { P.reserve += 30; P.hp = Math.min(100, P.hp + 10); host.sfx('coin'); scene.remove(c); crates.splice(i, 1); } }
    fx.update(dt);

    camera.position.lerp(new THREE.Vector3(P.x, 17, P.z + 10), 1 - Math.exp(-dt * 5)); camera.lookAt(P.x, 0, P.z);

    host.score(score); host.status(`Wave ${wave}`);
    const between = toSpawn === 0 && zombies.length === 0 && wave > 0;
    hud.set(`${bar('Health', P.hp / 100, '#ff5a3d')}
      <div class="row"><span class="pill">Wave ${wave}</span><span class="pill">Kills ${kills}</span><span class="pill" style="color:#ffd23d">x${Math.floor(mult)} streak</span><span class="pill">${P.reload > 0 ? 'Reloading…' : `Ammo ${P.mag} / ${P.reserve}`}</span></div>
      ${between || wave === 0 ? `<div class="center">${wave === 0 ? 'Get ready…' : `Wave ${wave} cleared!`}<br><small style="font-size:16px">Next wave in ${Math.ceil(breakT)}</small></div>` : ''}
      ${P.mag === 0 && P.reserve === 0 ? '<div class="hint">Out of ammo — grab green crates!</div>' : ''}`);
    T.render(); input.endFrame();

    if (!done && P.hp <= 0) { done = true; host.end({ won: wave > 10, score, title: 'Overrun', msg: `You survived ${wave - 1} full waves and dropped ${kills} zombies.` }); }
    if (!done && wave > 10) { done = true; host.end({ won: true, score: score + Math.round(P.hp) * 20, title: 'Dawn breaks', msg: `All 10 waves survived with ${kills} kills.` }); }
  };
  return makeGame(update, () => { host.el.style.boxShadow = ''; input.destroy(); hud.remove(); T.dispose(); });
}
