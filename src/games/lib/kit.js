// Shared building blocks for game modules: loop, input, touch controls, HUD, 2D canvas.
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];
export const isTouch = () => matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

export function createLoop(update) {
  let raf = 0, last = 0, running = false;
  const frame = (t) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((t - last) / 1000, 0.05); last = t;
    update(dt, t / 1000);
  };
  return {
    start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); },
    stop() { cancelAnimationFrame(raf); running = false; },
    get running() { return running; },
  };
}

// Standard game object built from an update function and optional cleanup.
export function makeGame(update, cleanup, hooks = {}) {
  const loop = createLoop(update);
  return {
    start() { loop.start(); hooks.start?.(); },
    pause() { loop.stop(); hooks.pause?.(); },
    resume() { loop.start(); hooks.resume?.(); },
    destroy() { loop.stop(); cleanup?.(); },
  };
}

const GAME_KEYS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab']);

// Keyboard + pointer + optional on-screen touch controls.
// opts.touch: { stick: true, stick2: false, buttons: [{ label, key }] }
export function createInput(el, opts = {}) {
  const keys = new Set(), pressed = new Set();
  const stick = { x: 0, y: 0, active: false }, stick2 = { x: 0, y: 0, active: false };
  const pointer = { x: 0, y: 0, down: false, nx: 0, ny: 0, dx: 0, dy: 0, clicked: false };
  const kd = (e) => {
    if (e.target.closest?.('input,textarea')) return;
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (!keys.has(e.code)) pressed.add(e.code);
    keys.add(e.code);
  };
  const ku = (e) => keys.delete(e.code);
  const blur = () => keys.clear();
  const pm = (e) => {
    const r = el.getBoundingClientRect();
    pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
    pointer.nx = (pointer.x / r.width) * 2 - 1; pointer.ny = -(pointer.y / r.height) * 2 + 1;
    pointer.dx += e.movementX || 0; pointer.dy += e.movementY || 0;
  };
  const pd = (e) => { if (e.target.closest('.tc')) return; pm(e); pointer.down = true; pointer.clicked = true; };
  const pu = () => { pointer.down = false; };
  const pl = (e) => { if (e.pointerType === 'mouse') pointer.nx = pointer.ny = 0; };
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); window.addEventListener('blur', blur);
  el.addEventListener('pointermove', pm); el.addEventListener('pointerdown', pd); window.addEventListener('pointerup', pu); el.addEventListener('pointerleave', pl);

  const touchEls = [];
  const t = opts.touch;
  if (t && isTouch()) {
    const mkStick = (side, s) => {
      const base = document.createElement('div'); base.className = `tc tc-stick ${side}`;
      const knob = document.createElement('div'); knob.className = 'tc-knob'; base.appendChild(knob);
      let id = null, cx = 0, cy = 0;
      const move = (e) => {
        if (e.pointerId !== id) return;
        let dx = e.clientX - cx, dy = e.clientY - cy; const m = Math.hypot(dx, dy), R = 50;
        if (m > R) { dx = dx / m * R; dy = dy / m * R; }
        s.x = dx / R; s.y = -dy / R; knob.style.transform = `translate(${dx}px,${dy}px)`;
      };
      base.addEventListener('pointerdown', (e) => {
        e.preventDefault(); id = e.pointerId; base.setPointerCapture(id);
        const r = base.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; s.active = true; move(e);
      });
      base.addEventListener('pointermove', move);
      const end = (e) => { if (e.pointerId !== id) return; id = null; s.x = s.y = 0; s.active = false; knob.style.transform = ''; };
      base.addEventListener('pointerup', end); base.addEventListener('pointercancel', end);
      el.appendChild(base); touchEls.push(base);
    };
    if (t.stick) mkStick('left', stick);
    if (t.stick2) mkStick('right', stick2);
    if (t.buttons?.length) {
      const wrap = document.createElement('div'); wrap.className = 'tc tc-buttons' + (t.stick2 ? ' mid' : '');
      for (const b of t.buttons) {
        const btn = document.createElement('button'); btn.className = 'tc-btn'; btn.textContent = b.label;
        btn.addEventListener('pointerdown', (e) => { e.preventDefault(); btn.setPointerCapture(e.pointerId); if (!keys.has(b.key)) pressed.add(b.key); keys.add(b.key); btn.classList.add('on'); });
        const up = () => { keys.delete(b.key); btn.classList.remove('on'); };
        btn.addEventListener('pointerup', up); btn.addEventListener('pointercancel', up);
        wrap.appendChild(btn);
      }
      el.appendChild(wrap); touchEls.push(wrap);
    }
  }

  const down = (...codes) => codes.some((c) => keys.has(c));
  return {
    keys, pointer, stick, stick2, down,
    pressed: (...codes) => codes.some((c) => pressed.has(c)),
    axis() {
      const x = (down('KeyD', 'ArrowRight') ? 1 : 0) - (down('KeyA', 'ArrowLeft') ? 1 : 0) + stick.x;
      const y = (down('KeyW', 'ArrowUp') ? 1 : 0) - (down('KeyS', 'ArrowDown') ? 1 : 0) + stick.y;
      return { x: clamp(x, -1, 1), y: clamp(y, -1, 1) };
    },
    // Call at the end of each frame to reset edge-triggered state.
    endFrame() { pressed.clear(); pointer.clicked = false; pointer.dx = pointer.dy = 0; },
    destroy() {
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('blur', blur);
      el.removeEventListener('pointermove', pm); el.removeEventListener('pointerdown', pd); window.removeEventListener('pointerup', pu); el.removeEventListener('pointerleave', pl);
      touchEls.forEach((n) => n.remove());
    },
  };
}

