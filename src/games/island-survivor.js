// GAME 22 — ISLAND SURVIVOR: gather, craft, eat and survive the nights until you can light a signal fire.
import { createThree, THREE, mat, glow, box } from './lib/three-kit.js';
import { createInput, createHud, makeGame, bar, clamp, rand } from './lib/kit.js';

const DAY = 100, NIGHT_START = 0.68; // seconds per day, fraction where night begins
const R = 46;
const height = (x, z) => { const d = Math.hypot(x, z) / R; return Math.max(-2, (1 - d * d) * 5 + Math.sin(x * 0.2) * Math.cos(z * 0.17) * 1.2 * (1 - d)) - 0.6; };
const RECIPES = {
  axe: { label: 'Stone Axe', need: { wood: 3, stone: 2 }, desc: 'Double wood from trees' },
  campfire: { label: 'Campfire', need: { wood: 5, stone: 3 }, desc: 'Warmth at night, cooks berries' },
  shelter: { label: 'Shelter', need: { wood: 8, fiber: 6 }, desc: 'Rest safely through the night' },
  signal: { label: 'Signal Fire', need: { wood: 12, stone: 6, fiber: 4 }, desc: 'Light it at night to be rescued', req: 'axe' },
};

export default function create(host) {
  const T = createThree(host.el, { bg: 0x9ad8f0, fov: 55, far: 400, fog: [0x9ad8f0, 50, 160], shadows: true });
  const { scene, camera } = T;
  const input = createInput(host.el, { touch: { stick: true, buttons: [{ label: 'GATHER', key: 'KeyE' }, { label: 'EAT', key: 'KeyF' }] } });
  const hud = createHud(host.el);
  const hemi = new THREE.HemisphereLight(0xdff4ff, 0x6a5a3a, 1); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d0, 1.6); sun.castShadow = !T.low; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40 }); scene.add(sun); scene.add(sun.target);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(600, 600, 40, 40), mat(0x2ab8c8, { roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.92 })); sea.rotation.x = -Math.PI / 2; sea.position.y = -0.2; scene.add(sea);
  const geo = new THREE.CircleGeometry(R + 6, 90, 0, Math.PI * 2); geo.rotateX(-Math.PI / 2);
  const gp = geo.attributes.position, gc = new Float32Array(gp.count * 3), col = new THREE.Color();
  for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), z = gp.getZ(i), y = height(x, z); gp.setY(i, y); col.setHex(y < 0.6 ? 0xf0d89a : y < 1.2 ? 0xc8d87a : 0x5ab84a); gc.set([col.r, col.g, col.b], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(gc, 3)); geo.computeVertexNormals();
  const land = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true })); land.receiveShadow = true; scene.add(land);

  // Resources
  const nodes = [];
  const place = (r0, r1) => { let x, z; do { const a = rand(0, Math.PI * 2), r = rand(r0, r1); x = Math.cos(a) * r; z = Math.sin(a) * r; } while (nodes.some((n) => Math.hypot(n.x - x, n.z - z) < 3)); return [x, z]; };
  const trunkM = mat(0x8a5a3a), leafM = mat(0x2aa84a, { flatShading: true }), rockM = mat(0x8a8a90, { flatShading: true }), bushM = mat(0x3a8a3a), berryM = glow(0xff3d6a, 0.6), grassM = mat(0x8ad85a);
  for (let i = 0; i < 26; i++) { const [x, z] = place(8, 38); const g = new THREE.Group(); g.position.set(x, height(x, z), z); const tr = box(0.4, 4, 0.4, trunkM, 0, 2, 0); tr.rotation.z = rand(-0.15, 0.15); g.add(tr); for (let k = 0; k < 5; k++) { const l = new THREE.Mesh(new THREE.ConeGeometry(0.4, 2.6, 4), leafM); l.position.set(0, 4, 0); l.rotation.set(0, k * 1.25, 1.2); l.translateY(1); g.add(l); } g.traverse((o) => (o.castShadow = true)); scene.add(g); nodes.push({ type: 'wood', x, z, g, hp: 3, left: 4 }); }
  for (let i = 0; i < 16; i++) { const [x, z] = place(5, 40); const s = rand(0.6, 1.2); const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockM); m.position.set(x, height(x, z) + s * 0.4, z); m.castShadow = true; scene.add(m); nodes.push({ type: 'stone', x, z, g: m, hp: 2, left: 3 }); }
  for (let i = 0; i < 12; i++) { const [x, z] = place(6, 34); const g = new THREE.Group(); g.position.set(x, height(x, z), z); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.8, 10, 8), bushM).translateY(0.5)); const berries = new THREE.Group(); for (let k = 0; k < 6; k++) berries.add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), berryM).translateX(rand(-0.6, 0.6)).translateY(rand(0.4, 1)).translateZ(rand(-0.6, 0.6))); g.add(berries); scene.add(g); nodes.push({ type: 'berry', x, z, g, berries, hp: 1, left: 1, regrow: 0 }); }
  for (let i = 0; i < 18; i++) { const [x, z] = place(4, 36); const g = new THREE.Group(); g.position.set(x, height(x, z), z); for (let k = 0; k < 7; k++) { const b = box(0.06, rand(0.5, 0.9), 0.06, grassM, rand(-0.3, 0.3), 0.35, rand(-0.3, 0.3)); b.rotation.z = rand(-0.3, 0.3); g.add(b); } scene.add(g); nodes.push({ type: 'fiber', x, z, g, hp: 1, left: 2 }); }
  // Washed-up crate near the start, for flavour.
  scene.add(box(0.9, 0.7, 0.9, mat(0x8a6a3a), 3, height(3, 40) + 0.3, 40));

  // Player
  const player = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.8, 4, 8), mat(0xffb23d)); body.position.y = 0.8; body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), mat(0xf0c8a0)); head.position.y = 1.6;
  player.add(body, head, box(0.5, 0.08, 0.5, mat(0xe8d8a0), 0, 1.86, 0)); scene.add(player);
  const P = { x: 0, z: 40, yaw: 0, hp: 100, food: 80, warm: 100 };
  const inv = { wood: 0, stone: 0, fiber: 0, berry: 0 }, built = {};
  let camYaw = 0, t = DAY * 0.1, day = 1, gatherCd = 0, msg = 'Gather wood, stone and fibre. Survive the night.', msgT = 5, done = false, rescueT = -1, boat = null;
  const fireLights = [];
  const amb = host.ambient('waves');

  const say = (m) => { msg = m; msgT = 3.5; };
  const isNight = () => (t % DAY) / DAY > NIGHT_START;
  const near = (x, z, r) => Math.hypot(P.x - x, P.z - z) < r;

  function build(key) {
    const r = RECIPES[key];
    if (built[key] && key !== 'campfire') return say('Already built');
    if (r.req && !built[r.req]) return say(`Requires ${RECIPES[r.req].label}`);
    if (!Object.entries(r.need).every(([k, v]) => inv[k] >= v)) { host.sfx('error'); return say('Not enough materials'); }
    Object.entries(r.need).forEach(([k, v]) => (inv[k] -= v)); built[key] = (built[key] || 0) + 1; host.sfx('build');
    const fx = P.x - Math.sin(P.yaw) * 2, fz = P.z - Math.cos(P.yaw) * 2, y = height(fx, fz);
    if (key === 'campfire' || key === 'signal') {
      const g = new THREE.Group(); g.position.set(fx, y, fz); const big = key === 'signal' ? 2 : 1;
      for (let k = 0; k < 5; k++) { const l = box(0.15 * big, 0.15 * big, 1.2 * big, trunkM, 0, 0.1 * big, 0); l.rotation.y = k * 0.63; g.add(l); }
      if (key === 'signal') for (let k = 0; k < 6; k++) { const l = box(0.15 * big, 2.4, 0.15 * big, trunkM, Math.cos(k) * 0.6, 1.1, Math.sin(k) * 0.6); l.rotation.set(Math.sin(k) * 0.25, 0, -Math.cos(k) * 0.25); g.add(l); }
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.4 * big, 1.2 * big, 8), glow(0xff8a2a, 3)); flame.position.y = 0.6 * big; flame.visible = key === 'campfire'; g.add(flame);
      const light = new THREE.PointLight(0xff9a3a, key === 'campfire' ? 40 : 0, 14 * big); light.position.y = 1.2 * big; g.add(light);
      scene.add(g); fireLights.push({ x: fx, z: fz, flame, light, signal: key === 'signal', lit: key === 'campfire' });
    }
    if (key === 'shelter') { const g = new THREE.Group(); g.position.set(fx, y, fz); g.rotation.y = P.yaw; const roof = new THREE.Mesh(new THREE.ConeGeometry(2, 2.2, 4, 1, true), mat(0xc8a85a, { side: THREE.DoubleSide, flatShading: true })); roof.position.y = 1.1; roof.rotation.y = Math.PI / 4; g.add(roof); g.traverse((o) => (o.castShadow = true)); scene.add(g); built.shelterPos = { x: fx, z: fz }; }
    say(`Built: ${r.label}`); renderPanel();
  }

  const panel = document.createElement('div'); panel.className = 'g-panel'; panel.style.cssText = 'right:10px;top:10px;display:grid;gap:6px;width:210px';
  host.el.appendChild(panel);
  function renderPanel() {
    panel.innerHTML = `<div style="font:600 12px Space Grotesk;letter-spacing:.12em;opacity:.7">CRAFT</div>` + Object.entries(RECIPES).map(([k, r]) => {
      const ok = Object.entries(r.need).every(([m, v]) => inv[m] >= v) && (!r.req || built[r.req]) && (k === 'campfire' || !built[k]);
      return `<button data-c="${k}" ${ok ? '' : 'disabled'} style="text-align:left;line-height:1.3">${r.label}${built[k] && k !== 'campfire' ? ' ✓' : ''}<br><small style="opacity:.7;font-weight:400">${Object.entries(r.need).map(([m, v]) => `${v} ${m}`).join(' · ')}</small></button>`;
    }).join('');
  }
  panel.addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (b) build(b.dataset.c); });
  renderPanel();

  // Camera drag
  let drag = null; const el = T.renderer.domElement;
  const pd = (e) => { if (e.target === el) drag = e.clientX; };
  const pm = (e) => { if (drag != null && (e.pointerType === 'mouse' ? e.buttons : true)) { camYaw -= (e.clientX - drag) * 0.008; drag = e.clientX; } };
  const pu = () => (drag = null);
  el.addEventListener('pointerdown', pd); window.addEventListener('pointermove', pm); window.addEventListener('pointerup', pu);

  const update = (dt) => {
    t += dt; gatherCd -= dt; msgT -= dt;
    const newDay = Math.floor(t / DAY) + 1; if (newDay !== day) { day = newDay; say(`Day ${day} dawns.`); host.sfx('success'); }
    const frac = (t % DAY) / DAY, night = isNight();
    // Lighting cycle
    const sunA = frac * Math.PI * 2 - Math.PI / 2, dayAmt = clamp(Math.sin((frac / NIGHT_START) * Math.PI) * 1.4, 0, 1) * (night ? 0 : 1);
    sun.position.set(P.x + Math.cos(sunA) * 60, 50 * Math.max(0.2, Math.sin((frac / NIGHT_START) * Math.PI)), P.z + 30); sun.target.position.set(P.x, 0, P.z);
    sun.intensity = 0.2 + dayAmt * 1.5; hemi.intensity = 0.25 + dayAmt * 0.8;
    const sky = new THREE.Color(0x0a1030).lerp(new THREE.Color(frac > NIGHT_START - 0.08 && !night ? 0xff9a6a : 0x9ad8f0), dayAmt);
    scene.background.copy(sky); scene.fog.color.copy(sky);

    // Movement relative to camera
    const ax = input.axis(), sp = input.down('ShiftLeft') ? 7 : 4.5;
    if (Math.hypot(ax.x, ax.y) > 0.05) {
      const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
      const mx = fx * ax.y + rx * ax.x, mz = fz * ax.y + rz * ax.x;
      P.x += mx * sp * dt; P.z += mz * sp * dt; P.yaw = Math.atan2(-mx, -mz);
      const d = Math.hypot(P.x, P.z); if (d > R + 2) { P.x *= (R + 2) / d; P.z *= (R + 2) / d; }
      body.position.y = 0.8 + Math.abs(Math.sin(t * 10)) * 0.08;
    }
    for (const n of nodes) if (n.type === 'wood' || n.type === 'stone') { const dx = P.x - n.x, dz = P.z - n.z, d = Math.hypot(dx, dz), m = n.type === 'wood' ? 0.8 : 1; if (d < m && n.left > 0) { P.x = n.x + dx / d * m; P.z = n.z + dz / d * m; } }
    const py = Math.max(height(P.x, P.z), -0.6);
    player.position.set(P.x, py, P.z); player.rotation.y = P.yaw;

    // Gathering
    const target = nodes.filter((n) => n.left > 0 && near(n.x, n.z, n.type === 'wood' ? 2.4 : 2)).sort((a, b) => Math.hypot(P.x - a.x, P.z - a.z) - Math.hypot(P.x - b.x, P.z - b.z))[0];
    if (target && input.down('KeyE') && gatherCd <= 0) {
      gatherCd = 0.45; target.hp--; host.sfx(target.type === 'stone' ? 'thud' : 'hit');
      target.g.rotation.z = target.type === 'wood' ? 0.1 : 0; setTimeout(() => (target.g.rotation.z = 0), 100);
      if (target.hp <= 0) {
        const amt = target.type === 'wood' && built.axe ? 2 : 1; inv[target.type] += amt; target.left--; target.hp = target.type === 'wood' ? 3 : 2; host.sfx('coin');
        if (target.type === 'berry') { target.berries.visible = false; target.regrow = 25; target.left = 0; }
        if (target.left <= 0 && target.type !== 'berry') { target.g.visible = false; }
        renderPanel();
      }
    }
    for (const n of nodes) if (n.type === 'berry' && n.left <= 0) { n.regrow -= dt; if (n.regrow <= 0) { n.left = 1; n.berries.visible = true; } }
    if (input.pressed('KeyF')) { if (inv.berry > 0) { inv.berry--; const cooked = fireLights.some((f) => f.lit && !f.signal && near(f.x, f.z, 4)); P.food = Math.min(100, P.food + (cooked ? 35 : 22)); host.sfx('coin'); say(cooked ? 'Roasted berries! (+35)' : 'Ate berries (+22)'); renderPanel(); } else { say('No berries — find a red bush'); host.sfx('error'); } }

    // Survival needs
    P.food = Math.max(0, P.food - dt * 0.75);
    const nearFire = fireLights.some((f) => f.lit && near(f.x, f.z, f.signal ? 8 : 5)), inShelter = built.shelterPos && near(built.shelterPos.x, built.shelterPos.z, 2.5);
    if (night && !nearFire && !inShelter) P.warm = Math.max(0, P.warm - dt * 3.2); else P.warm = Math.min(100, P.warm + dt * 8);
    if (P.food <= 0) P.hp -= dt * 2.5; if (P.warm <= 0) P.hp -= dt * 3;
    if (inShelter && night) P.hp = Math.min(100, P.hp + dt * 3);
    else if (P.food > 50 && P.warm > 50) P.hp = Math.min(100, P.hp + dt * 0.6);

    // Signal fire
    const sig = fireLights.find((f) => f.signal);
    if (sig && !sig.lit && near(sig.x, sig.z, 4) && input.pressed('KeyE')) {
      if (night) { sig.lit = true; sig.flame.visible = true; sig.light.intensity = 120; host.sfx('win'); say('The signal fire roars! A ship has spotted you…'); rescueT = 8; boat = new THREE.Group(); boat.add(box(3, 1, 7, mat(0xffffff), 0, 0.4, 0), box(1.6, 1.4, 2, mat(0x3d8bff), 0, 1.4, 1)); boat.position.set(sig.x * 3, 0, sig.z * 3); scene.add(boat); }
      else say('Wait for night — the signal must be seen in the dark.');
    }
    if (rescueT > 0) { rescueT -= dt; boat.position.lerp(new THREE.Vector3(sig.x * 1.4, 0, sig.z * 1.4), dt * 0.4); if (rescueT <= 0 && !done) { done = true; host.end({ won: true, score: Math.round(2000 + P.hp * 10 + P.food * 5 - day * 150), title: 'Rescued!', msg: `A passing ship spotted your signal on day ${day}.` }); } }
    fireLights.forEach((f) => { if (f.lit) { f.flame.scale.setScalar(0.9 + Math.random() * 0.2); f.light.intensity = (f.signal ? 120 : 40) * (night ? 1 : 0.3); } });
    sea.position.y = -0.2 + Math.sin(t * 0.8) * 0.08;

    // Camera follow
    camera.position.lerp(new THREE.Vector3(P.x + Math.sin(camYaw) * 9, py + 5.5, P.z + Math.cos(camYaw) * 9), 1 - Math.exp(-dt * 5));
    camera.lookAt(P.x, py + 1.4, P.z);

    host.score(Math.round(t)); host.status(`Day ${day} · ${night ? 'Night' : 'Day'}`);
    const objective = !built.axe ? 'Craft a stone axe' : !built.campfire ? 'Build a campfire' : !built.shelter ? 'Build a shelter' : !built.signal ? 'Build the signal fire' : !sig.lit ? 'Light the signal fire at night (E)' : 'Wait for rescue…';
    hud.set(`${bar('Health', P.hp / 100, '#ff5a6e')}${bar('Food', P.food / 100, '#ffb23d')}${bar('Warmth', P.warm / 100, '#3dd8ff')}
      <div class="row"><span class="pill">🪵 ${inv.wood}</span><span class="pill">🪨 ${inv.stone}</span><span class="pill">🌾 ${inv.fiber}</span><span class="pill">🍒 ${inv.berry}</span><span class="pill">${night ? '🌙' : '☀️'} Day ${day}</span></div>
      <div class="row"><span class="pill">◆ ${objective}</span></div>
      ${target ? `<div class="hint">${host.touch ? 'GATHER' : 'E'}: ${target.type === 'berry' ? 'pick berries' : target.type === 'fiber' ? 'cut fibre' : target.type === 'wood' ? 'chop tree' : 'mine rock'}</div>` : msgT > 0 ? `<div class="hint">${msg}</div>` : ''}`);
    T.render(); input.endFrame();
    if (P.hp <= 0 && !done) { done = true; host.end({ won: false, score: Math.round(t), title: 'Lost to the island', msg: `You survived until day ${day}. ${P.food <= 0 ? 'Hunger' : 'The cold'} got you.` }); }
  };
  return makeGame(update, () => { amb.stop(); el.removeEventListener('pointerdown', pd); window.removeEventListener('pointermove', pm); window.removeEventListener('pointerup', pu); panel.remove(); input.destroy(); hud.remove(); T.dispose(); });
}
