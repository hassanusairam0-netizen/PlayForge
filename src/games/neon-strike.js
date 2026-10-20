// GAME 01 — NEON STRIKE: first-person arena shooter vs hunter drones.
import { createThree, THREE, mat, glow, box, gridTexture, sparks } from './lib/three-kit.js';
import { createInput, createHud, makeGame, bar, clamp, rand } from './lib/kit.js';

export default function create(host) {
  const T = createThree(host.el, { bg: 0x05061a, fov: 75, fog: [0x05061a, 18, 60] });
  const { scene, camera } = T;
  const input = createInput(host.el, { touch: { stick: true, buttons: [{ label: 'FIRE', key: 'Fire' }, { label: 'JUMP', key: 'Space' }, { label: 'RLD', key: 'KeyR' }] } });
  const hud = createHud(host.el);

  scene.add(new THREE.HemisphereLight(0x6b8cff, 0x100820, 0.7));
  [[0xff3df0, -12, -12], [0x3db8ff, 12, 12], [0x3dffb2, 12, -12], [0xff9a3d, -12, 12]].forEach(([c, x, z]) => { const l = new THREE.PointLight(c, 120, 30); l.position.set(x, 6, z); scene.add(l); });
  const S = 22;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(S * 2, S * 2), new THREE.MeshStandardMaterial({ map: gridTexture('#0a0d26', '#2a4bff', 8, [10, 10]), roughness: 0.4, metalness: 0.6 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const wallM = mat(0x141838, { metalness: 0.7, roughness: 0.3 });
  [[0, -S], [0, S], [-S, 0], [S, 0]].forEach(([x, z], i) => { const w = box(i < 2 ? S * 2 : 1, 6, i < 2 ? 1 : S * 2, wallM, x, 3, z); scene.add(w); const s = box(i < 2 ? S * 2 : 1.05, 0.15, i < 2 ? 1.05 : S * 2, glow(i % 2 ? 0xff3df0 : 0x3db8ff, 3), x, 5.5, z); scene.add(s); });
  const pillars = [];
  [[-8, -8], [8, -8], [-8, 8], [8, 8], [0, -14], [0, 14], [-14, 0], [14, 0], [0, 0]].forEach(([x, z], i) => {
    const w = i === 8 ? 4 : 2.2; const p = box(w, 4, w, wallM, x, 2, z); scene.add(p); pillars.push({ x, z, h: w / 2 + 0.4 });
    scene.add(box(w + 0.05, 0.12, w + 0.05, glow(i % 2 ? 0x3dffb2 : 0xff3df0, 3), x, 3.6, z));
  });

  // Weapon attached to the camera.
  scene.add(camera);
  const gun = new THREE.Group();
  gun.add(box(0.12, 0.14, 0.6, mat(0x2a3050, { metalness: 0.9, roughness: 0.2 })));
  gun.add(box(0.13, 0.03, 0.4, glow(0x3db8ff, 3), 0, 0.085, -0.05));
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: 0x9ff }));
  flash.position.z = -0.35; flash.visible = false; gun.add(flash);
  gun.position.set(0.28, -0.25, -0.5); camera.add(gun);
  const tracerGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const tracer = new THREE.Line(tracerGeo, new THREE.LineBasicMaterial({ color: 0x7fffff })); tracer.frustumCulled = false; scene.add(tracer); tracer.visible = false;
  const fx = sparks(scene, 0xff3df0, 300);

  const P = { x: 0, z: 16, y: 0, vy: 0, yaw: 0, pitch: 0, hp: 100, ammo: 24, reload: 0, cd: 0 };
  const droneGeo = new THREE.IcosahedronGeometry(0.6, 0), eyeGeo = new THREE.SphereGeometry(0.22, 10, 10);
  const drones = [], bolts = [], orbs = [];
  let time = 90, elapsed = 0, spawnT = 1, kills = 0, shots = 0, hits = 0, score = 0, hurtFlash = 0;

  function spawn() {
    const g = new THREE.Group(); const tough = elapsed > 30 && Math.random() < 0.3;
    const body = new THREE.Mesh(droneGeo, mat(tough ? 0x4a2030 : 0x2a2f4a, { metalness: 0.9, roughness: 0.25, flatShading: true }));
    const eye = new THREE.Mesh(eyeGeo, glow(tough ? 0xff9a3d : 0xff3df0, 4)); eye.position.z = 0.5;
    g.add(body, eye); if (tough) g.scale.setScalar(1.3);
    const a = rand(0, Math.PI * 2); g.position.set(Math.cos(a) * 18, rand(1.5, 4), Math.sin(a) * 18);
    g.userData = { hp: tough ? 4 : 2, ph: rand(0, 6), speed: 2 + elapsed / 30 + rand(0, 1), fire: rand(1.5, 3), score: tough ? 250 : 100 };
    scene.add(g); drones.push(g);
  }

  // Aim: pointer lock on desktop, drag on touch.
  const canvas = T.renderer.domElement;
  const lockClick = () => { if (!host.touch && document.pointerLockElement !== canvas) canvas.requestPointerLock?.(); };
  canvas.addEventListener('click', lockClick);
  let lookId = null, lx = 0, ly = 0;
  const td = (e) => { if (e.pointerType === 'mouse' || e.target !== canvas) return; if (e.clientX > host.el.getBoundingClientRect().left + host.el.clientWidth * 0.35) { lookId = e.pointerId; lx = e.clientX; ly = e.clientY; } };
  const tm = (e) => { if (e.pointerId !== lookId) return; P.yaw -= (e.clientX - lx) * 0.006; P.pitch = clamp(P.pitch - (e.clientY - ly) * 0.006, -1.2, 1.2); lx = e.clientX; ly = e.clientY; };
  const tu = (e) => { if (e.pointerId === lookId) lookId = null; };
  canvas.addEventListener('pointerdown', td); canvas.addEventListener('pointermove', tm); window.addEventListener('pointerup', tu);
  const mm = (e) => { if (document.pointerLockElement !== canvas) return; P.yaw -= e.movementX * 0.0022; P.pitch = clamp(P.pitch - e.movementY * 0.0022, -1.3, 1.3); };
  document.addEventListener('mousemove', mm);

  const ray = new THREE.Raycaster(), dir = new THREE.Vector3(), tmp = new THREE.Vector3();
  function shoot() {
    if (P.reload > 0 || P.cd > 0) return;
    if (P.ammo <= 0) { startReload(); return; }
    P.ammo--; P.cd = 0.14; shots++; host.sfx('laser');
    flash.visible = true; setTimeout(() => (flash.visible = false), 40);
    camera.getWorldDirection(dir); ray.set(camera.position, dir);
    const hitList = ray.intersectObjects(drones, true);
    let end = tmp.copy(camera.position).addScaledVector(dir, 40);
    const wallHit = ray.intersectObjects(scene.children.filter((o) => o.isMesh && o !== floor && !drones.includes(o)), false)[0];
    if (hitList[0] && (!wallHit || hitList[0].distance < wallHit.distance)) {
      let d = hitList[0].object; while (!drones.includes(d)) d = d.parent;
      end = hitList[0].point; hits++; d.userData.hp--; fx.burst(end, 10, 6); host.sfx('hit');
      if (d.userData.hp <= 0) {
        kills++; score += d.userData.score + Math.round(time); fx.burst(d.position, 40, 10); host.sfx('explode');
        if (Math.random() < 0.22) { const o = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), glow(0x3dffb2, 3)); o.position.set(d.position.x, 0.6, d.position.z); scene.add(o); orbs.push(o); }
        scene.remove(d); drones.splice(drones.indexOf(d), 1);
      }
    } else if (wallHit) end = wallHit.point;
    const gp = gun.getWorldPosition(new THREE.Vector3());
    tracerGeo.setFromPoints([gp, end]); tracer.visible = true; setTimeout(() => (tracer.visible = false), 50);
  }
  const startReload = () => { if (P.reload > 0 || P.ammo === 24) return; P.reload = 1.2; host.sfx('reload'); };

  function collide() {
    const R = 0.5;
    P.x = clamp(P.x, -S + 1.2, S - 1.2); P.z = clamp(P.z, -S + 1.2, S - 1.2);
    for (const p of pillars) {
      const dx = P.x - p.x, dz = P.z - p.z, ox = p.h + R - Math.abs(dx), oz = p.h + R - Math.abs(dz);
      if (ox > 0 && oz > 0) { if (ox < oz) P.x += Math.sign(dx) * ox; else P.z += Math.sign(dz) * oz; }
    }
  }

  const update = (dt, t) => {
    elapsed += dt; time -= dt;
    const ax = input.axis();
    const fwd = new THREE.Vector3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)), right = new THREE.Vector3(Math.cos(P.yaw), 0, -Math.sin(P.yaw));
    const sp = 7;
    P.x += (fwd.x * ax.y + right.x * ax.x) * sp * dt; P.z += (fwd.z * ax.y + right.z * ax.x) * sp * dt;
    if (input.pressed('Space') && P.y === 0) { P.vy = 6; host.sfx('jump'); }
    P.vy -= 18 * dt; P.y = Math.max(0, P.y + P.vy * dt); if (P.y === 0) P.vy = 0;
    collide();
    if (!host.touch && input.down('ArrowLeft')) P.yaw += 2 * dt;
    if (!host.touch && input.down('ArrowRight')) P.yaw -= 2 * dt;
    camera.position.set(P.x, 1.6 + P.y + Math.sin(t * 10) * 0.03 * Math.hypot(ax.x, ax.y), P.z);
    camera.rotation.set(P.pitch, P.yaw, 0, 'YXZ');

    P.cd -= dt;
    if (P.reload > 0) { P.reload -= dt; gun.rotation.x = Math.sin(P.reload * Math.PI / 1.2) * 0.8; if (P.reload <= 0) { P.ammo = 24; gun.rotation.x = 0; } }
    if (input.pressed('KeyR')) startReload();
    const firing = input.down('Fire') || (document.pointerLockElement === canvas && input.pointer.down);
    if (firing) shoot();

    spawnT -= dt;
    const maxD = 3 + Math.floor(elapsed / 15);
    if (spawnT <= 0 && drones.length < maxD) { spawn(); spawnT = Math.max(0.6, 2.4 - elapsed / 40); }
    for (const d of drones) {
      const u = d.userData; u.ph += dt;
      const to = new THREE.Vector3(P.x - d.position.x, 0, P.z - d.position.z); const dist = to.length(); to.normalize();
      const side = new THREE.Vector3(-to.z, 0, to.x).multiplyScalar(Math.sin(u.ph * 1.3) * 1.5);
      if (dist > 6) d.position.addScaledVector(to, u.speed * dt); else d.position.addScaledVector(to, -u.speed * 0.5 * dt);
      d.position.addScaledVector(side, dt * u.speed * 0.6);
      d.position.y = 2 + Math.sin(u.ph * 2) * 1;
      d.position.x = clamp(d.position.x, -S + 1, S - 1); d.position.z = clamp(d.position.z, -S + 1, S - 1);
      d.lookAt(camera.position);
      u.fire -= dt;
      if (u.fire <= 0 && dist < 22) {
        u.fire = Math.max(1.1, 3 - elapsed / 40) + rand(0, 1);
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), glow(0xff3d3d, 4)); b.position.copy(d.position);
        b.userData.v = new THREE.Vector3(P.x, 1.4 + P.y, P.z).sub(d.position).normalize().multiplyScalar(9 + elapsed / 15);
        scene.add(b); bolts.push(b);
      }
    }
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i]; b.position.addScaledVector(b.userData.v, dt); b.userData.life = (b.userData.life || 0) + dt;
      if (b.position.distanceTo(new THREE.Vector3(P.x, 1.4 + P.y, P.z)) < 0.7) { P.hp -= 9; hurtFlash = 0.3; host.sfx('hurt'); scene.remove(b); bolts.splice(i, 1); continue; }
      if (b.userData.life > 4) { scene.remove(b); bolts.splice(i, 1); }
    }
    for (let i = orbs.length - 1; i >= 0; i--) {
      const o = orbs[i]; o.rotation.y += dt * 3;
      if (Math.hypot(o.position.x - P.x, o.position.z - P.z) < 1.2) { P.hp = Math.min(100, P.hp + 25); host.sfx('coin'); scene.remove(o); orbs.splice(i, 1); }
    }
    fx.update(dt);
    hurtFlash = Math.max(0, hurtFlash - dt);
    host.el.style.boxShadow = hurtFlash > 0 ? 'inset 0 0 80px #ff2030' : '';

    host.score(score); host.status(`${Math.max(0, Math.ceil(time))}s left`);
    const acc = shots ? Math.round((hits / shots) * 100) : 0;
    hud.set(`${bar('Health', P.hp / 100, P.hp > 30 ? '#3dffb2' : '#ff3d3d')}
      <div class="row"><span class="pill">⏱ ${Math.max(0, Math.ceil(time))}</span><span class="pill">Kills ${kills}</span><span class="pill">Acc ${acc}%</span></div>
      <div class="crosshair"></div>
      <div class="hint" style="bottom:auto;top:0;left:auto;right:0;transform:none">${P.reload > 0 ? 'RELOADING…' : `AMMO ${P.ammo} / 24`}</div>
      ${!host.touch && document.pointerLockElement !== canvas ? '<div class="hint">Click the arena to lock aim</div>' : ''}`);
    T.render();
    input.endFrame();

    if (P.hp <= 0) host.end({ won: false, score, title: 'Systems down', msg: `You destroyed ${kills} drones with ${acc}% accuracy before going offline.` });
    else if (time <= 0) host.end({ won: true, score: score + P.hp * 5 + acc * 5, title: 'Arena cleared', msg: `${kills} drones destroyed · ${acc}% accuracy · health bonus +${P.hp * 5}` });
  };

  return makeGame(update, () => {
    canvas.removeEventListener('click', lockClick); document.removeEventListener('mousemove', mm);
    canvas.removeEventListener('pointerdown', td); canvas.removeEventListener('pointermove', tm); window.removeEventListener('pointerup', tu);
    host.el.style.boxShadow = ''; input.destroy(); hud.remove(); T.dispose();
  });
}
