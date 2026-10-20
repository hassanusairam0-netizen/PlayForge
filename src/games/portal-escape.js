// GAME 05 — PORTAL ESCAPE: side-on 3D platformer with portals, switches, doors and moving platforms.
import { createThree, THREE, mat, glow, box, lights } from './lib/three-kit.js';
import { createInput, createHud, makeGame, clamp } from './lib/kit.js';

// # solid · ^ hazard · P start · E exit · C checkpoint · S switch · D door · a/A b/B portal pairs · M/V moving platforms
const LEVELS = [
  { name: 'Chamber 1 · First Jump', moves: {}, map: [
    '################################',
    '#..............................#',
    '#..............................#',
    '#..............................#',
    '#.......................#......#',
    '#.......................#......#',
    '#.......................#.A...E#',
    '#...............###.....########',
    '#.......................########',
    '#.P.......C.........a...########',
    '#####^^^######^^^###############',
    '################################'] },
  { name: 'Chamber 2 · Pressure Plate', moves: { M: [7, 0, 0.35] }, map: [
    '################################',
    '#.....................#........#',
    '#.....................#........#',
    '#.....................#........#',
    '#.....................#........#',
    '#.....................#........#',
    '#.................S...#........#',
    '#................###..D........#',
    '#.....M...............D........#',
    '#.P...............C...D......E.#',
    '#######^^^^^^^##################',
    '################################'] },
  { name: 'Chamber 3 · Thinking With Rooms', moves: { M: [3, 0, 0.4], V: [0, 4, 0.3] }, map: [
    '################################',
    '#.........#.........#..........#',
    '#.........#.........#.B........#',
    '#.........#.........######.....#',
    '#.........#.........#.......E..#',
    '#......a..#.......b.#......###.#',
    '#.....###.#......####..........#',
    '#.........#.........#..........#',
    '#...##....#..M......#..........#',
    '#.P.......#.A.......#....V.....#',
    '##############^^^^##############',
    '################################'] },
  { name: 'Chamber 4 · The Gauntlet', moves: { M: [8, 0, 0.25], V: [0, 3, 0.3] }, map: [
    '################################',
    '#..............#...............#',
    '#.B............#...........E...#',
    '#####..........#.......#########',
    '#..............#...............#',
    '#.......S......D...............#',
    '#.....####.....D...V..^^^^^^^^.#',
    '################################',
    '#..............................#',
    '#.P.M...........C.....a........#',
    '####^^^^^^^^^^##################',
    '################################'] },
];

