// GAME 04 — ROOFTOP DUEL: best-of-three energy blade duel against an AI rival.
import { createThree, THREE, mat, glow, box } from './lib/three-kit.js';
import { createInput, createHud, makeGame, clamp, rand } from './lib/kit.js';

const EDGE = 9;

function fighter(scene, color, dir) {
  const g = new THREE.Group();
  const m = mat(0x4a4a66, { metalness: 0.2, roughness: 0.5 }), trim = glow(color, 2);
  const torso = box(0.7, 1, 0.4, m, 0, 1.55, 0); g.add(torso);
  g.add(box(0.72, 0.08, 0.42, trim, 0, 1.75, 0));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), m); head.position.y = 2.32; g.add(head);
  g.add(box(0.36, 0.08, 0.1, trim, 0.06 * dir, 2.34, 0.22));
  const legL = box(0.22, 0.9, 0.24, m, -0.18, 0.55, 0), legR = box(0.22, 0.9, 0.24, m, 0.18, 0.55, 0); g.add(legL, legR);
  const arm = new THREE.Group(); arm.position.set(0.1 * dir, 1.9, 0.3); g.add(arm);
  arm.add(box(0.18, 0.7, 0.18, m, 0, -0.35, 0));
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.4, 0.07), glow(color, 4)); blade.position.set(0, -0.6, 0.7); blade.rotation.x = Math.PI / 2; arm.add(blade);
  const light = new THREE.PointLight(color, 6, 4); light.position.set(0, 1.5, 0.6); g.add(light);
  g.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  scene.add(g);
  return { g, arm, blade, legL, legR, torso, x: -4 * dir, vx: 0, hp: 100, dir, facing: dir, state: 'idle', st: 0, dodgeCd: 0, boltCd: 0, hitFlash: 0, color };
}

