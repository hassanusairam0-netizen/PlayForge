// GAME 10 — SKY RACER: fly a jet-glider through ring gates above a sunset cloudscape.
import { createThree, THREE, mat, glow, box } from './lib/three-kit.js';
import { createInput, createHud, makeGame, clamp } from './lib/kit.js';

function seeded(s) { return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function course(k) {
  const r = seeded(7 + k * 31), rings = []; let x = 0, y = 10, z = -40, yaw = 0;
  const n = 10 + k * 4;
  for (let i = 0; i < n; i++) {
    yaw += (r() - 0.5) * (0.7 + k * 0.35); const step = 52 - k * 4;
    x += -Math.sin(yaw) * step; z += -Math.cos(yaw) * step; y = clamp(y + (r() - 0.5) * (10 + k * 8), -2, 40);
    rings.push({ x, y, z, yaw, radius: 7 - k * 1.1, boost: i % 4 === 3 });
  }
  return rings;
}
const BONUS = [4.5, 4, 3.6];

export default function create(host) {
  const T = createThree(host.el, { bg: 0xffb0c8, fov: 65, far: 1500, fog: [0xffc8d8, 150, 700] });
  const { scene, camera } = T;
  const input = createInput(host.el, { touch: { stick: true, buttons: [{ label: 'BOOST', key: 'ShiftLeft' }] } });
  const hud = createHud(host.el);
  scene.add(new THREE.HemisphereLight(0xffe0f0, 0xff9a6a, 1.1));
  const sun = new THREE.DirectionalLight(0xfff0d0, 1.4); sun.position.set(-100, 80, -200); scene.add(sun);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1200, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, fog: false, depthWrite: false,
    vertexShader: 'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec3 p;void main(){float h=normalize(p).y;vec3 c=mix(vec3(1.,.72,.55),vec3(.45,.55,.95),smoothstep(-.05,.5,h));c=mix(c,vec3(1.,.85,.6),pow(max(0.,dot(normalize(p),normalize(vec3(-.4,.15,-.9)))),24.));gl_FragColor=vec4(c,1.);}' }));
  scene.add(sky);
  // Cloud sea + floating cloud clusters (instanced spheres)
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), mat(0xfff0f4, { roughness: 1 })); sea.rotation.x = -Math.PI / 2; sea.position.y = -32; scene.add(sea);
  const NC = T.low ? 260 : 600, clouds = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), mat(0xffffff, { roughness: 1, emissive: 0xffd0e0, emissiveIntensity: 0.25 }), NC);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), r = seeded(99);
  for (let i = 0; i < NC; i++) {
    const cx = (r() - 0.5) * 1400, cz = (r() - 0.5) * 1400 - 300, cy = i % 3 ? -30 + r() * 8 : -10 + r() * 50, s = 8 + r() * 18;
    m4.compose(new THREE.Vector3(cx, cy, cz), q, new THREE.Vector3(s * 1.6, s * 0.7, s)); clouds.setMatrixAt(i, m4);
  }
  scene.add(clouds);

  // Aircraft
  const plane = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.ConeGeometry(0.7, 5, 12), mat(0x2a3a6a, { metalness: 0.6, roughness: 0.3 })); hull.rotation.x = -Math.PI / 2; plane.add(hull);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(7, 0.12, 1.6), mat(0x7bd8ff, { metalness: 0.4, roughness: 0.3 })); wing.position.z = 0.6; plane.add(wing);
  plane.add(box(2.4, 0.1, 0.8, mat(0x7bd8ff), 0, 0.1, 2.1), box(0.1, 1.1, 0.9, mat(0xff8adb), 0, 0.6, 2.1));
  plane.add(box(0.08, 0.08, 0.5, glow(0xff3d3d, 3), -3.5, 0, 0.6), box(0.08, 0.08, 0.5, glow(0x3dff6a, 3), 3.5, 0, 0.6));
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.8, 10), new THREE.MeshBasicMaterial({ color: 0xffb0ff, transparent: true, opacity: 0.8 })); flame.rotation.x = Math.PI / 2; flame.position.z = 3.3; plane.add(flame);
  scene.add(plane);

  const ringGeo = new THREE.TorusGeometry(1, 0.08, 10, 48);
  let rings = [], ringMeshes = [], courseIdx = 0, next = 0, timeLeft = 14, total = 0, score = 0, boost = 1, done = false, banner = 2.2;
  const pos = new THREE.Vector3(0, 10, 0), quat = new THREE.Quaternion(), vel = new THREE.Vector3();
  let rollIn = 0, pitchIn = 0, lastLocal = null;

  function loadCourse(k) {
    ringMeshes.forEach((m) => scene.remove(m));
    rings = course(k); next = 0; banner = 2.2;
    ringMeshes = rings.map((rg) => {
      const m = new THREE.Mesh(ringGeo, glow(rg.boost ? 0x3db8ff : 0xffffff, 1.5)); m.scale.setScalar(rg.radius); m.position.set(rg.x, rg.y, rg.z); m.rotation.y = rg.yaw; scene.add(m); return m;
    });
    pos.set(0, 10, 20); quat.identity(); lastLocal = null;
  }
  loadCourse(0);

  const fwd = new THREE.Vector3(), tmp = new THREE.Vector3(), inv = new THREE.Quaternion();
  const update = (dt, t) => {
    total += dt; banner -= dt;
    const ax = input.axis();
    rollIn += (ax.x - rollIn) * Math.min(1, dt * 5); pitchIn += (ax.y - pitchIn) * Math.min(1, dt * 5);
    const boosting = input.down('ShiftLeft', 'ShiftRight') && boost > 0;
    boost = clamp(boost + (boosting ? -0.35 : 0.04) * dt, 0, 1);
    const speed = boosting ? 68 : 40;
    // Bank-to-turn flight model
    const e = new THREE.Euler().setFromQuaternion(quat, 'YXZ');
    e.y -= rollIn * 1.4 * dt; e.x = clamp(e.x + pitchIn * 1.3 * dt, -1.1, 1.1); e.z += (-rollIn * 0.9 - e.z) * Math.min(1, dt * 4);
    quat.setFromEuler(e);
    fwd.set(0, 0, -1).applyQuaternion(quat);
    pos.addScaledVector(fwd, speed * dt);
    if (pos.y < -18) { pos.y = -18; }
    plane.position.copy(pos); plane.quaternion.copy(quat);
    flame.scale.set(1, boosting ? 1.8 : 1, 1); flame.material.color.setHex(boosting ? 0x7bd8ff : 0xffb0ff);

    // Ring passing — check the plane crossing the ring's plane inside its radius.
    const rg = rings[next], rm = ringMeshes[next];
    ringMeshes.forEach((m, i) => { m.material.emissive.setHex(i === next ? 0xffd23d : rings[i].boost ? 0x3db8ff : 0xffffff); m.material.emissiveIntensity = i === next ? 2.5 + Math.sin(t * 8) : i < next ? 0.2 : 1.2; m.visible = i >= next; });
    if (rg) {
      inv.copy(rm.quaternion).invert();
      const local = tmp.copy(pos).sub(rm.position).applyQuaternion(inv);
      if (lastLocal && Math.sign(local.z) !== Math.sign(lastLocal) && Math.hypot(local.x, local.y) < rg.radius * 1.05) {
        next++; timeLeft += BONUS[courseIdx]; score += 100 + Math.round(timeLeft * 5); host.sfx('coin');
        if (rg.boost) { boost = 1; host.sfx('success'); }
        lastLocal = null;
        if (next >= rings.length) {
          courseIdx++; score += 1000; host.sfx('win');
          if (courseIdx >= 3) { if (!done) { done = true; host.end({ won: true, score: score + Math.round(timeLeft * 50), title: 'Sky champion', msg: `All three courses flown in ${total.toFixed(1)}s.` }); } }
          else { loadCourse(courseIdx); timeLeft = 14; }
        }
      } else lastLocal = Math.abs(local.z) < 30 ? local.z : null;
    }
    timeLeft -= dt;
    if (timeLeft <= 0 && !done) { done = true; host.end({ won: false, score, title: 'Out of time', msg: `Reached course ${courseIdx + 1}, ring ${next + 1} of ${rings.length}.` }); }

    // Chase camera
    const camOff = new THREE.Vector3(0, 3.2, 12).applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(e.x * 0.6, e.y, 0, 'YXZ')));
    camera.position.lerp(tmp.copy(pos).add(camOff), 1 - Math.exp(-dt * 6));
    camera.lookAt(pos.x + fwd.x * 10, pos.y + fwd.y * 10 + 1, pos.z + fwd.z * 10);
    camera.fov = 65 + (boosting ? 12 : 0) * 0.9 + (camera.fov - 65) * 0.1; camera.updateProjectionMatrix();

    // Direction arrow to next ring
    let arrow = '';
    if (rg) { const d = tmp.set(rg.x, rg.y, rg.z).project(camera); const off = Math.abs(d.x) > 0.9 || Math.abs(d.y) > 0.9 || d.z > 1; if (off) { const a = Math.atan2(d.z > 1 ? -d.y : d.y, d.z > 1 ? -d.x : d.x); arrow = `<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(${-a + Math.PI / 2}rad) translateY(-120px);font-size:40px;color:#ffd23d">▲</div>`; } }
    host.score(score); host.status(`Course ${Math.min(3, courseIdx + 1)}/3`);
    hud.set(`<div class="row"><span class="pill" style="font-size:18px;color:${timeLeft < 4 ? '#ff3d3d' : '#fff'}">⏱ ${Math.max(0, timeLeft).toFixed(1)}</span><span class="pill">Ring ${Math.min(next + 1, rings.length)}/${rings.length}</span><span class="pill">${Math.round(speed * 9)} km/h</span></div>
      <div class="g-bar"><span>Boost</span><i><b style="width:${boost * 100}%;background:#3db8ff"></b></i></div>
      ${arrow}${banner > 0 ? `<div class="center">COURSE ${courseIdx + 1}</div>` : ''}${pos.y <= -17.9 ? '<div class="hint">Pull up!</div>' : ''}`);
    T.render(); input.endFrame();
  };
  return makeGame(update, () => { input.destroy(); hud.remove(); T.dispose(); });
}
