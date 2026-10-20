// Cinematic featured-game showcases. Each scene is created lazily when its section
// approaches the viewport and only renders while visible.
import * as THREE from 'three';

const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.2, ...o });
const G = (color, i = 2) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: i });

const scenes = {
  arena(scene, camera) {
    scene.background = new THREE.Color(0x05061a); scene.fog = new THREE.Fog(0x05061a, 10, 50);
    scene.add(new THREE.HemisphereLight(0x6b8cff, 0x100820, 0.6));
    const pl = new THREE.PointLight(0xff3df0, 80, 30); pl.position.set(0, 6, 0); scene.add(pl);
    const pl2 = new THREE.PointLight(0x3db8ff, 80, 30); pl2.position.set(-6, 3, 5); scene.add(pl2);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(16, 6), M(0x0b0e24, { metalness: 0.8, roughness: 0.3 })); floor.rotation.x = -Math.PI / 2; scene.add(floor);
    const grid = new THREE.GridHelper(32, 32, 0x3db8ff, 0x1a2a6a); grid.position.y = 0.01; scene.add(grid);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const p = new THREE.Mesh(new THREE.BoxGeometry(1, 5, 1), M(0x1a1f40, { metalness: 0.8 })); p.position.set(Math.cos(a) * 9, 2.5, Math.sin(a) * 9); scene.add(p);
      const s = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.15, 1.05), G(i % 2 ? 0xff3df0 : 0x3db8ff, 3)); s.position.set(p.position.x, 4.5, p.position.z); scene.add(s); }
    const drones = [];
    for (let i = 0; i < 5; i++) { const d = new THREE.Group(); d.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0), M(0x2a2f4a, { metalness: 0.9, roughness: 0.2, flatShading: true }))); const eye = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), G(0xff3df0, 4)); eye.position.z = 0.5; d.add(eye); scene.add(d); drones.push(d); }
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), G(0x7fffff, 5)); scene.add(beam);
    return (t, p) => {
      drones.forEach((d, i) => { const a = t * 0.5 + i * 1.25; d.position.set(Math.cos(a) * 5, 2 + Math.sin(t * 2 + i) * 0.8, Math.sin(a) * 5); d.lookAt(camera.position); });
      const tg = drones[Math.floor(t) % 5].position; const from = new THREE.Vector3(1.5, 1.2, 9 - p * 4);
      beam.visible = (t % 1) < 0.15; beam.position.copy(from).lerp(tg, 0.5); beam.scale.y = from.distanceTo(tg); beam.lookAt(tg); beam.rotateX(Math.PI / 2);
      camera.position.set(Math.sin(t * 0.1) * 2, 2 + p * 1.5, 11 - p * 4); camera.lookAt(0, 2, 0);
    };
  },
  circuit(scene, camera) {
    scene.background = new THREE.Color(0x1a0820); scene.fog = new THREE.Fog(0x1a0820, 20, 80);
    scene.add(new THREE.HemisphereLight(0xff9a6a, 0x200a30, 0.9));
    const sun = new THREE.DirectionalLight(0xffb27a, 1.5); sun.position.set(-10, 8, -20); scene.add(sun);
    const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(8, 48), new THREE.MeshBasicMaterial({ color: 0xff5a3d, fog: false })); sunDisc.position.set(0, 5, -70); scene.add(sunDisc);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), M(0x120818)); ground.rotation.x = -Math.PI / 2; scene.add(ground);
    const curve = new THREE.CatmullRomCurve3([[-14, 0, 0], [-8, 0, -12], [6, 0, -14], [15, 0, -4], [10, 0, 8], [-2, 0, 6], [-10, 0, 10]].map((v) => new THREE.Vector3(...v)), true);
    const road = new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 1.6, 4, true), M(0x26222e)); road.scale.y = 0.04; road.position.y = 0.05; scene.add(road);
    const edge = new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 1.75, 4, true), G(0xff3d7a, 2)); edge.scale.y = 0.02; scene.add(edge);
    const car = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 2.2), M(0xff3d7a, { metalness: 0.7, roughness: 0.2 })); body.position.y = 0.4; car.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 1), M(0x101020, { metalness: 0.9, roughness: 0.1 })); cab.position.set(0, 0.7, -0.1); car.add(cab);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(1, 0.08, 0.05), G(0xff2020, 4)); tl.position.set(0, 0.45, 1.12); car.add(tl);
    [[-0.55, -0.7], [0.55, -0.7], [-0.55, 0.7], [0.55, 0.7]].forEach(([x, z]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.2, 16), M(0x111111)); w.rotation.z = Math.PI / 2; w.position.set(x, 0.25, z); car.add(w); });
    const hl = new THREE.SpotLight(0xffffff, 60, 20, 0.5); hl.position.set(0, 0.5, -1); car.add(hl); car.add(hl.target); hl.target.position.set(0, 0, -6);
    scene.add(car);
    for (let i = 0; i < 40; i++) { const h = 2 + Math.random() * 10; const b = new THREE.Mesh(new THREE.BoxGeometry(2, h, 2), M(0x1a0f2a, { emissive: 0x3db8ff, emissiveIntensity: Math.random() < 0.3 ? 0.4 : 0.02 })); const a = Math.random() * Math.PI * 2, r = 24 + Math.random() * 20; b.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r); scene.add(b); }
    return (t, p) => {
      const u = (t * 0.05) % 1; const pos = curve.getPointAt(u), ahead = curve.getPointAt((u + 0.01) % 1);
      car.position.copy(pos); car.lookAt(ahead); car.rotateY(Math.PI);
      const back = pos.clone().sub(ahead).normalize().multiplyScalar(6 + p * 4);
      camera.position.lerp(new THREE.Vector3(pos.x + back.x, 2.5 + p * 6, pos.z + back.z), 0.08); camera.lookAt(ahead);
    };
  },
  cube(scene, camera) {
    scene.background = new THREE.Color(0xf2f5ff);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc8d0ff, 1.2));
    const d = new THREE.DirectionalLight(0xffffff, 1.4); d.position.set(5, 8, 6); scene.add(d);
    const cols = [0x3d6bff, 0xff8a3d, 0x5ad86b, 0xff5a6e, 0x8a5cff, 0xffd23d];
    const group = new THREE.Group(); scene.add(group);
    const cubes = [];
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
      if (x === 1 && y === 1 && z === 1) continue;
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.92, 0.92), M(cols[cubes.length % 6], { roughness: 0.25, metalness: 0.05 }));
      c.position.set(x, y, z); c.userData.home = c.position.clone(); group.add(c); cubes.push(c);
    }
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.5, 48), new THREE.MeshBasicMaterial({ color: 0x9aa8e0, transparent: true, opacity: 0.25 })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = -2.4; scene.add(shadow);
    camera.position.set(0, 1, 8);
    return (t, p) => {
      group.rotation.y = t * 0.4 + p * 2; group.rotation.x = 0.4 + Math.sin(t * 0.3) * 0.2;
      const k = Math.floor(t / 1.2) % cubes.length, ph = (t / 1.2) % 1;
      cubes.forEach((c, i) => c.position.copy(c.userData.home).multiplyScalar(1 + p * 0.35));
      const c = cubes[k]; c.position.y += Math.sin(ph * Math.PI) * 0.6;
      camera.position.z = 8 - p * 1.5; camera.lookAt(0, 0, 0);
    };
  },
  city(scene, camera) {
    scene.background = new THREE.Color(0xbfe6ff); scene.fog = new THREE.Fog(0xbfe6ff, 25, 60);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8ab88a, 1));
    const sun = new THREE.DirectionalLight(0xfff0d0, 1.6); sun.position.set(8, 14, 6); scene.add(sun);
    const N = 9;
    const base = new THREE.Mesh(new THREE.BoxGeometry(N * 1.1 + 0.6, 0.6, N * 1.1 + 0.6), M(0x6aaa5a)); base.position.y = -0.3; scene.add(base);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), M(0x5ab8e8, { roughness: 0.1 })); water.rotation.x = -Math.PI / 2; water.position.y = -0.5; scene.add(water);
    const buildings = []; const cars = [];
    const roadM = M(0x4a5060);
    for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) {
      const px = (x - N / 2 + 0.5) * 1.1, pz = (z - N / 2 + 0.5) * 1.1;
      if (x % 4 === 0 || z % 4 === 0) { const r = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 1.1), roadM); r.position.set(px, 0.02, pz); scene.add(r); continue; }
      if ((x * 3 + z * 5) % 7 === 0) { const tr = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 8), M(0x2a8a3a)); tr.position.set(px, 0.4, pz); scene.add(tr); continue; }
      const h = 0.4 + ((x * 7 + z * 13) % 9) * 0.3;
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1, 0.85), M([0xfafafa, 0xffd23d, 0xff9a8a, 0x8ab8ff, 0xc8a8ff][(x + z) % 5], { roughness: 0.6 }));
      b.position.set(px, 0, pz); b.userData.h = h; b.userData.d = (x + z) * 0.08; scene.add(b); buildings.push(b);
    }
    for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.5), M([0xff3d3d, 0x3d8bff, 0xffffff][i % 3])); scene.add(c); cars.push(c); }
    return (t, p) => {
      buildings.forEach((b) => { const g = Math.min(1, Math.max(0.05, (p * 1.6 + 0.2) - b.userData.d)); b.scale.y = b.userData.h * g; b.position.y = b.scale.y / 2; });
      cars.forEach((c, i) => { const lane = (i % 3) * 4 - 4, s = ((t * 1.2 + i * 2.7) % 11) - 5.5; if (i % 2) { c.position.set(lane * 1.1 + 0.2, 0.12, s); c.rotation.y = 0; } else { c.position.set(s, 0.12, lane * 1.1 + 0.2); c.rotation.y = Math.PI / 2; } });
      const a = t * 0.08 + p; camera.position.set(Math.cos(a) * 14, 9 - p * 2, Math.sin(a) * 14); camera.lookAt(0, 0.5, 0);
    };
  },
  space(scene, camera) {
    scene.background = new THREE.Color(0x02020a);
    scene.add(new THREE.AmbientLight(0x4a3a8a, 0.8));
    const star = new THREE.PointLight(0x8a7bff, 200, 80); star.position.set(10, 5, -10); scene.add(star);
    const sun = new THREE.DirectionalLight(0x3dfff0, 1.2); sun.position.set(-5, 3, 5); scene.add(sun);
    const N = 1500, geo = new THREE.BufferGeometry(), pos = new Float32Array(N * 3);
    for (let i = 0; i < N * 3; i++) pos[i] = (Math.random() - 0.5) * 200;
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.25 })));
    const planet = new THREE.Mesh(new THREE.SphereGeometry(6, 48, 48), M(0x5a3aa8, { roughness: 0.8, emissive: 0x2a1a5a, emissiveIntensity: 0.5 })); planet.position.set(14, -4, -30); scene.add(planet);
    const ring = new THREE.Mesh(new THREE.RingGeometry(8, 11, 64), new THREE.MeshBasicMaterial({ color: 0xc8b8ff, side: THREE.DoubleSide, transparent: true, opacity: 0.35 })); ring.position.copy(planet.position); ring.rotation.x = 1.2; scene.add(ring);
    const rocks = [];
    for (let i = 0; i < 70; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + Math.random() * 1.2, 0), M(0x6a5a6a, { flatShading: true, roughness: 0.9 })); r.position.set((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 16, -Math.random() * 60); r.userData.s = Math.random(); scene.add(r); rocks.push(r); }
    const crystals = [];
    for (let i = 0; i < 12; i++) { const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.4), G(0x3dfff0, 3)); c.position.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 8, -Math.random() * 50); scene.add(c); crystals.push(c); }
    const ship = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.2, 6), M(0xd8dff0, { metalness: 0.7, roughness: 0.3 })); hull.rotation.x = -Math.PI / 2; ship.add(hull);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.8), M(0x8a7bff, { metalness: 0.6 })); wing.position.z = 0.4; ship.add(wing);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.9, 8), G(0x8a7bff, 5)); flame.rotation.x = Math.PI / 2; flame.position.z = 1.5; ship.add(flame);
    scene.add(ship);
    return (t, p) => {
      rocks.forEach((r) => { r.position.z += 0.08 + r.userData.s * 0.05; r.rotation.x += 0.005; r.rotation.y += 0.01 * r.userData.s; if (r.position.z > 10) r.position.z = -60; });
      crystals.forEach((c) => { c.position.z += 0.1; c.rotation.y += 0.04; if (c.position.z > 10) c.position.z = -50; });
      ship.position.set(Math.sin(t * 0.7) * 2, Math.sin(t * 0.9) * 0.8 - 0.5, 2); ship.rotation.z = -Math.cos(t * 0.7) * 0.4;
      flame.scale.setScalar(0.8 + Math.random() * 0.4);
      camera.position.set(Math.sin(t * 0.2) * 1.5, 1.2 + p * 2, 8 - p * 2); camera.lookAt(ship.position.x * 0.5, 0, -6);
      planet.rotation.y = t * 0.05;
    };
  },
};