export default function create(host) {
  const T = createThree(host.el, { bg: 0xdfeaf6, fov: 45, fog: [0xdfeaf6, 25, 60] });
  const { scene, camera } = T;
  const input = createInput(host.el, { touch: { stick: true, buttons: [{ label: 'JUMP', key: 'Space' }] } });
  const hud = createHud(host.el);
  lights(scene, { hemi: [0xffffff, 0x8899aa, 1.1], sun: [0xffffff, 1.2], pos: [5, 20, 15] });

  const P = { x: 0, y: 0, vx: 0, vy: 0, w: 0.7, h: 0.9, ground: false, portalCd: 0, plat: null };
  let lvl = 0, level, grid, ROWS, COLS, group, plats, portals, doorsOpen, doorMeshes, checkpoint, exitPos, deaths = 0, time = 0, totalTime = 0, banner = 2, done = false;
  const playerMesh = new THREE.Group();
  const pm = box(P.w, P.h, 0.7, mat(0x1c2a44, { roughness: 0.3 }));
  playerMesh.add(pm, box(0.5, 0.15, 0.05, glow(0x3dffd8, 3), 0, 0.15, 0.36));
  scene.add(playerMesh);

  const wy = (r) => ROWS - 1 - r;

  function build(i) {
    if (group) { scene.remove(group); group.traverse((o) => { o.geometry?.dispose(); }); }
    level = LEVELS[i]; grid = level.map.map((r) => r.split('')); ROWS = grid.length; COLS = grid[0].length;
    group = new THREE.Group(); scene.add(group);
    plats = []; portals = {}; doorsOpen = false; doorMeshes = [];
    const solidM = mat(0x8c9fb8, { roughness: 0.5 }), trimM = mat(0xe8eef6, { roughness: 0.4 });
    const solids = []; grid.forEach((row, r) => row.forEach((ch, c) => { if (ch === '#') solids.push([c, r]); }));
    const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 2), solidM, solids.length);
    const m4 = new THREE.Matrix4();
    solids.forEach(([c, r], k) => { m4.makeTranslation(c + 0.5, wy(r) + 0.5, 0); inst.setMatrixAt(k, m4); inst.setColorAt(k, new THREE.Color((c + r) % 2 ? 0x8c9fb8 : 0x97a9c0)); });
    group.add(inst);
    const back = box(COLS + 40, ROWS + 30, 0.2, trimM, COLS / 2, ROWS / 2, -1.2); group.add(back);
    const spikeGeo = new THREE.ConeGeometry(0.16, 0.5, 4), spikeM = mat(0xff4a4a, { emissive: 0x661010 });
    const portalCols = { a: 0x3dffd8, A: 0x3dffd8, b: 0xff9a3d, B: 0xff9a3d };
    grid.forEach((row, r) => row.forEach((ch, c) => {
      const x = c + 0.5, y = wy(r);
      if (ch === '^') for (let k = 0; k < 3; k++) { const s = new THREE.Mesh(spikeGeo, spikeM); s.position.set(c + 0.2 + k * 0.3, y + 0.25, 0); group.add(s); }
      if (ch === 'P') { checkpoint = { x, y: y + 0.45 }; }
      if (ch === 'E') { exitPos = { x, y }; const fr = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.08, 8, 24, Math.PI), glow(0x5ad86b, 2)); fr.position.set(x, y + 0.4, 0); group.add(fr, box(0.9, 1.1, 0.1, glow(0x5ad86b, 0.6), x, y + 0.5, -0.1)); }
      if (ch === 'C') { group.add(box(0.06, 1, 0.06, mat(0x555555), x, y + 0.5, 0)); const f = box(0.4, 0.25, 0.04, glow(0xffd23d, 1), x + 0.2, y + 0.85, 0); f.userData.flag = { x, y: y + 0.45 }; group.add(f); }
      if (ch === 'S') { const s = box(0.6, 0.2, 0.6, glow(0xff3d6a, 1.5), x, y + 0.1, 0); s.userData.sw = true; group.add(s); level.switchMesh = s; level.switchPos = { x, y }; }
      if (ch === 'D') { const d = box(0.9, 1, 1.6, mat(0xff3d6a, { transparent: true, opacity: 0.85, emissive: 0x661020 }), x, y + 0.5, 0); group.add(d); doorMeshes.push(d); }
      if ('aAbB'.includes(ch)) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.08, 8, 32), glow(portalCols[ch], 3)); ring.scale.y = 1.25; ring.position.set(x, y + 0.55, 0.2);
        const disc = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({ color: portalCols[ch], transparent: true, opacity: 0.35 })); disc.scale.y = 1.25; disc.position.copy(ring.position);
        group.add(ring, disc); portals[ch] = { x, y: y + 0.45, ring };
      }
      if (ch === 'M' || ch === 'V') {
        const [dx, dy, sp] = level.moves[ch];
        const mesh = box(2, 0.4, 1.6, mat(0x3d6bff, { emissive: 0x10206a }), 0, 0, 0); group.add(mesh);
        plats.push({ mesh, x0: c + 1, y0: y + 0.8, dx, dy, sp, x: c + 1, y: y + 0.8, ph: 0 });
      }
    }));
    P.x = checkpoint.x; P.y = checkpoint.y; P.vx = P.vy = 0; time = 0; banner = 2;
  }

  const tile = (c, r) => (r < 0 || r >= ROWS || c < 0 || c >= COLS ? '#' : grid[r][c]);
  const solidAt = (x, y) => { const c = Math.floor(x), r = ROWS - 1 - Math.floor(y); const t = tile(c, r); return t === '#' || (t === 'D' && !doorsOpen); };
  const boxHits = (x, y) => {
    const hw = P.w / 2, hh = P.h / 2;
    for (let px = x - hw + 0.01; px <= x + hw; px += Math.min(P.w - 0.02, 0.5)) for (let py = y - hh + 0.01; py <= y + hh; py += 0.44) if (solidAt(px, py)) return true;
    if (solidAt(x + hw - 0.01, y + hh - 0.01) || solidAt(x + hw - 0.01, y - hh + 0.01)) return true;
    for (const p of plats) if (Math.abs(x - p.x) < 1 + hw && Math.abs(y - p.y) < 0.2 + hh) return p;
    return false;
  };
  const die = () => { deaths++; host.sfx('hurt'); P.x = checkpoint.x; P.y = checkpoint.y; P.vx = P.vy = 0; };

  build(0);

  const update = (dt, t) => {
    time += dt; totalTime += dt; banner -= dt; P.portalCd -= dt;
    // Moving platforms
    for (const p of plats) {
      p.ph += dt * p.sp; const k = (1 - Math.cos(p.ph * Math.PI)) / 2;
      const nx = p.x0 + p.dx * k, ny = p.y0 + p.dy * k;
      if (P.plat === p) { P.x += nx - p.x; P.y += ny - p.y; }
      p.x = nx; p.y = ny; p.mesh.position.set(p.x, p.y, 0);
    }
    const ax = input.axis();
    P.vx += (ax.x * 6.5 - P.vx) * Math.min(1, dt * (P.ground ? 14 : 6));
    if ((input.pressed('Space', 'KeyW', 'ArrowUp')) && P.ground) { P.vy = 12.5; host.sfx('jump'); }
    if (!input.down('Space', 'KeyW', 'ArrowUp') && P.vy > 4) P.vy -= 40 * dt;
    P.vy = Math.max(-20, P.vy - 30 * dt);

    let nx = P.x + P.vx * dt;
    if (boxHits(nx, P.y)) { P.vx = 0; } else P.x = nx;
    let ny = P.y + P.vy * dt; P.ground = false; P.plat = null;
    const hit = boxHits(P.x, ny);
    if (hit) {
      if (P.vy < 0) { P.ground = true; if (hit !== true) { P.plat = hit; P.y = hit.y + 0.2 + P.h / 2; } else P.y = Math.floor(ny - P.h / 2 + 0.5) + P.h / 2; }
      else if (hit === true) P.y = Math.floor(ny + P.h / 2) - P.h / 2 - 0.001;
      P.vy = 0;
    } else P.y = ny;

    // Tile interactions
    const c = Math.floor(P.x), r = ROWS - 1 - Math.floor(P.y - P.h / 2 + 0.1), here = tile(c, r);
    const feet = tile(c, ROWS - 1 - Math.floor(P.y - P.h / 2 - 0.05));
    if (here === '^' || feet === '^' || P.y < -2) die();
    group.children.forEach((o) => { if (o.userData.flag && Math.abs(o.userData.flag.x - P.x) < 0.6 && Math.abs(o.userData.flag.y - P.y) < 0.8 && checkpoint !== o.userData.flag) { checkpoint = o.userData.flag; o.material.emissiveIntensity = 3; host.sfx('coin'); } });
    if (level.switchPos && !doorsOpen && Math.abs(level.switchPos.x - P.x) < 0.6 && Math.abs(level.switchPos.y + 0.45 - P.y) < 0.7) {
      doorsOpen = true; host.sfx('success'); level.switchMesh.material.color.setHex(0x5ad86b); level.switchMesh.material.emissive.setHex(0x5ad86b); level.switchMesh.scale.y = 0.4;
    }
    doorMeshes.forEach((d) => { d.scale.y += ((doorsOpen ? 0.02 : 1) - d.scale.y) * Math.min(1, dt * 6); d.position.y = Math.floor(d.position.y) + d.scale.y / 2; });
    if (P.portalCd <= 0) for (const k of Object.keys(portals)) {
      const p = portals[k];
      if (Math.abs(p.x - P.x) < 0.45 && Math.abs(p.y - P.y) < 0.55) {
        const twin = portals[k === k.toLowerCase() ? k.toUpperCase() : k.toLowerCase()];
        if (twin) { P.x = twin.x; P.y = twin.y; P.portalCd = 0.6; host.sfx('flip'); }
        break;
      }
    }
    Object.values(portals).forEach((p) => (p.ring.rotation.z = t * 2));
    if (exitPos && Math.abs(exitPos.x - P.x) < 0.5 && Math.abs(exitPos.y + 0.45 - P.y) < 0.6) {
      host.sfx('win'); lvl++;
      if (lvl >= LEVELS.length) { if (!done) { done = true; host.end({ won: true, score: Math.max(500, Math.round(6000 - totalTime * 15 - deaths * 100)), title: 'All chambers cleared', msg: `${totalTime.toFixed(1)}s total · ${deaths} resets` }); } }
      else build(lvl);
    }

    playerMesh.position.set(P.x, P.y, 0);
    playerMesh.scale.set(1 + Math.min(0.2, Math.abs(P.vy) * 0.01), 1 - Math.min(0.15, Math.abs(P.vx) * 0.01), 1);
    if (ax.x) playerMesh.rotation.y = ax.x > 0 ? 0 : Math.PI;
    const hw = Math.min(COLS / 2, Math.tan(0.39) * 12 * camera.aspect), hh = Math.min(ROWS / 2, Math.tan(0.39) * 12);
    camera.position.x += (clamp(P.x, hw, COLS - hw) - camera.position.x) * Math.min(1, dt * 4);
    camera.position.y += (clamp(P.y + 1, hh, ROWS - hh) - camera.position.y) * Math.min(1, dt * 4);
    camera.position.z = 12; camera.lookAt(camera.position.x, camera.position.y, 0);

    host.score(Math.max(0, Math.round(6000 - totalTime * 15 - deaths * 100))); host.status(`Chamber ${lvl + 1}/4`);
    hud.set(`<div class="row"><span class="pill" style="background:#1c2a44cc">${level.name}</span><span class="pill" style="background:#1c2a44cc">Resets ${deaths}</span><span class="pill" style="background:#1c2a44cc">⏱ ${time.toFixed(1)}s</span></div>
      ${banner > 0 ? `<div class="center" style="color:#1c2a44;text-shadow:none">${level.name}</div>` : ''}
      ${level.switchPos && !doorsOpen ? '<div class="hint">Find the pressure switch to open the red doors</div>' : ''}`);
    T.render(); input.endFrame();
  };
  return makeGame(update, () => { input.destroy(); hud.remove(); T.dispose(); });
}
