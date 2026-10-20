// GAME 24 — PET WORLD: explore a pastel valley, find treats and befriend twelve creatures of varying rarity.
import { createThree, THREE, mat, glow, box, lights } from './lib/three-kit.js';
import { createInput, createHud, makeGame, clamp, rand } from './lib/kit.js';

const PETS = [
  { name: 'Puffle', rarity: 'Common', color: 0xffd23d, ears: 'round', treats: 0 }, { name: 'Mossy', rarity: 'Common', color: 0x9aff8a, ears: 'leaf', treats: 0 },
  { name: 'Bloop', rarity: 'Common', color: 0x9ad8ff, ears: 'round', treats: 0 }, { name: 'Pinky', rarity: 'Common', color: 0xff9ad8, ears: 'long', treats: 0 },
  { name: 'Toffee', rarity: 'Common', color: 0xd8a86a, ears: 'long', treats: 0 }, { name: 'Snowbun', rarity: 'Common', color: 0xffffff, ears: 'long', treats: 0 },
  { name: 'Ember', rarity: 'Rare', color: 0xff6b3d, ears: 'horn', treats: 1 }, { name: 'Glimmer', rarity: 'Rare', color: 0xb49aff, ears: 'horn', treats: 1 },
  { name: 'Coral', rarity: 'Rare', color: 0xff7a8a, ears: 'leaf', treats: 1 }, { name: 'Nimbus', rarity: 'Rare', color: 0xc8e8ff, ears: 'round', treats: 1 },
  { name: 'Aurora', rarity: 'Legendary', color: 0x3dfff0, ears: 'horn', treats: 2 }, { name: 'Solstice', rarity: 'Legendary', color: 0xffb23d, ears: 'horn', treats: 2 },
];
const RCOL = { Common: '#9aa3c0', Rare: '#b49aff', Legendary: '#ffd23d' };
const H = (x, z) => 2.2 * Math.sin(x * 0.06) * Math.cos(z * 0.05) + 1.2 * Math.sin(x * 0.13 + z * 0.1) + (Math.hypot(x, z) > 50 ? (Math.hypot(x, z) - 50) * 0.6 : 0);

function makePet(p) {
  const g = new THREE.Group(), m = mat(p.color, { roughness: 0.5 }), body = new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 16), m);
  body.scale.set(1, 0.85, 1); body.position.y = 0.6; g.add(body);
  const eyeM = mat(0x1a1a22), cheekM = mat(0xff7ab8);
  [-0.22, 0.22].forEach((x) => { g.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeM).translateX(x).translateY(0.72).translateZ(0.52)); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), cheekM).translateX(x * 1.6).translateY(0.58).translateZ(0.47)); });
  [-0.3, 0.3].forEach((x) => {
    let e;
    if (p.ears === 'long') { e = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.5, 4, 8), m); e.position.set(x, 1.3, 0); e.rotation.z = -x; }
    else if (p.ears === 'horn') { e = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 8), glow(p.color, 0.8)); e.position.set(x, 1.25, 0); e.rotation.z = -x * 0.8; }
    else if (p.ears === 'leaf') { e = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), mat(0x4ac85a)); e.scale.set(0.5, 1, 0.3); e.position.set(x, 1.2, 0); e.rotation.z = -x * 2; }
    else { e = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), m); e.position.set(x * 1.3, 1.08, 0); }
    g.add(e);
  });
  if (p.rarity !== 'Common') { const aura = new THREE.Mesh(new THREE.RingGeometry(0.8, 0.95, 32), new THREE.MeshBasicMaterial({ color: p.rarity === 'Legendary' ? 0xffd23d : 0xb49aff, transparent: true, opacity: 0.6, side: THREE.DoubleSide })); aura.rotation.x = -Math.PI / 2; aura.position.y = 0.05; g.add(aura); g.userData.aura = aura; }
  g.traverse((o) => (o.castShadow = true));
  return g;
}

