// GAME 21 — MINI CITY BUILDER: grid city building with money, jobs, happiness, growth and local save.
import { createThree, THREE, mat, glow, box, lights } from './lib/three-kit.js';
import { createHud, makeGame, clamp, rand } from './lib/kit.js';

const N = 14, SAVE = 'playforge.minicity';
const TOOLS = {
  road: { label: 'Road', icon: '🛣️', cost: 10 }, house: { label: 'House', icon: '🏠', cost: 50 }, shop: { label: 'Shop', icon: '🏪', cost: 80 },
  park: { label: 'Park', icon: '🌳', cost: 30 }, tower: { label: 'Tower', icon: '🏢', cost: 220 }, bulldoze: { label: 'Bulldoze', icon: '🚜', cost: 0 },
};
const GOAL = 500;

export default function create(host) {
  const T = createThree(host.el, { bg: 0xbfe6ff, fov: 40, fog: [0xbfe6ff, 40, 90], shadows: true });
  const { scene, camera } = T;
  const hud = createHud(host.el);
  lights(scene, { hemi: [0xffffff, 0x8ab88a, 0.9], sun: [0xfff0d0, 1.5], pos: [12, 20, 8], shadow: true, size: 14 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), mat(0x5ab8e8, { roughness: 0.15, metalness: 0.1 })); water.rotation.x = -Math.PI / 2; water.position.y = -0.35; scene.add(water);
  const island = box(N + 1.2, 0.8, N + 1.2, mat(0xe8d8a0), 0, -0.4, 0); island.receiveShadow = true; scene.add(island);
  const grass = box(N, 0.1, N, mat(0x7ad86b), 0, 0.02, 0); grass.receiveShadow = true; scene.add(grass);
  const gridLines = new THREE.GridHelper(N, N, 0x5aa85a, 0x6ac85a); gridLines.position.y = 0.08; scene.add(gridLines);
  const world = new THREE.Group(); scene.add(world);
  const cursor = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 })); scene.add(cursor);

  let cells, money, pop, tool = 'road', tickT = 0, saveT = 0, rotA = Math.PI / 4, zoom = 22, msg = '', msgT = 0, done = false, t = 0;
  const cars = [];
  const at = (x, z) => (x < 0 || z < 0 || x >= N || z >= N ? null : cells[z * N + x]);
  const pos = (x, z) => new THREE.Vector3(x - N / 2 + 0.5, 0, z - N / 2 + 0.5);
  const nearRoad = (x, z) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => at(x + a, z + b)?.type === 'road');
  const count = (type) => cells.filter((c) => c.type === type).length;
  const say = (m) => { msg = m; msgT = 2.5; };

  function meshFor(c, x, z) {
    const g = new THREE.Group(); g.position.copy(pos(x, z));
    const h = (c.level || 0);
    if (c.type === 'road') {
      g.add(box(1, 0.06, 1, mat(0x4a5060), 0, 0.09, 0));
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => at(x + a, z + b)?.type === 'road');
      if (nb[0] || nb[1]) g.add(box(0.5, 0.01, 0.06, mat(0xffffff), 0, 0.13, 0)); if (nb[2] || nb[3]) g.add(box(0.06, 0.01, 0.5, mat(0xffffff), 0, 0.13, 0));
    } else if (c.type === 'house') {
      const col = [0xfff4e0, 0xffd8d0, 0xd8e8ff, 0xfff0a0][(x + z) % 4];
      g.add(box(0.7, 0.5, 0.6, mat(col), 0, 0.33, 0));
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.35, 4), mat(0xd84a3a)); roof.position.y = 0.76; roof.rotation.y = Math.PI / 4; g.add(roof);
      if (c.pop > 6) g.add(box(0.3, 0.3, 0.3, mat(col), 0.3, 0.23, 0.3));
    } else if (c.type === 'shop') {
      g.add(box(0.85, 0.55, 0.75, mat(0xffe0a0), 0, 0.36, 0), box(0.9, 0.08, 0.3, mat(0x3d8bff), 0, 0.55, 0.42), box(0.5, 0.15, 0.04, glow(0xff5a6e, 1.5), 0, 0.7, 0.38));
    } else if (c.type === 'park') {
      g.add(box(0.95, 0.04, 0.95, mat(0x4ac85a), 0, 0.09, 0));
      [[-0.25, -0.2], [0.25, 0.15], [-0.1, 0.3]].forEach(([a, b], i) => { const tr = new THREE.Mesh(new THREE.SphereGeometry(0.18 + i * 0.03, 8, 6), mat(0x2a8a3a)); tr.position.set(a, 0.42, b); g.add(tr, box(0.05, 0.25, 0.05, mat(0x6a4a2a), a, 0.22, b)); });
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 12), mat(0x5ab8e8)).translateX(0.25).translateY(0.12).translateZ(-0.25));
    } else if (c.type === 'tower') {
      const hh = 1.4 + Math.min(1.6, (c.pop || 0) / 25);
      g.add(box(0.75, hh, 0.75, mat(0xc8d8f0, { metalness: 0.4, roughness: 0.2 }), 0, hh / 2 + 0.08, 0));
      for (let k = 0.4; k < hh; k += 0.35) g.add(box(0.77, 0.08, 0.77, glow(0x8ad8ff, 0.4), 0, k, 0));
    }
    g.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    return g;
  }
  function refresh(x, z) {
    for (const [a, b] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = at(x + a, z + b); if (!c) continue;
      if (c.mesh) { world.remove(c.mesh); c.mesh.traverse((o) => o.geometry?.dispose()); c.mesh = null; }
      if (c.type) { c.mesh = meshFor(c, x + a, z + b); world.add(c.mesh); }
    }
  }
  function load(data) {
    world.clear(); cells = Array.from({ length: N * N }, () => ({ type: null, pop: 0, mesh: null }));
    money = data?.money ?? 600; pop = 0;
    if (data?.cells) data.cells.forEach((c, i) => { if (c) { cells[i].type = c.t; cells[i].pop = c.p || 0; } });
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) if (at(x, z).type) { at(x, z).mesh = meshFor(at(x, z), x, z); world.add(at(x, z).mesh); }
    if (!data) { for (let x = 3; x < 11; x++) place(x, 7, 'road', true); money = 600; }
  }
  const save = () => { try { localStorage.setItem(SAVE, JSON.stringify({ money: Math.round(money), cells: cells.map((c) => (c.type ? { t: c.type, p: Math.round(c.pop) } : 0)) })); } catch {} };
  function place(x, z, tl, free) {
    const c = at(x, z); if (!c) return;
    if (tl === 'bulldoze') { if (!c.type) return; money += Math.round(TOOLS[c.type].cost * 0.5); c.type = null; c.pop = 0; host.sfx('hit'); refresh(x, z); return; }
    if (c.type) { say('Tile occupied — bulldoze first'); host.sfx('error'); return; }
    const cost = TOOLS[tl].cost;
    if (!free && money < cost) { say('Not enough money'); host.sfx('error'); return; }
    if (['house', 'shop', 'tower'].includes(tl) && !nearRoad(x, z)) { say('Must be next to a road'); host.sfx('error'); return; }
    if (tl === 'tower' && happiness() < 55) { say('Towers need happiness 55+ (build parks)'); host.sfx('error'); return; }
    if (!free) money -= cost; c.type = tl; c.pop = 0; host.sfx('build'); refresh(x, z);
  }
  function happiness() {
    const parks = count('park'), jobs = count('shop') * 18 + count('tower') * 6;
    const unemployed = pop > 0 ? Math.max(0, pop - jobs) / pop : 0;
    return clamp(Math.round(55 + Math.min(35, parks * 4) - unemployed * 45 - Math.max(0, count('road') - 40) * 0.3), 0, 100);
  }

  try { load(JSON.parse(localStorage.getItem(SAVE) || 'null')); } catch { load(null); }
  // A city that already passed the goal keeps going as a sandbox.
  if (cells.reduce((a, c) => a + c.pop, 0) >= GOAL) { done = true; say('Welcome back, mayor — sandbox mode'); }

  // Toolbar
  const bar = document.createElement('div'); bar.className = 'g-panel'; bar.style.cssText = 'left:50%;bottom:10px;transform:translateX(-50%);display:flex;gap:6px;flex-wrap:wrap;justify-content:center;max-width:calc(100% - 20px)';
  bar.innerHTML = Object.entries(TOOLS).map(([k, v]) => `<button data-t="${k}">${v.icon} ${v.label}${v.cost ? ` <small style="opacity:.7">$${v.cost}</small>` : ''}</button>`).join('') + '<button data-r="-1">⟲</button><button data-r="1">⟳</button><button data-s>💾 Save</button><button data-n>✚ New</button>';
  host.el.appendChild(bar);
  const paintBar = () => bar.querySelectorAll('[data-t]').forEach((b) => b.classList.toggle('on', b.dataset.t === tool));
  paintBar();
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.t) { tool = b.dataset.t; paintBar(); host.sfx('click'); }
    if (b.dataset.r) rotA += Math.PI / 2 * +b.dataset.r;
    if (b.hasAttribute('data-s')) { save(); say('City saved to this device'); host.sfx('success'); }
    if (b.hasAttribute('data-n')) { if (confirm('Start a new city? Your saved city will be replaced.')) { load(null); save(); say('Fresh island!'); } }
  });

  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.1), hit = new THREE.Vector3();
  let hover = null, dragging = false;
  const el = T.renderer.domElement;
  const tileAt = (e) => {
    const r = el.getBoundingClientRect(); ray.setFromCamera({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }, camera);
    if (!ray.ray.intersectPlane(plane, hit)) return null;
    const x = Math.floor(hit.x + N / 2), z = Math.floor(hit.z + N / 2); return at(x, z) ? { x, z } : null;
  };
  const pm = (e) => { hover = tileAt(e); if (dragging && hover && (tool === 'road' || tool === 'bulldoze')) place(hover.x, hover.z, tool); };
  const pd = (e) => { hover = tileAt(e); if (hover) { place(hover.x, hover.z, tool); dragging = true; } };
  const pu = () => (dragging = false);
  const wh = (e) => { e.preventDefault(); zoom = clamp(zoom + e.deltaY * 0.02, 12, 34); };
  const kd = (e) => { if (e.code === 'KeyQ') rotA -= Math.PI / 2; if (e.code === 'KeyE') rotA += Math.PI / 2; const k = '123456'.indexOf(e.key); if (k >= 0) { tool = Object.keys(TOOLS)[k]; paintBar(); } };
  el.addEventListener('pointermove', pm); el.addEventListener('pointerdown', pd); window.addEventListener('pointerup', pu); el.addEventListener('wheel', wh, { passive: false }); window.addEventListener('keydown', kd);

  let camA = rotA;
  const update = (dt) => {
    t += dt; tickT += dt; saveT += dt; msgT -= dt;
    const hap = happiness();
    if (tickT > 1) {
      tickT = 0;
      // Growth
      cells.forEach((c, i) => {
        const x = i % N, z = Math.floor(i / N);
        const cap = c.type === 'house' ? 12 : c.type === 'tower' ? 45 : 0;
        if (!cap) return;
        const roadOk = nearRoad(x, z), before = Math.floor(c.pop / 6);
        if (roadOk && hap > 30) c.pop = Math.min(cap, c.pop + (hap / 100) * (c.type === 'tower' ? 2.5 : 1));
        else c.pop = Math.max(0, c.pop - 0.5);
        if (Math.floor(c.pop / 6) !== before) refresh(x, z);
      });
      pop = Math.round(cells.reduce((a, c) => a + c.pop, 0));
      const jobs = count('shop') * 18 + count('tower') * 6;
      money += pop * 0.25 * (hap / 70) + Math.min(pop, jobs) * 0.15 + count('shop') * 1.5 - count('road') * 0.05 - count('park') * 0.3;
      if (cars.length < Math.min(20, count('road') / 3)) {
        const roads = cells.map((c, i) => (c.type === 'road' ? i : -1)).filter((i) => i >= 0);
        if (roads.length) { const i = roads[Math.floor(Math.random() * roads.length)]; const m = box(0.22, 0.14, 0.32, mat([0xff3d3d, 0x3d8bff, 0xffd23d, 0xffffff][cars.length % 4]), 0, 0.2, 0); world.add(m); cars.push({ m, x: i % N, z: Math.floor(i / N), tx: i % N, tz: Math.floor(i / N), p: 1 }); }
      }
    }
    if (saveT > 5) { saveT = 0; save(); }
    // Cars hop between connected road tiles
    for (const c of cars) {
      c.p += dt * 1.5;
      if (c.p >= 1) {
        if (at(c.tx, c.tz)?.type !== 'road') { world.remove(c.m); cars.splice(cars.indexOf(c), 1); break; }
        c.x = c.tx; c.z = c.tz; c.p = 0;
        const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => at(c.x + a, c.z + b)?.type === 'road');
        if (opts.length) { const [a, b] = opts[Math.floor(Math.random() * opts.length)]; c.tx = c.x + a; c.tz = c.z + b; }
      }
      const p0 = pos(c.x, c.z), p1 = pos(c.tx, c.tz); c.m.position.lerpVectors(p0, p1, c.p).add(new THREE.Vector3(0, 0.2, 0)); c.m.lookAt(p1.x, 0.2, p1.z);
    }
    if (hover) {
      cursor.visible = true; cursor.position.copy(pos(hover.x, hover.z)).setY(0.12);
      const c = at(hover.x, hover.z), ok = tool === 'bulldoze' ? !!c.type : !c.type && money >= TOOLS[tool].cost && (!['house', 'shop', 'tower'].includes(tool) || nearRoad(hover.x, hover.z));
      cursor.material.color.setHex(ok ? (tool === 'bulldoze' ? 0xff8a3d : 0xffffff) : 0xff3d3d);
    } else cursor.visible = false;
    camA += (rotA - camA) * Math.min(1, dt * 6);
    camera.position.set(Math.sin(camA) * zoom * 0.75, zoom * 0.8, Math.cos(camA) * zoom * 0.75); camera.lookAt(0, 0, 0);
    water.position.y = -0.35 + Math.sin(t) * 0.03;

    host.score(pop); host.status(`Pop ${pop}/${GOAL}`);
    const jobs = count('shop') * 18 + count('tower') * 6;
    hud.set(`<div class="row"><span class="pill">💰 $${Math.floor(money)}</span><span class="pill">👥 ${pop} / ${GOAL}</span><span class="pill">😊 ${hap}%</span><span class="pill">💼 ${jobs} jobs</span></div>
      ${msgT > 0 ? `<div class="hint" style="bottom:auto;top:52px">${msg}</div>` : ''}
      ${count('house') === 0 && t < 30 && msgT <= 0 ? '<div class="hint" style="bottom:auto;top:52px">Place houses next to the road to attract residents</div>' : ''}`);
    T.render();
    if (pop >= GOAL && !done) { done = true; save(); host.end({ won: true, score: pop + Math.floor(money / 10), title: 'Metropolis!', msg: `Your island reached ${pop} citizens. The city is saved — come back to keep building.` }); }
  };
  return makeGame(update, () => {
    save();
    el.removeEventListener('pointermove', pm); el.removeEventListener('pointerdown', pd); window.removeEventListener('pointerup', pu); el.removeEventListener('wheel', wh); window.removeEventListener('keydown', kd);
    bar.remove(); hud.remove(); T.dispose();
  });
}
