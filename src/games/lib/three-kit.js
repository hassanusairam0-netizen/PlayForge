// Three.js scaffolding shared by the 3D games: renderer, resize handling, disposal.
import * as THREE from 'three';
export { THREE };

export function createThree(el, { bg = 0x000000, fov = 60, near = 0.1, far = 1000, fog, shadows = false } = {}) {
  const low = matchMedia('(max-width: 760px)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: !low, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, low ? 1.25 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = shadows && !low;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'g-canvas3d';
  el.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);
  if (fog) scene.fog = new THREE.Fog(fog[0], fog[1], fog[2]);
  const camera = new THREE.PerspectiveCamera(fov, 1, near, far);
  const resize = () => {
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
    camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize); ro.observe(el); resize();
  return {
    THREE, renderer, scene, camera, low,
    render: () => renderer.render(scene, camera),
    dispose() {
      ro.disconnect();
      scene.traverse((o) => {
        o.geometry?.dispose();
        const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach((mm) => { mm.map?.dispose(); mm.dispose(); });
      });
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    },
  };
}

export const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1, ...o });
export const glow = (color, intensity = 2) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4 });
export function box(w, h, d, m, x = 0, y = 0, z = 0) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); return b; }

export function lights(scene, { hemi = [0xbfd8ff, 0x202030, 0.9], sun = [0xffffff, 1.4], pos = [20, 40, 15], shadow = false, size = 40 } = {}) {
  const h = new THREE.HemisphereLight(...hemi); scene.add(h);
  const d = new THREE.DirectionalLight(...sun); d.position.set(...pos); scene.add(d);
  if (shadow) {
    d.castShadow = true; d.shadow.mapSize.set(1024, 1024);
    const c = d.shadow.camera; c.left = c.bottom = -size; c.right = c.top = size; c.far = 200;
  }
  return d;
}

// Canvas-generated textures (grids, noise) so no image assets are needed.
export function canvasTexture(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  t.anisotropy = 4;
  return t;
}

export function gridTexture(bg = '#0a0f24', line = '#2a6bff', n = 8, repeat = [20, 20]) {
  return canvasTexture(256, 256, (g, w) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, w); g.strokeStyle = line; g.lineWidth = 2;
    for (let i = 0; i <= n; i++) { const p = (i / n) * w; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, w); g.moveTo(0, p); g.lineTo(w, p); g.stroke(); }
  }, repeat);
}

// Simple 3D particle burst pool.
export function sparks(scene, color = 0xffaa33, max = 200) {
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(max * 3), vel = [], life = new Float32Array(max);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color, size: 0.25, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(geo, m); pts.frustumCulled = false; scene.add(pts);
  for (let i = 0; i < max; i++) { vel.push(new THREE.Vector3()); pos[i * 3 + 1] = -999; }
  let idx = 0;
  return {
    burst(p, n = 20, s = 8) {
      for (let k = 0; k < n; k++) {
        const i = idx++ % max; pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
        vel[i].set(Math.random() - 0.5, Math.random() - 0.2, Math.random() - 0.5).normalize().multiplyScalar(s * (0.3 + Math.random())); life[i] = 0.7;
      }
    },
    update(dt) {
      for (let i = 0; i < max; i++) {
        if (life[i] <= 0) continue; life[i] -= dt;
        if (life[i] <= 0) { pos[i * 3 + 1] = -999; continue; }
        vel[i].y -= 15 * dt; pos[i * 3] += vel[i].x * dt; pos[i * 3 + 1] += vel[i].y * dt; pos[i * 3 + 2] += vel[i].z * dt;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

// Smooth chase camera helper.
export function follow(camera, target, offset, dt, stiff = 5, look = target) {
  camera.position.lerp(offset, 1 - Math.exp(-stiff * dt));
  camera.lookAt(look);
}