export default function create(host) {
  const T = createThree(host.el, { bg: 0xffe8f6, fov: 55, fog: [0xffe8f6, 40, 120], shadows: true });
  const { scene, camera } = T;
  const input = createInput(host.el, { touch: { stick: true, buttons: [{ label: 'BEFRIEND', key: 'KeyE' }, { label: 'BOOK', key: 'KeyB' }] } });
  const hud = createHud(host.el);
  lights(scene, { hemi: [0xfff0ff, 0xa8f0a8, 1], sun: [0xfff4e8, 1.4], pos: [20, 40, 10], shadow: true, size: 30 });
  const geo = new THREE.PlaneGeometry(160, 160, 100, 100); geo.rotateX(-Math.PI / 2);
  const gp = geo.attributes.position, gc = new Float32Array(gp.count * 3), c = new THREE.Color();
  for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), z = gp.getZ(i), y = H(x, z); gp.setY(i, y); c.setHSL(0.3 + Math.sin(x * 0.05) * 0.05 + y * 0.004, 0.55, 0.7 - y * 0.01); gc.set([c.r, c.g, c.b], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(gc, 3)); geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })); ground.receiveShadow = true; scene.add(ground);
  const pond = new THREE.Mesh(new THREE.CircleGeometry(9, 40), mat(0x9ad8ff, { roughness: 0.1, transparent: true, opacity: 0.85 })); pond.rotation.x = -Math.PI / 2; pond.position.set(18, H(18, -14) + 0.25, -14); scene.add(pond);
  // Candy-coloured trees, flowers, mushrooms
  const treeCols = [0xff9ad8, 0xffd8a8, 0xb49aff, 0x9affd8];
  for (let i = 0; i < 70; i++) { const x = rand(-55, 55), z = rand(-55, 55); if (Math.hypot(x, z) < 6 || Math.hypot(x - 18, z + 14) < 10) continue; const y = H(x, z); const tr = new THREE.Group(); tr.position.set(x, y, z); tr.add(box(0.3, 2, 0.3, mat(0xa87a5a), 0, 1, 0)); const cr = new THREE.Mesh(new THREE.SphereGeometry(rand(1.2, 1.8), 12, 10), mat(treeCols[i % 4], { roughness: 0.8 })); cr.position.y = 2.6; tr.add(cr); tr.traverse((o) => (o.castShadow = true)); scene.add(tr); }
  for (let i = 0; i < 120; i++) { const x = rand(-55, 55), z = rand(-55, 55); const f = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), mat([0xffffff, 0xffd23d, 0xff6bd0, 0x6bd0ff][i % 4], { emissive: 0x222222 })); f.position.set(x, H(x, z) + 0.15, z); scene.add(f); }
  const shroom = (x, z) => { const g = new THREE.Group(); g.position.set(x, H(x, z), z); g.add(box(0.3, 0.6, 0.3, mat(0xfff0e0), 0, 0.3, 0)); const cap = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xff5a6e)); cap.position.y = 0.6; g.add(cap); scene.add(g); };
  for (let i = 0; i < 20; i++) shroom(rand(-50, 50), rand(-50, 50));

  // Treasure chests (exploration rewards → treats)
  const chests = [[-40, -38], [42, 36], [-44, 30], [36, -42], [0, -48], [-20, 10], [48, 0], [-8, 44]].map(([x, z]) => {
    const g = new THREE.Group(); g.position.set(x, H(x, z), z);
    g.add(box(1, 0.6, 0.7, mat(0xa86a3a), 0, 0.3, 0)); const lid = box(1.05, 0.25, 0.75, mat(0xd8a35a), 0, 0.72, 0); g.add(lid);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 14, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd23d, transparent: true, opacity: 0.25, side: THREE.DoubleSide })); beam.position.y = 7; g.add(beam);
    scene.add(g); return { x, z, g, lid, beam, open: false };
  });

  // Pets
  const spots = [[8, 8], [-12, 6], [14, -4], [-6, -14], [20, 18], [-22, -6], [30, -26], [-30, 22], [26, 30], [-34, -30], [45, -45], [-46, 44]];
  const pets = PETS.map((p, i) => { const mesh = makePet(p); const [x, z] = spots[i]; scene.add(mesh); return { ...p, mesh, x, z, hx: x, hz: z, tx: x, tz: z, wait: rand(0, 3), got: false, flee: 0 }; });

  // Player
  const player = new THREE.Group();
  const pb = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.7, 4, 10), mat(0x7b5cff)); pb.position.y = 0.8; player.add(pb);
  player.add(new THREE.Mesh(new THREE.SphereGeometry(0.33, 12, 10), mat(0xffe0c8)).translateY(1.6));
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.5, 12), mat(0xff9ad8)); hat.position.y = 2; player.add(hat);
  player.traverse((o) => (o.castShadow = true)); scene.add(player);
  const P = { x: 0, z: 0, yaw: 0 };
  let treats = 1, collected = [], t = 0, msg = 'Explore! Golden beams mark treasure with treats for rare pets.', msgT = 6, book = false, done = false, camYaw = 0;
  const amb = host.ambient('wind');
  const say = (m) => { msg = m; msgT = 3; };

  const bookEl = document.createElement('div'); bookEl.className = 'g-panel'; bookEl.style.cssText = 'left:50%;top:50%;transform:translate(-50%,-50%);display:none;width:min(560px,92%);padding:20px';
  host.el.appendChild(bookEl);
  const btn = document.createElement('button'); btn.className = 'g-btn'; btn.style.cssText = 'position:absolute;right:12px;top:12px;z-index:7'; btn.textContent = '📖 Pet Book'; host.el.appendChild(btn);
  const renderBook = () => {
    bookEl.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><b style="font:700 22px Space Grotesk">Pet Book · ${collected.length}/12</b><button data-close>✕</button></div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${pets.map((p) => `<div style="padding:10px 6px;border-radius:12px;text-align:center;background:${p.got ? '#ffffff14' : '#00000040'};box-shadow:inset 0 0 0 1px ${RCOL[p.rarity]}55"><div style="width:34px;height:34px;margin:0 auto 6px;border-radius:50%;background:${p.got ? '#' + p.color.toString(16).padStart(6, '0') : '#333'}"></div><div style="font-weight:600;font-size:13px">${p.got ? p.name : '???'}</div><div style="font-size:11px;color:${RCOL[p.rarity]}">${p.rarity}${p.treats ? ` · ${p.treats}🍪` : ''}</div></div>`).join('')}</div>`;
  };
  const toggleBook = () => { book = !book; bookEl.style.display = book ? 'block' : 'none'; if (book) renderBook(); host.sfx('click'); };
  btn.onclick = toggleBook; bookEl.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) toggleBook(); });

  const update = (dt) => {
    t += dt; msgT -= dt;
    if (input.pressed('KeyB')) toggleBook();
    const ax = input.axis(), sprint = input.down('ShiftLeft', 'ShiftRight'), moving = Math.hypot(ax.x, ax.y) > 0.05;
    const sp = sprint ? 9 : 5;
    if (moving) {
      const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
      const mx = fx * ax.y + rx * ax.x, mz = fz * ax.y + rz * ax.x;
      P.x = clamp(P.x + mx * sp * dt, -56, 56); P.z = clamp(P.z + mz * sp * dt, -56, 56); P.yaw = Math.atan2(-mx, -mz);
      camYaw += ((((P.yaw - camYaw) + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * dt * 0.8;
    }
    const py = H(P.x, P.z);
    player.position.set(P.x, py + (moving ? Math.abs(Math.sin(t * 12)) * 0.15 : 0), P.z); player.rotation.y = P.yaw;

    // Chests
    for (const ch of chests) { ch.beam.rotation.y += dt; if (!ch.open && Math.hypot(P.x - ch.x, P.z - ch.z) < 2) { ch.open = true; ch.lid.rotation.x = -1; ch.lid.position.z = -0.3; ch.beam.visible = false; treats += 1; host.sfx('win'); say('Treasure! +1 🍪 treat'); } }

    // Pets: wander, flee, follow once befriended
    let nearest = null, nd = Infinity;
    pets.forEach((p, i) => {
      const dx = P.x - p.x, dz = P.z - p.z, d = Math.hypot(dx, dz);
      if (p.got) {
        const k = collected.indexOf(p), lead = k === 0 ? { x: P.x, z: P.z } : collected[k - 1];
        const lx = lead.x - p.x, lz = lead.z - p.z, ld = Math.hypot(lx, lz);
        if (ld > 1.6) { p.x += (lx / ld) * Math.min(ld - 1.6, 8 * dt); p.z += (lz / ld) * Math.min(ld - 1.6, 8 * dt); }
      } else {
        const wary = sprint && moving ? (p.rarity === 'Legendary' ? 13 : p.rarity === 'Rare' ? 9 : 0) : 0;
        if (d < wary) { p.flee = 1.5; }
        if (p.flee > 0) { p.flee -= dt; p.x -= (dx / d) * 7 * dt; p.z -= (dz / d) * 7 * dt; if (Math.hypot(p.x - p.hx, p.z - p.hz) > 18) { p.x = p.hx + (p.x - p.hx) * 0.99; p.z = p.hz + (p.z - p.hz) * 0.99; } }
        else {
          p.wait -= dt;
          if (p.wait <= 0) { p.tx = p.hx + rand(-5, 5); p.tz = p.hz + rand(-5, 5); p.wait = rand(2, 5); }
          const wx = p.tx - p.x, wz = p.tz - p.z, wd = Math.hypot(wx, wz); if (wd > 0.2) { p.x += (wx / wd) * 1.5 * dt; p.z += (wz / wd) * 1.5 * dt; }
        }
        p.x = clamp(p.x, -55, 55); p.z = clamp(p.z, -55, 55);
        if (d < nd) { nd = d; nearest = p; }
      }
      const hop = Math.abs(Math.sin(t * (p.got ? 9 : 4) + i)) * 0.3;
      p.mesh.position.set(p.x, H(p.x, p.z) + hop, p.z);
      p.mesh.rotation.y = p.got || p.flee > 0 ? Math.atan2(p.flee > 0 ? -dx : dx, p.flee > 0 ? -dz : dz) : Math.sin(t * 0.5 + i) * 0.8;
      if (p.mesh.userData.aura) p.mesh.userData.aura.rotation.z += dt;
    });
    const canBefriend = nearest && nd < 2.6;
    if (canBefriend && input.pressed('KeyE')) {
      const p = nearest;
      if (treats < p.treats) { say(`${p.name} wants ${p.treats} 🍪 treat${p.treats > 1 ? 's' : ''}. Find treasure chests!`); host.sfx('error'); }
      else { treats -= p.treats; p.got = true; collected.push(p); host.sfx(p.rarity === 'Legendary' ? 'win' : 'success'); say(`${p.name} (${p.rarity}) joined your parade! ♥`); if (book) renderBook(); }
    }
    if (collected.length === 12 && !done) { done = true; host.end({ won: true, score: Math.max(500, 6000 - Math.round(t * 5)), title: 'Collection complete!', msg: `All 12 creatures befriended in ${Math.floor(t / 60)}m ${Math.floor(t % 60)}s.` }); }

    camera.position.lerp(new THREE.Vector3(P.x + Math.sin(camYaw) * 10, py + 6, P.z + Math.cos(camYaw) * 10), 1 - Math.exp(-dt * 4));
    camera.lookAt(P.x, py + 1, P.z);
    const score = collected.reduce((a, p) => a + (p.rarity === 'Legendary' ? 500 : p.rarity === 'Rare' ? 250 : 100), 0) + chests.filter((c) => c.open).length * 50;
    host.score(score); host.status(`${collected.length}/12 pets`);
    hud.set(`<div class="row"><span class="pill">🐾 ${collected.length}/12</span><span class="pill">🍪 ${treats} treats</span><span class="pill">🗝 ${chests.filter((c) => c.open).length}/${chests.length} chests</span></div>
      ${canBefriend ? `<div class="hint" style="color:${RCOL[nearest.rarity]}">${host.touch ? 'BEFRIEND' : 'E'} — ${nearest.name} · ${nearest.rarity}${nearest.treats ? ` (${nearest.treats}🍪)` : ''}</div>` : msgT > 0 ? `<div class="hint">${msg}</div>` : ''}`);
    T.render(); input.endFrame();
  };
  return makeGame(update, () => { amb.stop(); bookEl.remove(); btn.remove(); input.destroy(); hud.remove(); T.dispose(); });
}
