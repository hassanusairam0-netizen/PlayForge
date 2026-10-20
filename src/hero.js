// Hero scene: a central PLAYFORGE emblem orbited by six miniature game worlds.
import * as THREE from 'three';

export function mountHero(container) {
  const low = matchMedia('(max-width: 760px)').matches || (navigator.hardwareConcurrency || 8) <= 4;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !low, alpha: true, powerPreference: 'high-performance' });
  } catch { container.classList.add('no-webgl'); return { dispose() {} }; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, low ? 1.2 : 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070b1a, 0.022);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  camera.position.set(0, 4, 26);

  scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x2a1f4a, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(8, 14, 10); scene.add(key);
  const rim = new THREE.PointLight(0x7b5cff, 60, 40); rim.position.set(-8, 2, -6); scene.add(rim);
  const warm = new THREE.PointLight(0xff7a3d, 50, 40); warm.position.set(9, -3, 4); scene.add(warm);

  const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.15, ...o });
  const G = (color, i = 2) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: i });

  // Central emblem: dimensional cube with a play glyph, wrapped in orbit rings.
  const root = new THREE.Group(); scene.add(root);
  const emblem = new THREE.Group(); root.add(emblem);
  const core = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 2.6), [
    M(0xff6b4a, { metalness: 0.4 }), M(0x6b4aff, { metalness: 0.4 }), M(0x4aa8ff, { metalness: 0.4 }),
    M(0x2a2f6a), M(0x5a8cff, { metalness: 0.4 }), M(0xff8a3d, { metalness: 0.4 }),
  ]);
  core.rotation.set(Math.atan(1 / Math.SQRT2), Math.PI / 4, 0);
  emblem.add(core);
  const tri = new THREE.Shape(); tri.moveTo(-0.6, -0.8); tri.lineTo(-0.6, 0.8); tri.lineTo(0.85, 0); tri.closePath();
  const play = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.35, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 }), G(0xffffff, 1.4));
  play.position.set(0, 0, 2.3); emblem.add(play);
  const rings = [];
  [[3.4, 0x3db8ff], [4.1, 0xff7a3d], [4.8, 0x8a5cff]].forEach(([r, c], i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 8, 120), G(c, 2.5));
    ring.rotation.set(Math.PI / 2 + i * 0.35, i * 0.6, 0); emblem.add(ring); rings.push(ring);
  });
  const halo = new THREE.Mesh(new THREE.SphereGeometry(2.3, 32, 32), new THREE.MeshBasicMaterial({ color: 0x3d6bff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }));
  emblem.add(halo);

  // Six floating worlds.
  const worlds = new THREE.Group(); root.add(worlds);
  const animated = [];
  const island = (topColor) => {
    const g = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.5, 0.35, 32), M(topColor));
    const rock = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.2, 7), M(0x3a3550, { flatShading: true }));
    rock.rotation.x = Math.PI; rock.position.y = -1.27; g.add(top, rock); return g;
  };
  const makers = [
    () => { // futuristic arena
      const g = island(0x1c2140);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.05, 6, 48), G(0xff3df0, 3)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.2; g.add(ring);
      for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.9, 0.2), M(0x2a3060, { metalness: 0.7 })); const a = i * Math.PI / 2 + 0.6; p.position.set(Math.cos(a) * 1.1, 0.6, Math.sin(a) * 1.1); g.add(p); }
      const drone = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), G(0x3db8ff, 2)); drone.position.y = 1.2; g.add(drone);
      animated.push((t) => { drone.position.set(Math.cos(t * 2) * 0.6, 1.2 + Math.sin(t * 3) * 0.15, Math.sin(t * 2) * 0.6); drone.rotation.y = t * 3; });
      return g;
    },
    () => { // racing track
      const g = island(0x3aa86b);
      const track = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.22, 4, 48), M(0x23232f)); track.rotation.x = Math.PI / 2; track.scale.set(1.2, 0.8, 0.25); track.position.y = 0.2; g.add(track);
      const curb = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.03, 4, 48), G(0xff3d3d, 1)); curb.rotation.x = Math.PI / 2; curb.scale.set(1.15, 0.8, 1); curb.position.y = 0.22; g.add(curb);
      const car = new THREE.Group(); car.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.22), M(0xff7a2f, { metalness: 0.6, roughness: 0.25 })));
      const cab = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.18), M(0x111827)); cab.position.set(-0.03, 0.11, 0); car.add(cab); g.add(car);
      animated.push((t) => { const a = t * 1.4; car.position.set(Math.cos(a) * 1.26, 0.32, Math.sin(a) * 0.84); car.rotation.y = -a - Math.PI / 2; });
      return g;
    },
    () => { // puzzle world
      const g = island(0xe8ecff);
      const cols = [0x3d6bff, 0xff8a3d, 0x5ad86b, 0xff5a6e, 0x8a5cff, 0xffd23d];
      const cubes = new THREE.Group(); cubes.position.y = 0.95; g.add(cubes);
      for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
        if ((x + y + z) % 2 === 0 && !(x === 0 && y === 0 && z === 0)) continue;
        const c = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), M(cols[(x + 2 + (y + 1) * 3 + z * 2 + 9) % 6], { roughness: 0.3 }));
        c.position.set(x * 0.38, y * 0.38, z * 0.38); cubes.add(c);
      }
      animated.push((t) => { cubes.rotation.y = t * 0.6; cubes.rotation.x = Math.sin(t * 0.5) * 0.4; });
      return g;
    },
    () => { // miniature city
      const g = island(0x6b7280);
      const cols = [0xf5f5f5, 0xffd23d, 0x8ab8ff, 0xff9a8a, 0xb8f08a];
      for (let i = 0; i < 9; i++) {
        const h = 0.3 + ((i * 37) % 10) / 10 * 1.2, x = ((i % 3) - 1) * 0.6, z = (Math.floor(i / 3) - 1) * 0.6;
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.38, h, 0.38), M(cols[i % 5], { emissive: i % 2 ? 0xffb84a : 0, emissiveIntensity: 0.25 }));
        b.position.set(x, 0.18 + h / 2, z); g.add(b);
      }
      return g;
    },
    () => { // peaceful island
      const g = new THREE.Group();
      const water = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.2, 40), M(0x2ab8d8, { transparent: true, opacity: 0.85, roughness: 0.1, metalness: 0.2 }));
      const sand = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M(0xf0d89a)); sand.scale.set(1, 0.35, 0.8); sand.position.y = 0.05;
      const rock = new THREE.Mesh(new THREE.ConeGeometry(1.7, 2, 7), M(0x3a3550, { flatShading: true })); rock.rotation.x = Math.PI; rock.position.y = -1.1;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.1, 6), M(0x8a5a3a)); trunk.position.set(0.1, 0.8, 0); trunk.rotation.z = -0.2;
      g.add(water, sand, rock, trunk);
      for (let i = 0; i < 5; i++) { const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.8, 4), M(0x2aa84a)); leaf.position.set(0.22, 1.35, 0); leaf.rotation.set(0, i * 1.25, Math.PI / 2.4); leaf.translateY(0.3); g.add(leaf); }
      return g;
    },
    () => { // physics playground
      const g = island(0xffb23d);
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.6), M(0x7b5cff)); ramp.position.set(-0.3, 0.6, 0); ramp.rotation.z = -0.4; g.add(ramp);
      const balls = [0x3db8ff, 0xff3d7a, 0xb4ff3d].map((c, i) => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), M(c, { roughness: 0.2, metalness: 0.3 })); g.add(b); return b; });
      const seesaw = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 0.3), M(0x1a1f3a)); seesaw.position.set(0.8, 0.45, 0.6); g.add(seesaw);
      animated.push((t) => {
        balls.forEach((b, i) => { const p = (t * 0.7 + i / 3) % 1; b.position.set(-0.9 + p * 1.8, 0.35 + Math.abs(Math.sin(p * Math.PI * 3)) * 0.9, -0.3 + i * 0.3); });
        seesaw.rotation.z = Math.sin(t * 2) * 0.3;
      });
      return g;
    },
  ];
  const R = 9.5;
  makers.forEach((mk, i) => {
    const w = mk(); const a = (i / makers.length) * Math.PI * 2;
    w.userData = { a, bob: Math.random() * 6, y: (i % 2 ? 1.2 : -1.0) };
    w.scale.setScalar(low ? 1.05 : 1.2);
    worlds.add(w);
  });

  // Particles
  const N = low ? 300 : 900;
  const pgeo = new THREE.BufferGeometry(), pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const palette = [new THREE.Color(0x3db8ff), new THREE.Color(0xff7a3d), new THREE.Color(0x8a5cff), new THREE.Color(0xb4ff3d)];
  for (let i = 0; i < N; i++) {
    const r = 6 + Math.random() * 30, a = Math.random() * Math.PI * 2, y = (Math.random() - 0.5) * 24;
    pos.set([Math.cos(a) * r, y, Math.sin(a) * r - 6], i * 3);
    const c = palette[i % 4]; col.set([c.r, c.g, c.b], i * 3);
  }
  pgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pgeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const stars = new THREE.Points(pgeo, new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(stars);

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = (e) => { mouse.tx = (e.clientX / innerWidth) * 2 - 1; mouse.ty = (e.clientY / innerHeight) * 2 - 1; };
  window.addEventListener('pointermove', onMove, { passive: true });

  let progress = 0; // 0..1 scroll-out progress supplied by the page
  const resize = () => {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
    camera.aspect = w / h; camera.fov = w < h ? 60 : 42; camera.updateProjectionMatrix();
    root.position.set(w / h > 1.2 ? 5.5 : 0, w < h ? 3 : 0, 0);
  };
  const ro = new ResizeObserver(resize); ro.observe(container); resize();

  let visible = true, raf = 0, t0 = performance.now();
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) loop(); });
  io.observe(container);

  function loop() {
    if (!visible || document.hidden || document.documentElement.classList.contains('playing')) { raf = 0; return; }
    raf = requestAnimationFrame(loop);
    const t = (performance.now() - t0) / 1000 * (reduce ? 0.2 : 1);
    mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
    emblem.rotation.y = t * 0.3; core.rotation.z = Math.sin(t * 0.5) * 0.1;
    rings.forEach((r, i) => { r.rotation.z = t * (0.3 + i * 0.15) * (i % 2 ? -1 : 1); });
    halo.scale.setScalar(1 + Math.sin(t * 2) * 0.05);
    worlds.children.forEach((w) => {
      const a = w.userData.a + t * 0.06;
      w.position.set(Math.cos(a) * R, w.userData.y + Math.sin(t + w.userData.bob) * 0.35, Math.sin(a) * R * 0.55 - 2);
      w.rotation.y = t * 0.2 + w.userData.bob;
    });
    animated.forEach((f) => f(t));
    stars.rotation.y = t * 0.01;
    camera.position.set(mouse.x * 2.2, 4 - mouse.y * 1.4 + progress * 6, 26 - progress * 10);
    camera.lookAt(0, progress * 3, 0);
    renderer.render(scene, camera);
  }
  const onVis = () => { if (!document.hidden && visible && !raf) loop(); };
  document.addEventListener('visibilitychange', onVis);
  document.addEventListener('pf-resume-scenes', onVis);
  loop();

  return {
    setProgress(p) { progress = p; },
    dispose() {
      cancelAnimationFrame(raf); io.disconnect(); ro.disconnect();
      window.removeEventListener('pointermove', onMove); document.removeEventListener('visibilitychange', onVis);
      renderer.dispose();
    },
  };
}
