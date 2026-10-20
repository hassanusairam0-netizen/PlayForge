// Procedural card artwork — each game gets a miniature scene of its actual gameplay.
// drawThumb(game, ctx, w, h, t): t is time in seconds (animated on hover).
const TAU = Math.PI * 2;

function bg(c, w, h, a, b, dir = 'v') {
  const g = dir === 'v' ? c.createLinearGradient(0, 0, 0, h) : c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.7);
  g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(0, 0, w, h);
}
function floorGrid(c, w, h, horizon, color, t = 0, n = 14) {
  c.strokeStyle = color; c.lineWidth = 1;
  for (let i = -n; i <= n; i++) { c.beginPath(); c.moveTo(w / 2 + i * 8, horizon); c.lineTo(w / 2 + i * w * 0.18, h); c.stroke(); }
  for (let i = 0; i < 10; i++) { const p = ((i + (t * 2) % 1) / 10) ** 2; const y = horizon + p * (h - horizon); c.globalAlpha = p; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  c.globalAlpha = 1;
}
function glowCircle(c, x, y, r, color, blur = 20) { c.save(); c.shadowColor = color; c.shadowBlur = blur; c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore(); }
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function car(c, x, y, s, color, ang = 0) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
  c.fillStyle = 'rgba(0,0,0,.35)'; rr(c, -22, -10, 46, 24, 6); c.fill();
  c.fillStyle = color; rr(c, -24, -12, 48, 22, 7); c.fill();
  c.fillStyle = '#0c1424'; rr(c, -6, -9, 18, 16, 4); c.fill();
  c.fillStyle = '#fff8c0'; c.fillRect(20, -10, 4, 5); c.fillRect(20, 4, 4, 5);
  c.restore();
}
function iso(c, x, y, s, h, top, left, right) {
  c.fillStyle = left; c.beginPath(); c.moveTo(x - s, y); c.lineTo(x, y + s / 2); c.lineTo(x, y + s / 2 - h); c.lineTo(x - s, y - h); c.fill();
  c.fillStyle = right; c.beginPath(); c.moveTo(x + s, y); c.lineTo(x, y + s / 2); c.lineTo(x, y + s / 2 - h); c.lineTo(x + s, y - h); c.fill();
  c.fillStyle = top; c.beginPath(); c.moveTo(x, y - s / 2 - h); c.lineTo(x + s, y - h); c.lineTo(x, y + s / 2 - h); c.lineTo(x - s, y - h); c.fill();
}

