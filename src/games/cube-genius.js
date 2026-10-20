// GAME 11 — CUBE GENIUS: a 3D sliding-block puzzle. Rotate the lattice, slide numbered blocks into the gap.
import { createThree, THREE, mat, lights, canvasTexture } from './lib/three-kit.js';
import { createHud, makeGame, clamp } from './lib/kit.js';

const LAYOUTS = [
  { name: 'Mini Cube', dims: [2, 2, 2], shuffle: 14 },
  { name: 'Twin Deck', dims: [3, 3, 2], shuffle: 20 },
  { name: 'Grand Cube', dims: [3, 3, 3], shuffle: 24 },
];
const COLORS = ['#3d6bff', '#ff8a3d', '#5ad86b', '#ff5a6e', '#8a5cff', '#ffc23d', '#3dc8ff', '#ff6bd0'];

export default function create(host) {
  const T = createThree(host.el, { bg: 0xf2f5ff, fov: 40 });
  const { scene, camera } = T;
  const hud = createHud(host.el);
  lights(scene, { hemi: [0xffffff, 0xb8c4ff, 1.1], sun: [0xffffff, 1.5], pos: [6, 10, 8] });
  const root = new THREE.Group(); scene.add(root);
  const panel = document.createElement('div'); panel.className = 'g-panel'; panel.style.cssText = 'right:12px;bottom:12px;display:flex;gap:8px';
  panel.innerHTML = '<button data-a="hint">💡 Hint</button><button data-a="reset">↺ Reset</button>';
  host.el.appendChild(panel);

  let L, dims, cells, blocks, empty, moves, startState, levelIdx = 0, total = 0, anim = null, hinted = null, banner = 2, done = false;
  let rotY = 0.7, rotX = 0.45, dist = 9;
  const idx = (x, y, z) => x + y * dims[0] + z * dims[0] * dims[1];
  const coord = (i) => [i % dims[0], Math.floor(i / dims[0]) % dims[1], Math.floor(i / (dims[0] * dims[1]))];
  const toWorld = (i) => { const [x, y, z] = coord(i); return new THREE.Vector3((x - (dims[0] - 1) / 2) * 1.1, (y - (dims[1] - 1) / 2) * 1.1, (z - (dims[2] - 1) / 2) * 1.1); };
  const neighbors = (i) => { const [x, y, z] = coord(i), out = []; [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].forEach(([a, b, c]) => { const nx = x + a, ny = y + b, nz = z + c; if (nx >= 0 && ny >= 0 && nz >= 0 && nx < dims[0] && ny < dims[1] && nz < dims[2]) out.push(idx(nx, ny, nz)); }); return out; };
  const numTex = (n, col) => canvasTexture(128, 128, (g, s) => { g.fillStyle = col; g.fillRect(0, 0, s, s); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, 0, s, s / 2); g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = 8; g.strokeRect(4, 4, s - 8, s - 8); g.fillStyle = '#fff'; g.font = 'bold 64px Space Grotesk, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n, s / 2, s / 2 + 4); });

  function load(k) {
    L = LAYOUTS[k]; dims = L.dims;
    root.clear();
    const n = dims[0] * dims[1] * dims[2];
    blocks = [];
    for (let i = 0; i < n - 1; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat(0xffffff, { map: numTex(i + 1, COLORS[i % COLORS.length]), roughness: 0.35 }));
      m.userData = { num: i, home: i }; root.add(m); blocks.push(m);
    }
    // Ghost frame showing the lattice bounds
    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(dims[0] * 1.1 + 0.1, dims[1] * 1.1 + 0.1, dims[2] * 1.1 + 0.1)), new THREE.LineBasicMaterial({ color: 0x9aa8e0 }));
    root.add(frame);
    cells = blocks.map((b, i) => i); cells.push(-1); empty = n - 1;
    // Shuffle with random legal moves from the solved state (always solvable).
    let last = -1;
    for (let s = 0; s < L.shuffle; s++) { const opts = neighbors(empty).filter((c) => c !== last); const c = opts[Math.floor(Math.random() * opts.length)]; last = empty; swap(c); }
    if (solved()) { const c = neighbors(empty)[0]; swap(c); }
    startState = { cells: [...cells], empty };
    blocks.forEach((b) => b.position.copy(toWorld(cells.indexOf(b.userData.num))));
    moves = 0; hinted = null; banner = 2; dist = 6 + Math.max(...dims) * 1.6;
  }
  function swap(c) { cells[empty] = cells[c]; cells[c] = -1; empty = c; }
  const solved = () => cells.every((v, i) => v === -1 || v === i);
  const misplaced = () => cells.reduce((a, v, i) => a + (v !== -1 && v !== i ? 1 : 0), 0);
  const manhattan = (v, at) => { const [a, b, c] = coord(at), [x, y, z] = coord(v); return Math.abs(a - x) + Math.abs(b - y) + Math.abs(c - z); };

  function tryMove(cell) {
    if (anim || !neighbors(empty).includes(cell)) { host.sfx('error'); return; }
    const b = blocks[cells[cell]], from = b.position.clone(), to = toWorld(empty);
    anim = { b, from, to, t: 0 };
    swap(cell); moves++; hinted = null; host.sfx('rotate');
  }
  function hint() {
    if (anim) return;
    let best = null, bd = Infinity;
    for (const c of neighbors(empty)) { const v = cells[c]; const delta = manhattan(v, empty) - manhattan(v, c) + Math.random() * 0.5; if (delta < bd) { bd = delta; best = c; } }
    hinted = blocks[cells[best]]; total = Math.max(0, total - 20); host.sfx('blip', 900);
  }

  // Pointer: drag to orbit, click to slide, wheel / pinch to zoom.
  const ptrs = new Map(); let downAt = null, pinch0 = 0;
  const ray = new THREE.Raycaster();
  const el = T.renderer.domElement;
  const pd = (e) => { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); downAt = { x: e.clientX, y: e.clientY, moved: 0 }; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); } el.setPointerCapture(e.pointerId); };
  const pm = (e) => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); dist = clamp(dist * (pinch0 / d), 5, 18); pinch0 = d; }
    else { rotY += (e.clientX - p.x) * 0.01; rotX = clamp(rotX + (e.clientY - p.y) * 0.01, -1.3, 1.3); }
    if (downAt) downAt.moved += Math.abs(e.clientX - p.x) + Math.abs(e.clientY - p.y);
    p.x = e.clientX; p.y = e.clientY;
  };
  const pu = (e) => {
    ptrs.delete(e.pointerId);
    if (downAt && downAt.moved < 8 && ptrs.size === 0) {
      const r = el.getBoundingClientRect();
      ray.setFromCamera({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }, camera);
      const hit = ray.intersectObjects(blocks)[0];
      if (hit) tryMove(cells.indexOf(hit.object.userData.num));
    }
    downAt = null;
  };
  const wh = (e) => { e.preventDefault(); dist = clamp(dist + e.deltaY * 0.01, 5, 18); };
  el.addEventListener('pointerdown', pd); el.addEventListener('pointermove', pm); el.addEventListener('pointerup', pu); el.addEventListener('pointercancel', pu); el.addEventListener('wheel', wh, { passive: false });
  panel.addEventListener('click', (e) => { const a = e.target.closest('button')?.dataset.a; if (a === 'hint') hint(); if (a === 'reset' && !anim) { cells = [...startState.cells]; empty = startState.empty; blocks.forEach((b) => b.position.copy(toWorld(cells.indexOf(b.userData.num)))); moves = 0; hinted = null; host.sfx('click'); } });

  load(0);
  const update = (dt, t) => {
    banner -= dt;
    if (anim) {
      anim.t = Math.min(1, anim.t + dt * 6); const k = 1 - (1 - anim.t) ** 3;
      anim.b.position.lerpVectors(anim.from, anim.to, k);
      if (anim.t >= 1) {
        anim = null;
        if (solved()) {
          const pts = Math.max(150, 1200 - moves * 8); total += pts; host.sfx('win'); levelIdx++;
          if (levelIdx >= LAYOUTS.length) { if (!done) { done = true; setTimeout(() => host.end({ won: true, score: total, title: 'Genius!', msg: 'All three lattices solved.' }), 500); } }
          else setTimeout(() => load(levelIdx), 700);
        }
      }
    }
    blocks.forEach((b) => {
      const home = cells.indexOf(b.userData.num) === b.userData.home;
      b.material.emissive.setHex(b === hinted ? 0xffd23d : home ? 0x1a5a2a : 0x000000);
      b.material.emissiveIntensity = b === hinted ? 0.5 + Math.sin(t * 10) * 0.3 : 0.35;
      const s = b === hinted ? 1.04 : 0.96; b.scale.setScalar(s);
    });
    root.rotation.set(rotX, rotY, 0);
    camera.position.set(0, 0, dist); camera.lookAt(0, 0, 0);
    host.score(total); host.status(`${L.name} · ${moves} moves`);
    hud.set(`<div class="row" style="color:#1a1f3a;text-shadow:none"><span class="pill" style="background:#fff;box-shadow:0 2px 10px #0001">Layout ${Math.min(levelIdx + 1, 3)}/3 · ${L.name}</span><span class="pill" style="background:#fff">Moves ${moves}</span><span class="pill" style="background:#fff">${misplaced()} out of place</span></div>
      ${banner > 0 ? `<div class="center" style="color:#3d6bff;text-shadow:none">${L.name}</div>` : ''}
      <div class="hint" style="background:#1a1f3acc">Drag to rotate · click a block beside the gap · green = home</div>`);
    T.render();
  };
  return makeGame(update, () => {
    el.removeEventListener('pointerdown', pd); el.removeEventListener('pointermove', pm); el.removeEventListener('pointerup', pu); el.removeEventListener('wheel', wh);
    panel.remove(); hud.remove(); T.dispose();
  });
}
