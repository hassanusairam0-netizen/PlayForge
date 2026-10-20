// Arcade car model + physics shared by the driving games. Each game tunes grip,
// power and steering differently, so they handle very differently.
import { THREE, mat, glow, box } from './three-kit.js';
import { clamp } from './kit.js';

export function buildCar(color = 0xff3d7a, { truck = false, scale = 1 } = {}) {
  const g = new THREE.Group();
  const paint = mat(color, { metalness: 0.25, roughness: 0.3 });
  const dark = mat(0x1a2030, { metalness: 0.3, roughness: 0.2 });
  const body = new THREE.Group(); g.add(body);
  if (truck) {
    body.add(box(1.9, 0.7, 3.8, paint, 0, 0.95, 0));
    body.add(box(1.7, 0.7, 1.6, dark, 0, 1.6, -0.3));
    body.add(box(1.9, 0.12, 1.4, mat(0x222222), 0, 1.36, 1.2));
    body.add(box(1.6, 0.1, 0.1, glow(0xffe8a0, 3), 0, 1.15, -1.92));
  } else {
    body.add(box(1.8, 0.45, 4, paint, 0, 0.55, 0));
    body.add(box(1.5, 0.4, 1.8, dark, 0, 0.95, 0.2));
    body.add(box(1.9, 0.08, 0.5, paint, 0, 1.0, 1.8));
    body.add(box(1.6, 0.08, 0.06, glow(0xff2030, 3), 0, 0.62, 2.02));
    body.add(box(0.4, 0.1, 0.06, glow(0xfff0c0, 3), -0.6, 0.6, -2.02), box(0.4, 0.1, 0.06, glow(0xfff0c0, 3), 0.6, 0.6, -2.02));
  }
  const wheels = [];
  const r = truck ? 0.55 : 0.38;
  const wg = new THREE.CylinderGeometry(r, r, truck ? 0.45 : 0.32, 16); wg.rotateZ(Math.PI / 2);
  const wm = mat(0x151515, { roughness: 0.9 });
  [[-1, -1.3], [1, -1.3], [-1, 1.3], [1, 1.3]].forEach(([x, z]) => {
    const w = new THREE.Mesh(wg, wm); w.position.set(x * (truck ? 1.05 : 0.95), r, z * (truck ? 1.25 : 1)); g.add(w); wheels.push(w);
  });
  g.scale.setScalar(scale);
  g.userData = { body, wheels, r };
  return g;
}

// Car state in the XZ plane. Heading 0 faces -Z.
export function carState(x = 0, z = 0, heading = 0) { return { x, z, h: heading, vx: 0, vz: 0, speed: 0, lat: 0, slip: 0, steer: 0 }; }

export function stepCar(c, ctl, dt, p) {
  const { accel = 22, brake = 30, reverse = 10, maxSpeed = 40, drag = 0.25, grip = 8, steerRate = 2.2, handbrakeGrip = 1.2, offDrag = 0 } = p;
  const fx = -Math.sin(c.h), fz = -Math.cos(c.h), rx = Math.cos(c.h), rz = -Math.sin(c.h);
  let vf = c.vx * fx + c.vz * fz, vl = c.vx * rx + c.vz * rz;
  if (ctl.throttle > 0) vf += accel * ctl.throttle * dt * (1 - Math.max(0, vf) / maxSpeed);
  if (ctl.throttle < 0) vf += (vf > 0.5 ? -brake : -reverse) * -ctl.throttle * dt;
  if (vf < -maxSpeed * 0.3) vf = -maxSpeed * 0.3;
  vf *= 1 - (drag + offDrag) * dt;
  if (!ctl.throttle) vf *= 1 - 0.6 * dt;
  const g = ctl.handbrake ? handbrakeGrip : grip;
  vl *= Math.exp(-g * dt);
  if (ctl.handbrake) vf *= 1 - 0.8 * dt;
  c.steer += (ctl.steer - c.steer) * Math.min(1, dt * 10);
  const turn = clamp(vf / 8, -1, 1);
  c.h -= c.steer * steerRate * turn * dt * (ctl.handbrake ? 1.35 : 1);
  // Momentum: part of the forward speed carries sideways when the heading changes fast (drift feel)
  const nfx = -Math.sin(c.h), nfz = -Math.cos(c.h), nrx = Math.cos(c.h), nrz = -Math.sin(c.h);
  c.vx = nfx * vf + nrx * vl; c.vz = nfz * vf + nrz * vl;
  c.x += c.vx * dt; c.z += c.vz * dt;
  c.speed = vf; c.lat = vl; c.slip = Math.atan2(Math.abs(vl), Math.abs(vf) + 0.001);
  return c;
}

export function poseCar(mesh, c, dt, y = 0) {
  mesh.position.set(c.x, y, c.z); mesh.rotation.y = c.h;
  const { wheels, body, r } = mesh.userData;
  wheels.forEach((w, i) => { w.rotation.x -= (c.speed / r) * dt; if (i < 2) w.rotation.y = -c.steer * 0.5; });
  body.rotation.z = clamp(-c.lat * 0.02, -0.12, 0.12);
}

export function carControls(input) {
  const ax = input.axis();
  return { throttle: ax.y, steer: ax.x, handbrake: input.down('Space', 'Brake') };
}

// Build a flat ribbon mesh along a closed curve.
export function ribbon(points, width, material, y = 0.02) {
  const pos = [], idx = [], uv = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const a = points[i], b = points[(i + 1) % n];
    const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
    pos.push(a.x + nx * width / 2, y, a.z + nz * width / 2, a.x - nx * width / 2, y, a.z - nz * width / 2);
    uv.push(0, i / 4, 1, i / 4);
    const k = i * 2, k2 = ((i + 1) % n) * 2;
    idx.push(k, k2, k + 1, k + 1, k2, k2 + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}

// Nearest sample index on a sampled track (searching near the last index for speed).
export function nearest(points, x, z, hint = -1) {
  const n = points.length; let best = -1, bd = Infinity;
  const range = hint < 0 ? n : 40;
  for (let k = -range; k < range; k++) {
    const i = hint < 0 ? k + range : (hint + k + n) % n; if (i < 0 || i >= n) continue;
    const p = points[i], d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return { i: best, d: Math.sqrt(bd) };
}