const art = {
  'neon-strike'(c, w, h, t) {
    bg(c, w, h, '#05081a', '#1a0b33'); floorGrid(c, w, h, h * 0.55, '#3db8ff88', t);
    for (let i = 0; i < 3; i++) {
      const x = w * (0.25 + i * 0.25) + Math.sin(t * 2 + i) * 20, y = h * 0.38 + Math.cos(t * 3 + i * 2) * 8;
      c.fillStyle = '#23263a'; rr(c, x - 16, y - 12, 32, 24, 6); c.fill();
      glowCircle(c, x, y, 6, '#ff3df0', 16); c.fillStyle = '#ff3df066'; c.fillRect(x - 22, y - 2, 6, 4); c.fillRect(x + 16, y - 2, 6, 4);
    }
    c.strokeStyle = '#7ff'; c.lineWidth = 2; const cx = w / 2, cy = h * 0.42;
    c.beginPath(); c.arc(cx, cy, 12, 0, TAU); c.moveTo(cx - 20, cy); c.lineTo(cx - 6, cy); c.moveTo(cx + 6, cy); c.lineTo(cx + 20, cy); c.stroke();
    c.fillStyle = '#1b2440'; c.beginPath(); c.moveTo(w * 0.62, h); c.lineTo(w * 0.7, h * 0.72); c.lineTo(w * 0.8, h * 0.74); c.lineTo(w * 0.86, h); c.fill();
    c.fillStyle = '#3db8ff'; c.fillRect(w * 0.7, h * 0.75, w * 0.08, 4);
    if ((t * 4) % 1 < 0.3) { c.strokeStyle = '#3df'; c.lineWidth = 3; c.beginPath(); c.moveTo(w * 0.72, h * 0.73); c.lineTo(cx, cy); c.stroke(); }
  },
  'shadow-ops'(c, w, h, t) {
    bg(c, w, h, '#18201a', '#0c100d');
    c.fillStyle = '#2b352d'; for (let i = 0; i < 6; i++) c.fillRect((i * 97) % w, (i * 53) % (h - 30), 40, 26);
    const bx = w * 0.62 + Math.sin(t) * 30, by = h * 0.45, a = Math.sin(t) > 0 ? Math.PI : 0;
    c.fillStyle = 'rgba(255,40,40,.25)'; c.beginPath(); c.moveTo(bx, by); c.arc(bx, by, 90, a - 0.5, a + 0.5); c.fill();
    glowCircle(c, bx, by, 9, '#ff4040', 12);
    glowCircle(c, w * 0.22, h * 0.7, 8, '#9bff5a', 14);
    c.fillStyle = '#3dd8ff'; rr(c, w * 0.8, h * 0.15, 18, 14, 3); c.fill(); c.fillStyle = '#fff'; c.font = 'bold 10px Inter'; c.fillText('E', w * 0.8 + 6, h * 0.15 + 11);
    c.strokeStyle = '#9bff5a'; c.setLineDash([4, 6]); c.beginPath(); c.moveTo(w * 0.22, h * 0.7); c.quadraticCurveTo(w * 0.4, h * 0.2, w * 0.8, h * 0.2); c.stroke(); c.setLineDash([]);
  },
  'zombie-last-stand'(c, w, h, t) {
    bg(c, w, h, '#1b1312', '#0a0606');
    c.fillStyle = '#100a0a'; for (let i = 0; i < 8; i++) { const bw = 40 + (i * 13) % 30, bh = 50 + (i * 37) % 80; c.fillRect(i * w / 8, h * 0.5 - bh, bw, bh); }
    c.fillStyle = '#2a1e1c'; c.fillRect(0, h * 0.5, w, h);
    for (let i = 0; i < 6; i++) {
      const x = (i * 71 + t * 15) % w, y = h * 0.55 + (i % 3) * 22, s = 0.8 + (i % 3) * 0.25;
      c.fillStyle = '#4b7a52'; rr(c, x - 6 * s, y - 22 * s, 12 * s, 22 * s, 4); c.fill();
      c.fillStyle = '#ff3b2f'; c.fillRect(x - 3 * s, y - 18 * s, 2, 2); c.fillRect(x + 1 * s, y - 18 * s, 2, 2);
    }
    glowCircle(c, w / 2, h * 0.85, 9, '#ffcf6a', 10);
    c.fillStyle = '#ff8a3d55'; c.beginPath(); c.moveTo(w / 2, h * 0.85); c.arc(w / 2, h * 0.85, 140, -2.2, -0.9); c.fill();
  },
  'rooftop-duel'(c, w, h, t) {
    bg(c, w, h, '#2b1a4a', '#ff7a3d');
    c.fillStyle = '#1a1030'; for (let i = 0; i < 12; i++) { const bh = 30 + (i * 29) % 70; c.fillRect(i * w / 12, h * 0.62 - bh, w / 13, bh); }
    c.fillStyle = '#120a20'; c.fillRect(0, h * 0.62, w, h);
    const fig = (x, col, dir) => { c.fillStyle = col; rr(c, x - 7, h * 0.62 - 44, 14, 30, 5); c.fill(); c.beginPath(); c.arc(x, h * 0.62 - 52, 7, 0, TAU); c.fill(); c.fillRect(x - 6, h * 0.62 - 14, 4, 14); c.fillRect(x + 2, h * 0.62 - 14, 4, 14);
      c.save(); c.strokeStyle = col; c.shadowColor = col; c.shadowBlur = 12; c.lineWidth = 3; c.beginPath(); c.moveTo(x + dir * 8, h * 0.62 - 34); c.lineTo(x + dir * (30 + Math.sin(t * 6) * 6), h * 0.62 - 58); c.stroke(); c.restore(); };
    fig(w * 0.38 + Math.sin(t * 2) * 6, '#3dd8ff', 1); fig(w * 0.62 - Math.sin(t * 2) * 6, '#ff3d7a', -1);
    c.strokeStyle = '#ffffff22'; for (let i = 0; i < 40; i++) { const x = (i * 37 + t * 200) % w, y = (i * 53 + t * 400) % h; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 3, y + 10); c.stroke(); }
  },
  'portal-escape'(c, w, h, t) {
    bg(c, w, h, '#e9f4ff', '#bcd6f0');
    c.fillStyle = '#7f93ad'; c.fillRect(0, h * 0.8, w * 0.4, h); c.fillRect(w * 0.55, h * 0.55, w * 0.45, 12); c.fillRect(w * 0.15 + Math.sin(t) * 30, h * 0.5, 70, 10);
    const portal = (x, y, col) => { c.save(); c.shadowColor = col; c.shadowBlur = 20; c.strokeStyle = col; c.lineWidth = 5; c.beginPath(); c.ellipse(x, y, 14, 26, 0, 0, TAU); c.stroke(); c.restore(); c.fillStyle = col + '44'; c.beginPath(); c.ellipse(x, y, 12, 24, 0, 0, TAU); c.fill(); };
    portal(w * 0.3, h * 0.8 - 28, '#3dffd8'); portal(w * 0.85, h * 0.55 - 28, '#ff9a3d');
    c.fillStyle = '#1c2a44'; rr(c, w * 0.12, h * 0.8 - 26 - Math.abs(Math.sin(t * 3)) * 12, 14, 26, 4); c.fill();
    c.fillStyle = '#ffd23d'; c.fillRect(w * 0.66, h * 0.55 - 6, 16, 6);
  },
  'turbo-circuit'(c, w, h, t) {
    bg(c, w, h, '#0b0420', '#300a3a');
    c.strokeStyle = '#ff3d7a'; c.lineWidth = 34; c.beginPath(); c.ellipse(w / 2, h * 0.58, w * 0.38, h * 0.3, 0, 0, TAU); c.stroke();
    c.strokeStyle = '#222033'; c.lineWidth = 28; c.stroke();
    c.strokeStyle = '#ffffff55'; c.lineWidth = 1.5; c.setLineDash([8, 8]); c.stroke(); c.setLineDash([]);
    for (let i = 0; i < 2; i++) { const a = t * (0.9 - i * 0.1) + i * 0.6; car(c, w / 2 + Math.cos(a) * w * 0.38, h * 0.58 + Math.sin(a) * h * 0.3, 0.6, i ? '#3db8ff' : '#ff3d7a', a + Math.PI / 2); }
    c.fillStyle = '#fff'; c.font = '600 12px Space Grotesk'; c.fillText('LAP 2/3  ·  0:41.07', 14, 22);
  },
  'drift-legends'(c, w, h, t) {
    bg(c, w, h, '#ffcf7a', '#c45a2a');
    c.fillStyle = '#7a3a1e'; c.beginPath(); c.moveTo(0, h * 0.45); for (let x = 0; x <= w; x += 20) c.lineTo(x, h * 0.4 - Math.sin(x * 0.03) * 20 - (x % 60)); c.lineTo(w, h); c.lineTo(0, h); c.fill();
    c.fillStyle = '#3a3238'; c.beginPath(); c.ellipse(w / 2, h * 0.78, w * 0.48, h * 0.22, 0, 0, TAU); c.fill();
    c.strokeStyle = '#111'; c.lineWidth = 5; c.globalAlpha = 0.6; c.beginPath(); c.arc(w * 0.4, h * 0.7, 60, 0.2, 1.6); c.stroke(); c.beginPath(); c.arc(w * 0.4, h * 0.73, 60, 0.2, 1.6); c.stroke(); c.globalAlpha = 1;
    const a = t * 1.5; car(c, w * 0.55 + Math.cos(a) * 20, h * 0.75, 0.9, '#ffb23d', -0.7 + Math.sin(a) * 0.2);
    c.fillStyle = '#ddd8'; for (let i = 0; i < 8; i++) glowCircle(c, w * 0.48 - i * 9, h * 0.8 + Math.sin(i + t * 5) * 4, 6 + i, 'rgba(230,230,230,.3)', 0);
    c.fillStyle = '#fff'; c.font = 'bold 22px Space Grotesk'; c.fillText('x4  DRIFT!', w * 0.6, h * 0.3);
  },
  'offroad-extreme'(c, w, h, t) {
    bg(c, w, h, '#9fd4ff', '#e8f4ff');
    c.fillStyle = '#7da35a'; c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w; x += 10) c.lineTo(x, h * 0.55 + Math.sin(x * 0.02 + t) * 18 + Math.sin(x * 0.07) * 6); c.lineTo(w, h); c.fill();
    c.fillStyle = '#8a6a4a'; c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w; x += 10) c.lineTo(x, h * 0.72 + Math.sin(x * 0.03 + t) * 10); c.lineTo(w, h); c.fill();
    const y = h * 0.72 + Math.sin(w * 0.45 * 0.03 + t) * 10;
    c.save(); c.translate(w * 0.45, y - 22); c.rotate(Math.cos(w * 0.45 * 0.03 + t) * 0.3);
    c.fillStyle = '#d8442a'; rr(c, -34, -14, 68, 22, 5); c.fill(); c.fillStyle = '#20303a'; rr(c, -12, -28, 30, 16, 4); c.fill();
    c.fillStyle = '#1a1a1a'; [-22, 22].forEach((x) => { c.beginPath(); c.arc(x, 10, 11, 0, TAU); c.fill(); }); c.restore();
    c.fillStyle = '#6b6058'; c.beginPath(); c.arc(w * 0.8, h * 0.78, 18, Math.PI, 0); c.fill();
    c.fillStyle = '#ff3d3d'; c.fillRect(w * 0.9, h * 0.4, 3, 40); c.fillRect(w * 0.9, h * 0.4, 18, 10);
  },
  'parking-master'(c, w, h, t) {
    bg(c, w, h, '#5d6670', '#3f464e');
    c.strokeStyle = '#fff'; c.lineWidth = 2; for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(20 + i * 60, 10); c.lineTo(20 + i * 60, 80); c.stroke(); }
    ['#e04848', '#3d8bff', '#f2c94c', '#9b51e0', '#27ae60'].forEach((col, i) => i !== 2 && car(c, 50 + i * 60, 45, 0.9, col, Math.PI / 2));
    c.save(); c.shadowColor = '#3dd8ff'; c.shadowBlur = 16; c.strokeStyle = '#3dd8ff'; c.lineWidth = 3; c.strokeRect(144 + 30 - 22, 14, 44, 62); c.restore();
    const p = (Math.sin(t) + 1) / 2;
    car(c, 174 + (1 - p) * 60, 45 + (1 - p) * 70, 0.9, '#3dd8ff', Math.PI / 2 + (1 - p) * 0.9);
    c.fillStyle = '#ffe23d'; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(w * 0.7 + i * 25, h * 0.85); c.lineTo(w * 0.7 + i * 25 + 7, h * 0.85 - 16); c.lineTo(w * 0.7 + i * 25 + 14, h * 0.85); c.fill(); }
  },
  'sky-racer'(c, w, h, t) {
    bg(c, w, h, '#ff9ac8', '#ffd59a');
    c.fillStyle = '#fff'; for (let i = 0; i < 9; i++) { const x = ((i * 90 - t * 40) % (w + 100) + w + 100) % (w + 100) - 50, y = h * 0.7 + (i % 3) * 18; c.globalAlpha = 0.8; c.beginPath(); c.arc(x, y, 30, 0, TAU); c.arc(x + 26, y + 6, 22, 0, TAU); c.arc(x - 24, y + 8, 18, 0, TAU); c.fill(); }
    c.globalAlpha = 1;
    for (let i = 0; i < 3; i++) { const s = 1 - i * 0.28; c.save(); c.strokeStyle = i ? '#ffffffcc' : '#ffd23d'; c.shadowColor = '#fff'; c.shadowBlur = 12; c.lineWidth = 5 * s; c.beginPath(); c.ellipse(w * (0.5 + i * 0.12), h * (0.42 - i * 0.07), 34 * s, 40 * s, 0, 0, TAU); c.stroke(); c.restore(); }
    c.save(); c.translate(w * 0.32, h * 0.5 + Math.sin(t * 2) * 6); c.rotate(-0.12 + Math.sin(t) * 0.1);
    c.fillStyle = '#2a3a6a'; c.beginPath(); c.moveTo(30, 0); c.lineTo(-20, -6); c.lineTo(-24, 6); c.fill();
    c.fillStyle = '#7bd8ff'; c.beginPath(); c.moveTo(4, 0); c.lineTo(-14, -26); c.lineTo(-8, 0); c.lineTo(-14, 26); c.fill(); c.restore();
  },
  'cube-genius'(c, w, h, t) {
    bg(c, w, h, '#f4f7ff', '#dbe4ff');
    const cols = ['#3d6bff', '#ff8a3d', '#5ad86b', '#ff5a6e', '#8a5cff', '#ffd23d'];
    let k = 0;
    for (let z = 2; z >= 0; z--) for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
      if (x === 2 && y === 2 && z === 2) continue;
      const lift = (x === 1 && y === 1 && z === 0) ? Math.abs(Math.sin(t * 2)) * 10 : 0;
      const px = w / 2 + (x - y) * 22, py = h * 0.62 + (x + y) * 11 - z * 24 - lift; k++;
      if (z === 0 || x === 0 || y === 0 || k % 2) { const col = cols[(x + y * 3 + z) % 6]; iso(c, px, py, 22, 24, col, shade(col, -30), shade(col, -55)); }
    }
  },
  'circuit-breaker'(c, w, h, t) {
    bg(c, w, h, '#14182b', '#0b0e1a');
    const n = 5, s = Math.min(w, h) * 0.17, ox = w / 2 - n * s / 2, oy = h / 2 - 3 * s / 2;
    for (let y = 0; y < 3; y++) for (let x = 0; x < n; x++) {
      const cx = ox + x * s + s / 2, cy = oy + y * s + s / 2, on = (x + y * n) < (t * 3) % 16;
      c.fillStyle = '#1e2440'; rr(c, cx - s / 2 + 2, cy - s / 2 + 2, s - 4, s - 4, 6); c.fill();
      c.strokeStyle = on ? '#ffe23d' : '#3a4266'; c.lineWidth = 5; c.save(); if (on) { c.shadowColor = '#ffe23d'; c.shadowBlur = 10; }
      c.beginPath(); const r = (x * 7 + y * 3) % 4; if (r < 2) { c.moveTo(cx - s / 2, cy); c.lineTo(cx + s / 2, cy); } else { c.moveTo(cx - s / 2, cy); c.lineTo(cx, cy); c.lineTo(cx, cy + s / 2); }
      c.stroke(); c.restore();
    }
    glowCircle(c, ox - 10, oy + s * 1.5, 10, '#3dffb2', 20);
  },
  'memory-vault'(c, w, h, t) {
    bg(c, w, h, '#1c0f33', '#090515', 'r');
    const glyphs = ['✦', '◆', '▲', '●', '✚', '◐', '★', '⬢', '♦'];
    const lit = Math.floor(t * 2) % 9;
    for (let i = 0; i < 9; i++) {
      const x = w / 2 + ((i % 3) - 1) * 62, y = h / 2 + (Math.floor(i / 3) - 1) * 54;
      c.save(); if (i === lit) { c.shadowColor = '#b45cff'; c.shadowBlur = 24; }
      c.fillStyle = i === lit ? '#b45cff' : '#2a1d48'; rr(c, x - 26, y - 22, 52, 44, 10); c.fill(); c.restore();
      c.fillStyle = i === lit ? '#fff' : '#7b6aa8'; c.font = '22px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(glyphs[i], x, y + 1);
    }
    c.textAlign = 'start'; c.textBaseline = 'alphabetic';
  },
  'escape-room'(c, w, h, t) {
    bg(c, w, h, '#3a2a1e', '#1e140e');
    c.fillStyle = '#5a4030'; c.fillRect(0, h * 0.72, w, h);
    c.fillStyle = '#2a1c14'; c.fillRect(w * 0.7, h * 0.2, w * 0.18, h * 0.52); c.fillStyle = '#d8a35a'; c.beginPath(); c.arc(w * 0.73, h * 0.48, 3, 0, TAU); c.fill();
    c.fillStyle = '#1e2a44'; c.beginPath(); c.arc(w * 0.3, h * 0.3, 34, 0, TAU); c.fill();
    c.fillStyle = '#fff'; for (let i = 0; i < 14; i++) c.fillRect(w * 0.3 + Math.cos(i * 2.4) * (i * 2.2), h * 0.3 + Math.sin(i * 2.4) * (i * 2.2), 2, 2);
    c.strokeStyle = '#d8a35a'; c.lineWidth = 3; c.beginPath(); c.arc(w * 0.3, h * 0.3, 34, 0, TAU); c.stroke();
    c.fillStyle = '#6a4a2a'; c.fillRect(w * 0.1, h * 0.6, w * 0.35, 10); c.fillRect(w * 0.12, h * 0.6, 6, h * 0.14); c.fillRect(w * 0.41, h * 0.6, 6, h * 0.14);
    glowCircle(c, w * 0.2, h * 0.56, 5, '#ffcf6a', 18);
    c.fillStyle = '#d8a35a'; c.save(); c.translate(w * 0.32, h * 0.57); c.rotate(Math.sin(t * 2) * 0.2); c.fillRect(-10, -2, 16, 4); c.beginPath(); c.arc(-12, 0, 5, 0, TAU); c.fill(); c.restore();
  },
  'word-wizard'(c, w, h, t) {
    bg(c, w, h, '#0f2a24', '#081612');
    const L = 'PLANETS'.split('');
    L.forEach((ch, i) => {
      const a = (i / L.length) * TAU + t * 0.4, x = w / 2 + Math.cos(a) * 70, y = h / 2 + Math.sin(a) * 46;
      c.fillStyle = '#f5f0e0'; rr(c, x - 15, y - 15, 30, 30, 6); c.fill();
      c.fillStyle = '#163a30'; c.font = 'bold 18px Space Grotesk'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, x, y + 1);
    });
    c.save(); c.shadowColor = '#5affb4'; c.shadowBlur = 20; c.fillStyle = '#5affb4'; c.font = 'bold 20px Space Grotesk'; c.fillText('PLANET', w / 2, h / 2); c.restore();
    c.textAlign = 'start'; c.textBaseline = 'alphabetic';
  },
  'slice-master'(c, w, h, t) {
    bg(c, w, h, '#2a0f1e', '#12060d', 'r');
    const cols = ['#ff5a5a', '#ffd23d', '#5ad86b', '#5ab8ff'];
    for (let i = 0; i < 5; i++) {
      const p = ((t * 0.5 + i * 0.21) % 1), x = w * (0.15 + i * 0.18), y = h - Math.sin(p * Math.PI) * h * 0.8;
      if (i === 3) { c.fillStyle = '#222'; c.beginPath(); c.arc(x, y, 14, 0, TAU); c.fill(); c.fillStyle = '#ff3d3d'; c.fillRect(x - 1, y - 20, 3, 7); continue; }
      glowCircle(c, x, y, 15, cols[i % 4], 14); c.fillStyle = '#ffffff66'; c.beginPath(); c.arc(x - 4, y - 5, 4, 0, TAU); c.fill();
    }
    c.save(); c.strokeStyle = '#fff'; c.shadowColor = '#fff'; c.shadowBlur = 14; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(w * 0.1, h * 0.7); c.quadraticCurveTo(w * 0.5, h * 0.2, w * 0.9, h * 0.45); c.stroke(); c.restore();
  },
  'bounce-lab'(c, w, h, t) {
    bg(c, w, h, '#e8fff6', '#c4f0e0');
    c.fillStyle = '#20504a'; c.fillRect(0, h * 0.85, w * 0.35, h); c.fillRect(w * 0.42 + Math.sin(t) * 20, h * 0.6, 70, 10); c.fillRect(w * 0.75, h * 0.4, w * 0.25, 10);
    c.fillStyle = '#ff6b3d'; c.fillRect(w * 0.25, h * 0.85 - 8, 30, 8);
    const bx = w * 0.18 + ((t * 60) % 80), by = h * 0.85 - 14 - Math.abs(Math.sin(t * 4)) * 60;
    glowCircle(c, bx, by, 12, '#3dffb2', 10); c.fillStyle = '#1a6a52'; c.beginPath(); c.arc(bx + 3, by - 3, 4, 0, TAU); c.fill();
    c.fillStyle = '#ffd23d'; c.font = '18px sans-serif'; c.fillText('★', w * 0.5, h * 0.5); c.fillText('★', w * 0.85, h * 0.32);
    c.save(); c.strokeStyle = '#8a5cff'; c.shadowColor = '#8a5cff'; c.shadowBlur = 16; c.lineWidth = 4; c.beginPath(); c.ellipse(w * 0.92, h * 0.3, 10, 18, 0, 0, TAU); c.stroke(); c.restore();
  },
  'stack-attack'(c, w, h, t) {
    bg(c, w, h, '#ffd6ec', '#c9e8ff');
    const cols = ['#ff8adb', '#ff9a8a', '#ffb88a', '#ffd88a', '#d8f08a', '#8af0b4', '#8ad8f0', '#a88af0'];
    for (let i = 0; i < 8; i++) { const s = 46 - i * 2; const col = cols[i]; iso(c, w / 2 + (i === 7 ? Math.sin(t * 2) * 40 : 0), h * 0.92 - i * 14, s, 14, col, shade(col, -25), shade(col, -45)); }
    c.fillStyle = '#5a3a6a'; c.font = 'bold 26px Space Grotesk'; c.fillText('24', 18, 36);
  },
  'gravity-flip'(c, w, h, t) {
    bg(c, w, h, '#1a0a2e', '#0a1a2e');
    c.fillStyle = '#3a2a5a'; c.fillRect(0, 0, w, 22); c.fillRect(0, h - 22, w, 22);
    c.fillStyle = '#ff3d6a'; for (let i = 0; i < 5; i++) { const x = 60 + i * 70; const top = i % 2; c.beginPath(); if (top) { c.moveTo(x, 22); c.lineTo(x + 8, 40); c.lineTo(x + 16, 22); } else { c.moveTo(x, h - 22); c.lineTo(x + 8, h - 40); c.lineTo(x + 16, h - 22); } c.fill(); }
    const up = Math.sin(t * 1.5) > 0, px = w * 0.3 + (t * 50) % (w * 0.4);
    c.fillStyle = '#5cffe2'; rr(c, px - 9, up ? 22 : h - 22 - 22, 18, 22, 4); c.fill();
    c.fillStyle = '#c45cff'; c.font = 'bold 20px sans-serif'; c.fillText(up ? '↑' : '↓', px - 6, h / 2);
  },
  'chaos-pinball'(c, w, h, t) {
    bg(c, w, h, '#16062a', '#2a0a3a');
    c.save(); c.translate(w / 2, h / 2); c.scale(1, 0.7);
    c.fillStyle = '#1e0e3a'; rr(c, -w * 0.3, -h * 0.65, w * 0.6, h * 1.3, 30); c.fill(); c.strokeStyle = '#ff3d9a'; c.lineWidth = 3; c.stroke();
    [[-40, -50, '#3dfff0'], [30, -60, '#ffd23d'], [-5, -10, '#ff3d9a']].forEach(([x, y, col], i) => glowCircle(c, x, y, 14 + Math.sin(t * 6 + i) * 2, col, 18));
    c.fillStyle = '#ffd23d'; c.save(); c.translate(-36, h * 0.48); c.rotate(0.4 - (Math.sin(t * 3) > 0.7 ? 0.6 : 0)); rr(c, 0, -4, 44, 9, 4); c.fill(); c.restore();
    c.save(); c.translate(36, h * 0.48); c.rotate(Math.PI - 0.4); rr(c, 0, -5, 44, 9, 4); c.fill(); c.restore();
    glowCircle(c, Math.sin(t * 2) * 50, Math.cos(t * 1.7) * 60, 6, '#fff', 12);
    c.restore();
  },
  'mini-city'(c, w, h, t) {
    bg(c, w, h, '#bfe8ff', '#e8f8ff');
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
      const px = w / 2 + (x - y) * 24, py = h * 0.3 + (x + y) * 12;
      const road = x === 2 || y === 2, k = (x * 7 + y * 3) % 5;
      iso(c, px, py, 24, 4, road ? '#5a6070' : '#7ad86b', road ? '#3a4050' : '#4a9a3b', road ? '#2a3040' : '#3a7a2b');
      if (!road) {
        if (k === 0) { c.fillStyle = '#2a8a3a'; c.beginPath(); c.arc(px, py - 14, 7, 0, TAU); c.fill(); }
        else { const hh = k * 9 + 6; const col = ['#fff', '#ffd23d', '#ff8a8a', '#8ab8ff'][k % 4]; iso(c, px, py - 4, 13, hh, col, shade(col, -30), shade(col, -50)); }
      }
    }
    const p = (t * 0.3) % 1; c.fillStyle = '#ff3d3d'; c.fillRect(w / 2 + (p * 4 - 2) * 24 * 2 - 3, h * 0.3 + (p * 4) * 24 - 2, 6, 4);
  },
  'island-survivor'(c, w, h, t) {
    bg(c, w, h, '#ffb88a', '#5ad8e8');
    c.fillStyle = '#2ab8c8'; c.fillRect(0, h * 0.55, w, h);
    c.fillStyle = '#ffffff55'; for (let i = 0; i < 6; i++) c.fillRect(((i * 80 + t * 20) % w), h * 0.6 + i * 10, 30, 2);
    c.fillStyle = '#f0d89a'; c.beginPath(); c.ellipse(w / 2, h * 0.68, w * 0.32, h * 0.12, 0, 0, TAU); c.fill();
    c.fillStyle = '#5ab84a'; c.beginPath(); c.ellipse(w * 0.55, h * 0.64, w * 0.18, h * 0.06, 0, 0, TAU); c.fill();
    c.strokeStyle = '#7a5a3a'; c.lineWidth = 6; c.beginPath(); c.moveTo(w * 0.4, h * 0.7); c.quadraticCurveTo(w * 0.36, h * 0.45, w * 0.42, h * 0.3); c.stroke();
    c.fillStyle = '#2a8a3a'; for (let i = 0; i < 5; i++) { c.save(); c.translate(w * 0.42, h * 0.3); c.rotate(i * 1.25 + Math.sin(t) * 0.1); c.beginPath(); c.ellipse(20, 0, 22, 6, 0.3, 0, TAU); c.fill(); c.restore(); }
    glowCircle(c, w * 0.62, h * 0.62, 6 + Math.sin(t * 8) * 2, '#ffb23d', 20);
    c.fillStyle = '#ffeaa0'; c.beginPath(); c.arc(w * 0.82, h * 0.22, 16, 0, TAU); c.fill();
  },
  'tower-defenders'(c, w, h, t) {
    bg(c, w, h, '#6bb84a', '#4a9a3a');
    c.strokeStyle = '#d8b878'; c.lineWidth = 26; c.lineJoin = 'round'; c.beginPath(); c.moveTo(0, h * 0.3); c.lineTo(w * 0.4, h * 0.3); c.lineTo(w * 0.4, h * 0.75); c.lineTo(w, h * 0.75); c.stroke();
    for (let i = 0; i < 5; i++) { const p = (t * 0.15 + i * 0.12) % 1, L = w * 0.4 + h * 0.45 + w * 0.6; let d = p * L, x, y; if (d < w * 0.4) { x = d; y = h * 0.3; } else if (d < w * 0.4 + h * 0.45) { x = w * 0.4; y = h * 0.3 + d - w * 0.4; } else { x = w * 0.4 + d - w * 0.4 - h * 0.45; y = h * 0.75; } c.fillStyle = '#ff5a5a'; c.beginPath(); c.arc(x, y, 7, 0, TAU); c.fill(); }
    [[w * 0.25, h * 0.55, '#ffd23d'], [w * 0.6, h * 0.5, '#5ab8ff'], [w * 0.75, h * 0.92, '#c45cff']].forEach(([x, y, col]) => { c.fillStyle = '#3a3a4a'; c.beginPath(); c.arc(x, y, 14, 0, TAU); c.fill(); c.fillStyle = col; c.beginPath(); c.arc(x, y, 8, 0, TAU); c.fill(); });
    if ((t * 3) % 1 < 0.5) { c.strokeStyle = '#5ab8ff'; c.lineWidth = 2; c.beginPath(); c.moveTo(w * 0.6, h * 0.5); c.lineTo(w * 0.7, h * 0.75); c.stroke(); }
  },
  'pet-world'(c, w, h, t) {
    bg(c, w, h, '#ffe0f4', '#d8ffe0');
    c.fillStyle = '#b8f0a8'; c.beginPath(); c.ellipse(w * 0.3, h * 0.95, w * 0.5, h * 0.35, 0, 0, TAU); c.fill();
    c.fillStyle = '#a0e890'; c.beginPath(); c.ellipse(w * 0.8, h, w * 0.4, h * 0.4, 0, 0, TAU); c.fill();
    const pet = (x, y, col, s, ph) => { y -= Math.abs(Math.sin(t * 3 + ph)) * 8; c.fillStyle = col; c.beginPath(); c.ellipse(x, y, 18 * s, 15 * s, 0, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(x - 9 * s, y - 14 * s, 5 * s, 8 * s, -0.3, 0, TAU); c.ellipse(x + 9 * s, y - 14 * s, 5 * s, 8 * s, 0.3, 0, TAU); c.fill();
      c.fillStyle = '#222'; c.beginPath(); c.arc(x - 6 * s, y - 2 * s, 2.2 * s, 0, TAU); c.arc(x + 6 * s, y - 2 * s, 2.2 * s, 0, TAU); c.fill();
      c.fillStyle = '#ff7ab8'; c.beginPath(); c.arc(x - 10 * s, y + 4 * s, 2.5 * s, 0, TAU); c.arc(x + 10 * s, y + 4 * s, 2.5 * s, 0, TAU); c.fill(); };
    pet(w * 0.3, h * 0.7, '#ffd23d', 1.3, 0); pet(w * 0.6, h * 0.75, '#ff9ad8', 1, 1); pet(w * 0.8, h * 0.6, '#9ad8ff', 0.8, 2);
    c.fillStyle = '#c45cff'; c.font = '14px sans-serif'; c.fillText('✦ RARE', w * 0.72, h * 0.38);
  },
  'cosmic-explorer'(c, w, h, t) {
    bg(c, w, h, '#1a0a3a', '#02020a', 'r');
    c.fillStyle = '#fff'; for (let i = 0; i < 60; i++) c.fillRect((i * 97) % w, (i * 61) % h, 1.5, 1.5);
    const g = c.createRadialGradient(w * 0.7, h * 0.3, 5, w * 0.7, h * 0.3, 120); g.addColorStop(0, '#8a7bff55'); g.addColorStop(1, 'transparent'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i++) { const x = (i * 83 + Math.sin(t + i) * 10) % w, y = (i * 47) % h, r = 8 + (i % 4) * 6; c.fillStyle = '#5a4a5a'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.fillStyle = '#3a2a3a'; c.beginPath(); c.arc(x + r * 0.3, y + r * 0.2, r * 0.3, 0, TAU); c.fill(); }
    for (let i = 0; i < 3; i++) { const x = w * (0.55 + i * 0.12), y = h * (0.6 - i * 0.1); c.save(); c.translate(x, y); c.rotate(t + i); c.shadowColor = '#3dfff0'; c.shadowBlur = 16; c.fillStyle = '#3dfff0'; c.beginPath(); c.moveTo(0, -9); c.lineTo(6, 0); c.lineTo(0, 9); c.lineTo(-6, 0); c.fill(); c.restore(); }
    c.save(); c.translate(w * 0.3, h * 0.6 + Math.sin(t * 2) * 5); c.rotate(-0.3);
    c.fillStyle = '#d8dff0'; c.beginPath(); c.moveTo(26, 0); c.lineTo(-14, -12); c.lineTo(-8, 0); c.lineTo(-14, 12); c.fill();
    glowCircle(c, -12, 0, 5, '#8a7bff', 16); c.restore();
  },
};

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, v + amt));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

export function drawThumb(game, ctx, w, h, t = 0) {
  ctx.save();
  // Art is authored at 360x200 and scaled to fill.
  const s = Math.max(w / 360, h / 200);
  ctx.translate((w - 360 * s) / 2, (h - 200 * s) / 2); ctx.scale(s, s);
  (art[game.id] || art['neon-strike'])(ctx, 360, 200, t);
  ctx.restore();
}
