// GAME 02 — SHADOW OPS: third-person stealth. Hack three terminals, avoid patrol vision cones, extract.
import { createThree, THREE, mat, glow, box, lights, canvasTexture } from './lib/three-kit.js';
import { createInput, createHud, makeGame, bar, clamp } from './lib/kit.js';

const W = 44, H = 32;
// Crates / walls as [x, z, w, d, h]
const BLOCKS = [
  [-14, -8, 6, 2, 2], [-14, 4, 2, 8, 2.5], [-4, -10, 2, 6, 2], [-4, 6, 8, 2, 2], [6, -4, 2, 10, 3], [12, 8, 6, 2, 2],
  [14, -10, 4, 4, 2.5], [0, 0, 3, 3, 1.4], [-10, 12, 4, 2, 1.4], [18, 2, 2, 6, 2], [-8, -2, 2, 2, 1.4],
];
const TERMINALS = [[-17, 9], [9, -12], [19, 12]];
const EXIT = [-19, -2];
const PATROLS = [
  [[-10, -5], [3, -5], [3, 3], [-10, 3]],
  [[-18, 14.5], [4, 14.5], [4, 9.5], [-18, 9.5]],
  [[8, -14], [20, -14], [20, 14], [8, 14]],
  [[-19, -14], [-8, -14], [-8, -6], [-19, -6]],
];