// Lightweight DOM HUD layered over the game canvas.
export function createHud(el, cls = '') {
  const hud = document.createElement('div'); hud.className = 'g-hud ' + cls; el.appendChild(hud);
  return { el: hud, set(html) { if (hud._h !== html) { hud.innerHTML = html; hud._h = html; } }, remove: () => hud.remove() };
}
export const bar = (label, v, color) =>
  `<div class="g-bar"><span>${label}</span><i><b style="width:${clamp(v, 0, 1) * 100}%;background:${color}"></b></i></div>`;

// Fixed-resolution 2D canvas, letterboxed to fit the stage.
export function createCanvas(el, W, H, { bg = '#000' } = {}) {
  const canvas = document.createElement('canvas'); canvas.className = 'g-canvas2d';
  canvas.style.background = bg;
  el.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let scale = 1;
  const fit = () => {
    const r = el.getBoundingClientRect(); if (!r.width) return;
    scale = Math.min(r.width / W, r.height / H);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.style.width = W * scale + 'px'; canvas.style.height = H * scale + 'px';
    canvas.width = Math.round(W * scale * dpr); canvas.height = Math.round(H * scale * dpr);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  };
  const ro = new ResizeObserver(fit); ro.observe(el); fit();
  return {
    canvas, ctx, W, H,
    toLocal(e) { const r = canvas.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }; },
    dispose() { ro.disconnect(); canvas.remove(); },
  };
}

// Floating text / particle helper for 2D games.
export function particles2D() {
  const list = [];
  return {
    list,
    burst(x, y, color, n = 12, speed = 200, life = 0.6, size = 4) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.7);
        list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, color, size });
      }
    },
    text(x, y, txt, color = '#fff') { list.push({ x, y, vx: 0, vy: -60, life: 0.9, max: 0.9, color, txt }); },
    update(dt, g = 300) {
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i]; p.life -= dt; if (p.life <= 0) { list.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt; if (!p.txt) p.vy += g * dt;
      }
    },
    draw(ctx) {
      for (const p of list) {
        ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color;
        if (p.txt) { ctx.font = 'bold 22px Space Grotesk, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(p.txt, p.x, p.y); }
        else ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;
    },
  };
}