export function mountShowcase(section, kind) {
  const holder = section.querySelector('.sc-canvas');
  const low = matchMedia('(max-width: 760px)').matches;
  let renderer, scene, camera, tick, raf = 0, visible = false, t0 = performance.now();
  const init = () => {
    try { renderer = new THREE.WebGLRenderer({ antialias: !low, powerPreference: 'high-performance' }); } catch { holder.classList.add('no-webgl'); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, low ? 1 : 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
    holder.appendChild(renderer.domElement);
    scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(45, 1, 0.1, 300);
    tick = scenes[kind](scene, camera);
    const resize = () => {
      const w = holder.clientWidth, h = holder.clientHeight; renderer.setSize(w, h, false); renderer.domElement.style.cssText = 'width:100%;height:100%;display:block'; camera.aspect = w / h;
      // Push the scene away from the copy on wide screens.
      const side = section.classList.contains('side-left') ? -1 : section.classList.contains('side-right') ? 1 : 0;
      if (w > 900 && side) camera.setViewOffset(w, h, side * w * 0.18, 0, w, h); else camera.clearViewOffset();
      camera.updateProjectionMatrix();
    };
    new ResizeObserver(resize).observe(holder); resize();
  };
  const loop = () => {
    if (!visible || document.hidden || document.documentElement.classList.contains('playing')) { raf = 0; return; }
    raf = requestAnimationFrame(loop);
    const r = section.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, 1 - (r.top + r.height) / (innerHeight + r.height)));
    tick((performance.now() - t0) / 1000, p);
    renderer.render(scene, camera);
  };
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !renderer) init();
    if (visible && renderer && !raf) loop();
  }, { rootMargin: '200px 0px' });
  io.observe(section);
  const wake = () => { if (visible && renderer && !raf) loop(); };
  document.addEventListener('visibilitychange', wake);
  document.addEventListener('pf-resume-scenes', wake);
}