export default function create(host) {
  const T = createThree(host.el, { bg: 0x0d120f, fov: 50, fog: [0x0d120f, 30, 70], shadows: true });
  const { scene, camera } = T;
  const input = createInput(host.el, { touch: { stick: true, buttons: [{ label: 'HACK', key: 'KeyE' }, { label: 'RUN', key: 'ShiftLeft' }] } });
  const hud = createHud(host.el);
  lights(scene, { hemi: [0xb8d8c8, 0x303830, 1.3], sun: [0xffe8c8, 1.6], pos: [-10, 30, 10], shadow: true, size: 30 });

  const concrete = canvasTexture(256, 256, (g, s) => { g.fillStyle = '#3a423c'; g.fillRect(0, 0, s, s); for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.06})`; g.fillRect(Math.random() * s, Math.random() * s, 3, 3); } g.strokeStyle = '#2a302b'; g.lineWidth = 3; g.strokeRect(0, 0, s, s); }, [W / 4, H / 4]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: concrete, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wallM = mat(0x3a453e);
  [[-12, -6], [10, 6], [-6, 10], [14, -10]].forEach(([x, z]) => { const l = new THREE.PointLight(0xffd8a0, 40, 18); l.position.set(x, 5, z); scene.add(l); });
  [[0, -H / 2, W, 1], [0, H / 2, W, 1], [-W / 2, 0, 1, H], [W / 2, 0, 1, H]].forEach(([x, z, w, d]) => scene.add(box(w, 4, d, wallM, x, 2, z)));
  const crateM = mat(0x6a5a3a, { roughness: 0.8 }), steelM = mat(0x4a5560, { metalness: 0.6, roughness: 0.4 });
  BLOCKS.forEach(([x, z, w, d, h], i) => { const b = box(w, h, d, i % 3 ? crateM : steelM, x, h / 2, z); b.castShadow = b.receiveShadow = true; scene.add(b); });
  const blocks = BLOCKS.map(([x, z, w, d]) => ({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 }));

  // Player
  const player = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.8, 4, 10), mat(0x4a7a5a)); body.position.y = 0.75; body.castShadow = true;
  const visor = box(0.45, 0.12, 0.2, glow(0x9bff5a, 3), 0, 1.25, 0.25);
  player.add(body, visor); scene.add(player);
  const P = { x: 13, z: -4, hp: 100, a: 0 };

  // Terminals with objective beacons
  const terms = TERMINALS.map(([x, z]) => {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    g.add(box(0.8, 1.2, 0.5, steelM, 0, 0.6, 0));
    const screen = box(0.6, 0.4, 0.05, glow(0x3dd8ff, 2), 0, 0.95, 0.27); g.add(screen);
    const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), glow(0x3dd8ff, 3)); beacon.position.y = 2.4; g.add(beacon);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3, 6), new THREE.MeshBasicMaterial({ color: 0x3dd8ff, transparent: true, opacity: 0.4 })); beam.position.y = 1.5; g.add(beam);
    scene.add(g); return { g, screen, beacon, beam, x, z, prog: 0, done: false };
  });
  const exitPad = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.1, 32), glow(0x2a4a2a, 0.3)); exitPad.position.set(EXIT[0], 0.05, EXIT[1]); scene.add(exitPad);

  // Patrol bots with floor vision cones
  const RANGE = 8, HALF = 0.6;
  const bots = PATROLS.map((path, i) => {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), mat(0x3a3f48, { metalness: 0.7, roughness: 0.3 })); b.position.y = 1; b.castShadow = true;
    const eye = box(0.5, 0.12, 0.1, glow(0xff3030, 3), 0, 1.05, 0.5);
    g.add(b, eye);
    const coneGeo = new THREE.CircleGeometry(RANGE, 24, -HALF + Math.PI / 2, HALF * 2);
    const cone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.18, depthWrite: false }));
    cone.rotation.x = -Math.PI / 2; cone.position.y = 0.04; g.add(cone);
    g.position.set(path[0][0], 0, path[0][1]); scene.add(g);
    return { g, cone, path, wp: 1, a: 0, alert: 0, look: 0, speed: 2.2 + i * 0.2 };
  });

  const segBlocked = (ax, az, bx, bz) => {
    for (const r of blocks) {
      let t0 = 0, t1 = 1; const dx = bx - ax, dz = bz - az;
      const clip = (p, q) => { if (p === 0) return q >= 0; const r2 = q / p; if (p < 0) { if (r2 > t1) return false; if (r2 > t0) t0 = r2; } else { if (r2 < t0) return false; if (r2 < t1) t1 = r2; } return true; };
      if (clip(-dx, ax - r.x0) && clip(dx, r.x1 - ax) && clip(-dz, az - r.z0) && clip(dz, r.z1 - az) && t0 <= t1) return true;
    }
    return false;
  };
  const collide = (o, R) => {
    o.x = clamp(o.x, -W / 2 + 1, W / 2 - 1); o.z = clamp(o.z, -H / 2 + 1, H / 2 - 1);
    for (const r of blocks) {
      const cx = clamp(o.x, r.x0, r.x1), cz = clamp(o.z, r.z0, r.z1), dx = o.x - cx, dz = o.z - cz, d = Math.hypot(dx, dz);
      if (d < R) { if (d === 0) { o.x += R; continue; } o.x += (dx / d) * (R - d); o.z += (dz / d) * (R - d); }
    }
  };

  let time = 0, detect = 0, alarm = 0, hacked = 0, done = false;
  const update = (dt, t) => {
    time += dt;
    const ax = input.axis(), sprint = input.down('ShiftLeft', 'ShiftRight');
    const sp = sprint ? 6 : 3.4, mv = Math.hypot(ax.x, ax.y);
    if (mv > 0.05) { P.x += ax.x * sp * dt; P.z -= ax.y * sp * dt; P.a = Math.atan2(ax.x, -ax.y); }
    collide(P, 0.45);
    player.position.set(P.x, 0, P.z); player.rotation.y += (((P.a - player.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, dt * 12);
    body.position.y = 0.75 + (mv > 0.05 ? Math.abs(Math.sin(t * (sprint ? 14 : 9))) * 0.08 : 0);

    // Bots
    let seen = false;
    for (const b of bots) {
      const tgt = b.path[b.wp], dx = tgt[0] - b.g.position.x, dz = tgt[1] - b.g.position.z, d = Math.hypot(dx, dz);
      const px = P.x - b.g.position.x, pz = P.z - b.g.position.z, pd = Math.hypot(px, pz);
      if (alarm > 0 && pd < 14 && !segBlocked(b.g.position.x, b.g.position.z, P.x, P.z)) {
        b.a = Math.atan2(px, pz); if (pd > 3) { b.g.position.x += px / pd * b.speed * 1.4 * dt; b.g.position.z += pz / pd * b.speed * 1.4 * dt; }
        b.shoot = (b.shoot || 0) - dt; if (b.shoot <= 0) { b.shoot = 0.6; P.hp -= 7; host.sfx('shoot'); }
      } else if (b.look > 0) { b.look -= dt; b.a += (b.lookA - b.a) * Math.min(1, dt * 4); }
      else {
        if (d < 0.2) b.wp = (b.wp + 1) % b.path.length;
        else { b.g.position.x += dx / d * b.speed * dt; b.g.position.z += dz / d * b.speed * dt; const ta = Math.atan2(dx, dz); b.a += ((((ta - b.a) + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, dt * 5); }
      }
      b.g.rotation.y = b.a;
      // Noise: sprinting near a bot makes it turn.
      if (sprint && mv > 0.1 && pd < 5.5 && b.look <= 0) { b.look = 1.5; b.lookA = Math.atan2(px, pz); }
      const ang = Math.abs((((Math.atan2(px, pz) - b.a) + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      const inCone = pd < RANGE && ang < HALF && !segBlocked(b.g.position.x, b.g.position.z, P.x, P.z);
      b.cone.material.color.setHex(inCone || alarm > 0 ? 0xff2020 : 0xffaa20);
      b.cone.material.opacity = inCone ? 0.35 : 0.16;
      if (inCone) { seen = true; detect += dt * (1.6 - pd / RANGE) * 70; }
    }
    if (!seen) detect = Math.max(0, detect - dt * 25);
    if (detect >= 100 && alarm <= 0) { alarm = 6; host.sfx('error'); }
    if (alarm > 0) { alarm -= dt; if (alarm <= 0) detect = 40; }

    // Hacking
    const hackKey = input.down('KeyE');
    let near = null;
    for (const tm of terms) {
      tm.beacon.rotation.y += dt * 2; tm.beacon.position.y = 2.4 + Math.sin(t * 3) * 0.15;
      if (tm.done) continue;
      if (Math.hypot(P.x - tm.x, P.z - tm.z) < 1.7) { near = tm; if (hackKey) { tm.prog += dt / 2.2; if (Math.floor(tm.prog * 10) !== Math.floor((tm.prog - dt / 2.2) * 10)) host.sfx('blip', 500 + tm.prog * 600); } }
      else tm.prog = Math.max(0, tm.prog - dt);
      if (tm.prog >= 1) {
        tm.done = true; hacked++; host.sfx('success');
        [tm.screen, tm.beacon].forEach((m) => { m.material.color.setHex(0x9bff5a); m.material.emissive.setHex(0x9bff5a); });
        tm.beam.material.color.setHex(0x9bff5a);
        if (hacked === 3) { exitPad.material.color.setHex(0x9bff5a); exitPad.material.emissive.setHex(0x9bff5a); exitPad.material.emissiveIntensity = 2; }
      }
    }
    if (hacked === 3) exitPad.scale.setScalar(1 + Math.sin(t * 4) * 0.05);

    camera.position.lerp(new THREE.Vector3(P.x, 15, P.z + 11), 1 - Math.exp(-dt * 4)); camera.lookAt(P.x, 0, P.z - 1);

    const score = Math.max(100, Math.round(4000 - time * 12 + P.hp * 10 + hacked * 500));
    host.score(hacked * 500); host.status(alarm > 0 ? 'ALARM!' : `${hacked}/3 terminals`);
    const objective = hacked < 3 ? `Hack terminals (${hacked}/3)` : 'Reach the green extraction zone';
    hud.set(`${bar('Health', P.hp / 100, '#9bff5a')}${bar('Detect', detect / 100, alarm > 0 ? '#ff2020' : '#ffaa20')}
      <div class="row"><span class="pill">◆ ${objective}</span><span class="pill">⏱ ${time.toFixed(0)}s</span></div>
      ${alarm > 0 ? '<div class="center" style="color:#ff4040">⚠ SPOTTED — BREAK LINE OF SIGHT</div>' : ''}
      ${near ? `<div class="hint">${hackKey ? `Hacking… ${Math.round(near.prog * 100)}%` : host.touch ? 'Hold HACK' : 'Hold E to hack'}</div>` : ''}`);
    T.render(); input.endFrame();

    if (!done && P.hp <= 0) { done = true; host.end({ won: false, score: hacked * 500, title: 'Operative down', msg: `You hacked ${hacked} of 3 terminals.` }); }
    if (!done && hacked === 3 && Math.hypot(P.x - EXIT[0], P.z - EXIT[1]) < 1.6) { done = true; host.end({ won: true, score, title: 'Extraction complete', msg: `Mission time ${time.toFixed(1)}s with ${Math.max(0, Math.round(P.hp))}% health.` }); }
  };
  return makeGame(update, () => { input.destroy(); hud.remove(); T.dispose(); });
}
