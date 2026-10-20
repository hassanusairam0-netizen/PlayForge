// GAME 18 — STACK ATTACK: drop sliding slabs; overhang is sliced off. Perfect drops grow the tower back.
import { createThree, THREE, mat } from './lib/three-kit.js';
import { createInput, createHud, makeGame } from './lib/kit.js';

export default function create(host) {
  const T = createThree(host.el, { bg: 0xffd6ec, fov: 40 });
  const { scene, camera } = T;
  const input = createInput(host.el);
  const hud = createHud(host.el);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8b8ff, 1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(6, 12, 4); scene.add(sun);
  const H = 0.5;
  const color = (i) => new THREE.Color().setHSL((0.92 + i * 0.025) % 1, 0.75, 0.68);
  const base = new THREE.Mesh(new THREE.BoxGeometry(3, 6, 3), mat(0x5a3a6a)); base.position.y = -3 - H / 2; scene.add(base);
  const stack = [{ x: 0, z: 0, w: 3, d: 3, mesh: null }];
  const falling = [];
  let moving = null, level = 0, score = 0, streak = 0, axis = 'x', dir = 1, speed = 3, over = false, flash = '', flashT = 0, camY = 4, t = 0;

  function addBlock(x, z, w, d, y, i) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, H, d), mat(color(i), { roughness: 0.35 }));
    m.position.set(x, y, z); scene.add(m); return m;
  }
  function spawn() {
    const top = stack[stack.length - 1]; level++;
    axis = level % 2 ? 'x' : 'z'; dir = 1;
    const m = addBlock(axis === 'x' ? -5 : top.x, axis === 'z' ? -5 : top.z, top.w, top.d, level * H, level);
    moving = { x: m.position.x, z: m.position.z, w: top.w, d: top.d, mesh: m };
    speed = Math.min(7.5, 3 + level * 0.12);
  }
  function drop() {
    if (!moving || over) return;
    const top = stack[stack.length - 1], m = moving;
    const delta = axis === 'x' ? m.x - top.x : m.z - top.z, size = axis === 'x' ? top.w : top.d;
    const overlap = size - Math.abs(delta);
    if (overlap <= 0) { over = true; falling.push({ mesh: m.mesh, vy: 0, vr: 2 * Math.sign(delta || 1) }); moving = null; host.sfx('lose'); setTimeout(() => host.end({ won: level > 25, score, title: 'Tower topped out', msg: `${level - 1} slabs high · best streak ${bestStreak}` }), 900); return; }
    let nw = m.w, nd = m.d, nx = m.x, nz = m.z;
    if (Math.abs(delta) < 0.08) {
      streak++; bestStreak = Math.max(bestStreak, streak);
      if (axis === 'x') nx = top.x; else nz = top.z;
      if (streak >= 3) { if (axis === 'x') nw = Math.min(3, nw + 0.15); else nd = Math.min(3, nd + 0.15); }
      flash = streak >= 3 ? `PERFECT ×${streak} · GROW!` : `PERFECT ×${streak}`; flashT = 1; host.sfx('blip', 500 + streak * 80); score += 2 + streak;
    } else {
      streak = 0;
      const cut = Math.abs(delta), sign = Math.sign(delta);
      if (axis === 'x') { nw = overlap; nx = top.x + delta / 2; const ch = addBlock(nx + sign * (overlap / 2 + cut / 2), m.z, cut, m.d, m.mesh.position.y, level); falling.push({ mesh: ch, vy: 0, vr: sign * 2 }); }
      else { nd = overlap; nz = top.z + delta / 2; const ch = addBlock(m.x, nz + sign * (overlap / 2 + cut / 2), m.w, cut, m.mesh.position.y, level); falling.push({ mesh: ch, vy: 0, vr: sign * 2, z: true }); }
      host.sfx('thud'); score += 1;
    }
    scene.remove(m.mesh); m.mesh.geometry.dispose();
    const placed = addBlock(nx, nz, nw, nd, level * H, level);
    stack.push({ x: nx, z: nz, w: nw, d: nd, mesh: placed });
    spawn();
  }
  let bestStreak = 0;
  const el = host.el;
  const onDown = (e) => { if (!e.target.closest('.tc')) drop(); };
  el.addEventListener('pointerdown', onDown);
  spawn();

  const update = (dt) => {
    t += dt;
    if (input.pressed('Space', 'Enter', 'ArrowDown')) drop();
    if (moving) {
      const k = axis === 'x' ? 'x' : 'z';
      moving[k] += dir * speed * dt;
      if (moving[k] > 5) dir = -1; if (moving[k] < -5) dir = 1;
      moving.mesh.position[k] = moving[k];
      host.el.dataset.slide = (moving[k] - stack[stack.length - 1][k]).toFixed(2); // used by the automated tests
    }
    for (let i = falling.length - 1; i >= 0; i--) {
      const f = falling[i]; f.vy -= 20 * dt; f.mesh.position.y += f.vy * dt;
      if (f.z) f.mesh.rotation.x += f.vr * dt; else f.mesh.rotation.z -= f.vr * dt;
      if (f.mesh.position.y < camY - 20) { scene.remove(f.mesh); f.mesh.geometry.dispose(); falling.splice(i, 1); }
    }
    flashT -= dt;
    camY += (level * H + 4 - camY) * Math.min(1, dt * 3);
    const zoom = over ? Math.max(10, level * H * 1.2) : 10;
    camera.position.set(zoom * 0.8, camY + (over ? level * H * 0.2 : 0), zoom * 0.8); camera.lookAt(0, camY - 4 + (over ? -level * H * 0.3 : 0), 0);
    scene.background.setHSL((0.92 + level * 0.012) % 1, 0.6, 0.88);
    host.score(score); host.status(`Height ${level - 1}`);
    hud.set(`<div style="position:absolute;left:50%;top:6%;transform:translateX(-50%);font-size:64px;color:#fff;text-shadow:0 4px 20px #0003">${level - 1}</div>
      ${flashT > 0 ? `<div class="center" style="top:22%;font-size:24px;color:#fff">${flash}</div>` : ''}
      ${level < 3 ? `<div class="hint">${host.touch ? 'Tap' : 'Click or press Space'} to drop</div>` : ''}`);
    T.render(); input.endFrame();
  };
  return makeGame(update, () => { el.removeEventListener('pointerdown', onDown); input.destroy(); hud.remove(); T.dispose(); });
}