export default function create(host) {
  const T = createThree(host.el, { bg: 0x1a1030, fov: 45, fog: [0x2a1a40, 20, 70] });
  const { scene, camera } = T;
  const input = createInput(host.el, { touch: { stick: true, buttons: [{ label: 'STRIKE', key: 'KeyJ' }, { label: 'DODGE', key: 'KeyK' }, { label: 'BOLT', key: 'KeyL' }] } });
  const hud = createHud(host.el);
  scene.add(new THREE.HemisphereLight(0xff9ad0, 0x1a0a20, 0.6));
  const moon = new THREE.DirectionalLight(0xc8b8ff, 1.4); moon.position.set(-5, 10, 8); scene.add(moon);
  const fill = new THREE.DirectionalLight(0xffb08a, 0.8); fill.position.set(4, 3, 10); scene.add(fill);
  // Sky gradient + skyline
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(200, 60), new THREE.ShaderMaterial({ fog: false, uniforms: {}, vertexShader: 'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'varying vec2 v;void main(){gl_FragColor=vec4(mix(vec3(1.,.45,.25),vec3(.1,.06,.2),smoothstep(0.,.7,v.y)),1.);}' }));
  sky.position.set(0, 10, -60); scene.add(sky);
  for (let i = 0; i < 40; i++) {
    const h = rand(6, 26), b = box(rand(3, 6), h, 4, mat(0x140a22), rand(-60, 60), h / 2 - 8, rand(-50, -20)); scene.add(b);
    if (Math.random() < 0.4) scene.add(box(1.5, 0.4, 0.1, glow([0xff3d7a, 0x3dd8ff, 0xffd23d][i % 3], 2), b.position.x, b.position.y + rand(-2, h / 2 - 1), b.position.z + 2.05));
  }
  // Roof
  scene.add(box(EDGE * 2 + 3, 1, 6, mat(0x2a2a34, { roughness: 0.3, metalness: 0.4 }), 0, -0.5, 0));
  scene.add(box(EDGE * 2 + 3, 0.6, 0.2, mat(0x3a3a48), 0, 0.3, -3), box(0.3, 1.4, 6, mat(0x3a3a48), -EDGE - 1.3, 0.7, 0), box(0.3, 1.4, 6, mat(0x3a3a48), EDGE + 1.3, 0.7, 0));
  scene.add(box(2, 2, 2, mat(0x30303a), -6, 1, -2.2), box(1.4, 0.8, 1.4, mat(0x40404a), 5, 0.4, -2.3));
  const sign = box(3, 0.9, 0.2, glow(0xff3d7a, 2.5), -6, 2.6, -2.9); scene.add(sign);
  // Rain
  const N = T.low ? 300 : 800, rg = new THREE.BufferGeometry(), rp = new Float32Array(N * 6);
  for (let i = 0; i < N; i++) { const x = rand(-20, 20), y = rand(-1, 20), z = rand(-8, 8); rp.set([x, y, z, x - 0.05, y - 0.5, z], i * 6); }
  rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0x9ab0ff, transparent: true, opacity: 0.35 })); scene.add(rain);

  camera.position.set(0, 3.2, 13); camera.lookAt(0, 1.6, 0);

  let P, A, bolts = [], round = 1, wins = [0, 0], roundT = 45, phase = 'intro', phaseT = 1.6, msg = 'ROUND 1', done = false, totalHits = 0;
  const reset = () => {
    [P, A].forEach((f) => f && scene.remove(f.g));
    bolts.forEach((b) => scene.remove(b.m)); bolts = [];
    P = fighter(scene, 0x3dd8ff, 1); A = fighter(scene, 0xff3d7a, -1);
    A.ai = { think: 0, plan: 'approach', react: Math.max(0.12, 0.35 - round * 0.06) };
    roundT = 45;
  };
  reset();

  const act = (f, s) => {
    if (s === 'strike' && f.state === 'idle') { f.state = 'strike'; f.st = 0.32; f.hitDone = false; host.sfx('slice'); }
    if (s === 'dodge' && f.dodgeCd <= 0 && f.state !== 'dodge') { f.state = 'dodge'; f.st = 0.28; f.dodgeCd = 0.9; f.vx = -f.facing * 14; }
    if (s === 'bolt' && f.boltCd <= 0 && f.state === 'idle') {
      f.boltCd = 3; f.state = 'cast'; f.st = 0.2; host.sfx('laser');
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), glow(f.color, 4)); m.position.set(f.x + f.facing * 0.8, 1.7, 0.3); scene.add(m);
      bolts.push({ m, vx: f.facing * 12, owner: f });
    }
  };
  const damage = (f, n, from) => {
    if (f.state === 'dodge') return false;
    f.hp = Math.max(0, f.hp - n); f.hitFlash = 0.2; f.vx = from.facing * 9; f.state = 'stun'; f.st = 0.25; host.sfx('hit'); return true;
  };

  const step = (f, dt, moveX) => {
    const o = f === P ? A : P; f.facing = Math.sign(o.x - f.x) || f.dir;
    f.dodgeCd -= dt; f.boltCd -= dt; f.st -= dt; f.hitFlash -= dt;
    if (f.state !== 'idle' && f.st <= 0) f.state = 'idle';
    if (f.state === 'idle' || f.state === 'strike') f.vx += ((moveX * 5.5) - f.vx) * Math.min(1, dt * 12);
    else f.vx *= Math.pow(0.02, dt);
    f.x = clamp(f.x + f.vx * dt, -EDGE, EDGE);
    if (Math.abs(f.x - o.x) < 0.9) f.x = o.x - f.facing * 0.9;
    if (f.state === 'strike' && !f.hitDone && f.st < 0.2) {
      f.hitDone = true;
      if (Math.abs(o.x - f.x) < 2.3) { if (damage(o, 11, f)) { if (f === P) totalHits++; } }
    }
    // Pose
    f.g.position.set(f.x, 0, 0); f.g.rotation.y = f.facing > 0 ? Math.PI / 2 : -Math.PI / 2;
    const walk = Math.abs(f.vx) > 0.5 ? Math.sin(performance.now() / 90) * 0.5 : 0;
    f.legL.rotation.x = walk; f.legR.rotation.x = -walk;
    f.arm.rotation.x = f.state === 'strike' ? -2.2 + (0.32 - f.st) * 9 : f.state === 'cast' ? -1.4 : -0.4;
    f.g.rotation.z = f.state === 'dodge' ? 0.4 * -f.facing : 0;
    f.torso.material.emissive?.setHex(f.hitFlash > 0 ? 0x661111 : 0x000000);
  };

  const aiInput = (dt) => {
    const ai = A.ai, d = Math.abs(P.x - A.x);
    ai.think -= dt;
    if (P.state === 'strike' && d < 2.6 && Math.random() < dt * (3 + round * 2)) act(A, 'dodge');
    if (ai.think <= 0) {
      ai.think = ai.react + rand(0, 0.25);
      if (A.hp < 35 && d < 3 && Math.random() < 0.3) ai.plan = 'retreat';
      else if (d > 6 && A.boltCd <= 0 && Math.random() < 0.5) ai.plan = 'bolt';
      else ai.plan = d < 2.1 ? 'strike' : 'approach';
    }
    let mx = 0;
    if (ai.plan === 'approach') mx = Math.sign(P.x - A.x);
    if (ai.plan === 'retreat') mx = -Math.sign(P.x - A.x);
    if (ai.plan === 'strike') { act(A, 'strike'); ai.plan = 'wait'; }
    if (ai.plan === 'bolt') { act(A, 'bolt'); ai.plan = 'wait'; }
    for (const b of bolts) if (b.owner === P && Math.abs(b.m.position.x - A.x) < 3 && Math.random() < dt * 6) act(A, 'dodge');
    return mx;
  };

  const update = (dt, t) => {
    const ax = input.axis();
    if (phase === 'fight') {
      if (input.pressed('KeyJ') || (input.pointer.clicked && !host.touch)) act(P, 'strike');
      if (input.pressed('KeyK', 'ShiftLeft')) act(P, 'dodge');
      if (input.pressed('KeyL')) act(P, 'bolt');
      step(P, dt, ax.x); step(A, dt, aiInput(dt));
      roundT -= dt;
      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i]; b.m.position.x += b.vx * dt; const tgt = b.owner === P ? A : P;
        if (Math.abs(b.m.position.x - tgt.x) < 0.6) { if (damage(tgt, 14, b.owner)) { scene.remove(b.m); bolts.splice(i, 1); if (b.owner === P) totalHits++; continue; } }
        if (Math.abs(b.m.position.x) > EDGE + 3) { scene.remove(b.m); bolts.splice(i, 1); }
      }
      if (P.hp <= 0 || A.hp <= 0 || roundT <= 0) {
        const pw = P.hp > A.hp; wins[pw ? 0 : 1]++; phase = 'over'; phaseT = 2.2;
        msg = pw ? 'ROUND WON' : 'ROUND LOST'; host.sfx(pw ? 'success' : 'error');
      }
    } else {
      step(P, dt, 0); step(A, dt, 0);
      phaseT -= dt;
      if (phaseT <= 0) {
        if (phase === 'intro') phase = 'fight';
        else if (wins[0] === 2 || wins[1] === 2) {
          if (!done) { done = true; const won = wins[0] === 2; host.end({ won, score: wins[0] * 1000 + totalHits * 50 + Math.round(P.hp) * 5, title: won ? 'Rooftop champion' : 'Defeated', msg: `Rounds ${wins[0]} – ${wins[1]} · ${totalHits} clean hits landed.` }); }
        } else { round++; reset(); phase = 'intro'; phaseT = 1.6; msg = `ROUND ${round}`; }
      }
    }
    // Rain
    const pos = rg.attributes.position.array;
    for (let i = 0; i < N; i++) { pos[i * 6 + 1] -= 25 * dt; pos[i * 6 + 4] -= 25 * dt; if (pos[i * 6 + 1] < -1) { pos[i * 6 + 1] += 21; pos[i * 6 + 4] += 21; } }
    rg.attributes.position.needsUpdate = true;
    sign.material.emissiveIntensity = 2 + Math.sin(t * 13) * (Math.sin(t * 0.7) > 0.8 ? 1.5 : 0.1);
    camera.position.x += ((P.x + A.x) / 2 * 0.5 - camera.position.x) * Math.min(1, dt * 3);
    camera.lookAt(camera.position.x, 1.6, 0);

    host.score(wins[0] * 1000 + totalHits * 50); host.status(`Round ${round} · ${wins[0]}–${wins[1]}`);
    const hb = (f, name, right) => `<div style="flex:1;max-width:340px;text-align:${right ? 'right' : 'left'}"><div style="font-size:12px;letter-spacing:.14em">${name}</div><div style="height:12px;border-radius:8px;background:#0006;overflow:hidden;margin-top:4px;direction:${right ? 'rtl' : 'ltr'}"><div style="height:100%;width:${f.hp}%;background:${right ? '#ff3d7a' : '#3dd8ff'};transition:width .2s"></div></div></div>`;
    hud.set(`<div class="row" style="width:100%;justify-content:space-between;align-items:center">${hb(P, 'YOU ' + '●'.repeat(wins[0]), false)}<span class="pill" style="font-size:20px">${Math.max(0, Math.ceil(roundT))}</span>${hb(A, '●'.repeat(wins[1]) + ' RIVAL', true)}</div>
      <div class="row"><span class="pill">Bolt ${P.boltCd > 0 ? P.boltCd.toFixed(1) + 's' : 'READY'}</span><span class="pill">Dodge ${P.dodgeCd > 0 ? '…' : 'READY'}</span></div>
      ${phase !== 'fight' ? `<div class="center">${phase === 'intro' ? msg + '<br><small style="font-size:18px">FIGHT!</small>' : msg}</div>` : ''}`);
    T.render(); input.endFrame();
  };
  return makeGame(update, () => { input.destroy(); hud.remove(); T.dispose(); });
}
