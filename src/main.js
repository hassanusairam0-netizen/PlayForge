import './style.css';
import { GAMES, CATEGORIES, byId } from './games/registry.js';
import { store, levelFor, fmtScore } from './store.js';
import { sfx, setSound } from './audio.js';
import { drawThumb } from './thumbs.js';
import { icons, logoSVG } from './icons.js';
import { openGame, closeGame, isPlaying } from './player.js';

const app = document.getElementById('app');
const diffLabel = ['', 'Easy', 'Medium', 'Hard'];

const CHAPTERS = [
  { cat: 'action', n: '01', kicker: 'Action & Shooting', title: 'Survive the<br><em>heat of battle.</em>', blurb: 'Arena blasters, stealth infiltrations, zombie sieges and rooftop duels. Fast hands win.', theme: 'ch-action', layout: 'feature',
    show: { kind: 'arena', game: 'neon-strike', kicker: 'Featured · Arena Shooter', title: 'ENTER THE<br>ARENA', text: 'Lock on. Strafe. Reload under fire. Neon Strike drops you into a hexagonal battle dome where hunter drones never stop circling.', side: 'left' } },
  { cat: 'racing', n: '02', kicker: 'Racing & Driving', title: 'Floor it.<br><em>Feel the road.</em>', blurb: 'Circuits, canyon drifts, mud-soaked rallies, millimetre-perfect parking and sky-high ring races.', theme: 'ch-racing', layout: 'rail',
    show: { kind: 'circuit', game: 'turbo-circuit', kicker: 'Featured · Circuit Racing', title: 'BURN THE<br>CIRCUIT', text: 'Three laps. One neon ribbon of asphalt. Shave tenths off every corner and chase the ghost of your personal best.', side: 'right' } },
  { cat: 'puzzle', n: '03', kicker: 'Brain & Logic', title: 'Quiet room.<br><em>Loud mind.</em>', blurb: 'Rotate, connect, remember, deduce and spell your way through five very different mind benders.', theme: 'ch-puzzle', layout: 'mosaic',
    show: { kind: 'cube', game: 'cube-genius', kicker: 'Featured · 3D Logic', title: 'TRAIN YOUR<br>MIND', text: 'Spin a lattice of blocks in full 3D and slide each piece home. Cube Genius rewards the player who thinks one move ahead.', side: 'center' } },
  { cat: 'arcade', n: '04', kicker: 'Casual & Arcade', title: 'One more go.<br><em>Always.</em>', blurb: 'Slice, bounce, stack, flip and flip again. Pure arcade loops tuned for that “just one more” feeling.', theme: 'ch-arcade', layout: 'stagger',
    show: { kind: 'city', game: 'mini-city', kicker: 'Featured · City Builder', title: 'BUILD YOUR<br>WORLD', text: 'Lay the first road, then watch homes, shops and towers rise around it. Mini City Builder saves your town so you can come back to it.', side: 'left' } },
  { cat: ['strategy', 'exploration'], n: '05', kicker: 'Strategy & Exploration', title: 'Plan. Roam.<br><em>Discover.</em>', blurb: 'Defend the path, survive the island, befriend rare creatures and drift through asteroid fields.', theme: 'ch-explore', layout: 'wide',
    show: { kind: 'space', game: 'cosmic-explorer', kicker: 'Featured · Space Exploration', title: 'ESCAPE THE<br>ORDINARY', text: 'Thread a living asteroid belt in a nimble scout ship. Harvest glowing crystals, watch your energy and make it home.', side: 'right' } },
];

app.innerHTML = `
<header class="nav" id="nav">
  <div class="nav-left">
    <a class="credit" href="#top" title="PLAYFORGE was made by Usairam Hassan">Made by <b>Usairam Hassan</b></a>
    <a class="brand" href="#top" aria-label="PLAYFORGE home">${logoSVG('nav')}<span>PLAY<b>FORGE</b></span></a>
  </div>
  <nav class="nav-links" aria-label="Primary">
    <div class="dd">
      <button class="nav-link" data-dd aria-expanded="false" aria-haspopup="true">${icons.grid}<span>Categories</span></button>
      <div class="dd-menu" role="menu">${CATEGORIES.filter((c) => !['recent', 'favorites'].includes(c.id)).map((c) => `<button role="menuitem" data-filter="${c.id}">${c.label}<small>${c.id === 'all' ? GAMES.length : GAMES.filter((g) => g.cat === c.id).length}</small></button>`).join('')}</div>
    </div>
    <button class="nav-link" data-filter="recent">${icons.clock}<span>Recent</span></button>
    <button class="nav-link" data-filter="favorites">${icons.heart}<span>Favorites</span><i class="count" data-fav-count></i></button>
  </nav>
  <div class="nav-right">
    <label class="search"><span class="sr">Search games</span>${icons.search}<input id="navSearch" type="search" placeholder="Search 25 games…" autocomplete="off" /></label>
    <a class="xp-chip" href="#forge" title="Your Forge XP"><span class="lvl" data-lvl>1</span><span class="xp-meter"><i data-xpbar></i></span><span class="xp-txt" data-xp>0 XP</span></a>
    <button class="icon-btn" id="soundBtn" aria-label="Toggle sound"></button>
  </div>
</header>

<section class="hero" id="top">
  <div class="hero-canvas" id="heroCanvas"></div>
  <div class="hero-vignette"></div>
  <div class="hero-content">
    <p class="eyebrow"><span class="dot"></span> ONE WORLD. 25 WAYS TO PLAY.</p>
    <h1>Your next<br>obsession<br><span class="grad">starts here.</span></h1>
    <p class="hero-sub">Race. Think. Build. Survive. Explore. Repeat.</p>
    <div class="hero-cta">
      <a class="btn btn-primary btn-lg" href="#chapters" data-scroll>${icons.play} Play now</a>
      <a class="btn btn-ghost btn-lg" href="#library" data-scroll>Explore all games ${icons.arrow}</a>
    </div>
  </div>
  <div class="hero-stat"><b>25</b><span>Worlds to<br>discover</span></div>
  <div class="hero-scroll"><span></span>Scroll to enter</div>
</section>

<div class="ticker" aria-hidden="true"><div>${'<span>RACE</span><i>✦</i><span>THINK</span><i>✦</i><span>BUILD</span><i>✦</i><span>SURVIVE</span><i>✦</i><span>EXPLORE</span><i>✦</i><span>REPEAT</span><i>✦</i>'.repeat(4)}</div></div>

<div id="chapters">
${CHAPTERS.map((ch) => `
  <section class="chapter ${ch.theme}" id="ch-${ch.n}">
    <div class="wrap">
      <div class="ch-head reveal">
        <span class="ch-num">${ch.n}</span>
        <div><p class="kicker">${ch.kicker}</p><h2>${ch.title}</h2></div>
        <p class="ch-blurb">${ch.blurb}</p>
      </div>
      <div class="ch-grid layout-${ch.layout}" data-chapter="${[].concat(ch.cat).join(',')}"></div>
    </div>
  </section>
  <section class="showcase sc-${ch.show.kind} side-${ch.show.side}" data-kind="${ch.show.kind}">
    <div class="sc-canvas"></div>
    <div class="sc-shade"></div>
    <div class="wrap sc-content reveal">
      <p class="kicker">${ch.show.kicker}</p>
      <h2>${ch.show.title}</h2>
      <p>${ch.show.text}</p>
      <button class="btn btn-primary btn-lg" data-play="${ch.show.game}">${icons.play} Play ${byId(ch.show.game).title}</button>
    </div>
  </section>`).join('')}
</div>

<section class="library" id="library">
  <div class="wrap">
    <div class="lib-head reveal">
      <div><p class="kicker">The full collection</p><h2>Every world, <em>one search away.</em></h2></div>
      <label class="search big"><span class="sr">Search games</span>${icons.search}<input id="libSearch" type="search" placeholder="Search by title or genre…" autocomplete="off" /></label>
    </div>
    <div class="lib-tools">
      <div class="chips" role="tablist" aria-label="Filter games">${CATEGORIES.map((c) => `<button class="chip" role="tab" data-filter="${c.id}">${c.label}</button>`).join('')}</div>
      <label class="sort"><span>Sort</span><select id="sortSel"><option value="featured">Featured</option><option value="az">A → Z</option><option value="recent">Recently played</option><option value="diff">Difficulty</option></select></label>
    </div>
    <p class="lib-count" id="libCount" aria-live="polite"></p>
    <div class="lib-grid" id="libGrid"></div>
    <div class="empty" id="libEmpty" hidden>
      <div class="empty-art">${logoSVG('empty')}</div>
      <h3 id="emptyTitle">No worlds found</h3>
      <p id="emptyText">Try a different search, or browse everything.</p>
      <button class="btn btn-ghost" data-filter="all" data-clear>Show all games</button>
    </div>
  </div>
</section>

<section class="forge" id="forge">
  <div class="wrap">
    <div class="forge-head reveal"><p class="kicker">Forge XP</p><h2>Your progress, <em>forged locally.</em></h2><p>Earn XP for every session, completion and personal best. No account needed — progress lives in this browser.</p></div>
    <div class="forge-grid">
      <div class="f-card f-level reveal"><div class="ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52"/><circle class="ring-fg" cx="60" cy="60" r="52" data-ring/></svg><div><b data-lvl>1</b><span>Level</span></div></div>
        <div class="f-xp"><b data-xp>0 XP</b><span data-xpnext></span></div><div class="f-stats"><div><b data-played>0</b><span>Worlds played</span></div><div><b data-sessions>0</b><span>Sessions</span></div><div><b data-bests>0</b><span>Bests set</span></div></div></div>
      <div class="f-card reveal"><h3>${icons.heart} Favorites</h3><div class="f-list" data-favlist></div></div>
      <div class="f-card reveal"><h3>${icons.clock} Recently played</h3><div class="f-list" data-recentlist></div></div>
      <div class="f-card f-bests reveal"><h3>${icons.bolt} Personal bests</h3><div class="f-list" data-bestlist></div></div>
    </div>
  </div>
</section>

<footer class="footer">
  <div class="wrap">
    <div class="f-brand">${logoSVG('foot')}<div><b>PLAYFORGE</b><span>One world. 25 ways to play.</span></div></div>
    <p class="f-credit">Designed &amp; built — <b>MADE BY USAIRAM HASSAN</b></p>
    <p class="f-small">All games are original and run in your browser. Sound is procedural. Progress is stored locally on this device.</p>
  </div>
</footer>`;

// ---------- Cards ----------
function card(game, variant = '') {
  const el = document.createElement('article');
  el.className = `card ${variant}`;
  el.style.setProperty('--accent', game.accent);
  el.style.setProperty('--accent2', game.accent2);
  el.dataset.id = game.id;
  el.innerHTML = `
    <div class="card-art"><canvas></canvas><span class="card-num">${game.num}</span><span class="card-render">${game.render}</span></div>
    <button class="fav" aria-label="Add ${game.title} to favorites" aria-pressed="false">${icons.heart}</button>
    <div class="card-body">
      <p class="card-genre">${game.genre}</p>
      <h3>${game.title}</h3>
      <p class="card-desc">${game.desc}</p>
      <div class="card-meta">
        <span class="diff d${game.difficulty}" title="${diffLabel[game.difficulty]}"><i></i><i></i><i></i>${diffLabel[game.difficulty]}</span>
        <span>${icons.clock}${game.time}</span>
        <span class="card-best" data-best></span>
      </div>
      <button class="btn btn-play" data-play="${game.id}">${icons.play} Play</button>
    </div>`;
  const cv = el.querySelector('canvas');
  const ctx = cv.getContext('2d');
  let raf = 0, hovering = false, sized = false, t0 = 0;
  const size = () => {
    const r = cv.getBoundingClientRect(); if (!r.width) return;
    const d = Math.min(devicePixelRatio || 1, 2); cv.width = r.width * d; cv.height = r.height * d; sized = true;
    drawThumb(game, ctx, cv.width, cv.height, 0.6);
  };
  thumbIO.observe(el); el._size = size;
  const anim = () => { if (!hovering) return; raf = requestAnimationFrame(anim); drawThumb(game, ctx, cv.width, cv.height, 0.6 + (performance.now() - t0) / 1000); };
  el.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'mouse') return; hovering = true; t0 = performance.now(); if (!sized) size(); anim(); });
  el.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--rx', `${-y * 8}deg`); el.style.setProperty('--ry', `${x * 10}deg`);
    el.style.setProperty('--mx', `${(x + 0.5) * 100}%`); el.style.setProperty('--my', `${(y + 0.5) * 100}%`);
  });
  el.addEventListener('pointerleave', () => { hovering = false; cancelAnimationFrame(raf); el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
  el.addEventListener('click', (e) => {
    if (e.target.closest('.fav')) { e.stopPropagation(); store.toggleFav(game.id); sfx('click'); return; }
    launch(game.id);
  });
  return el;
}
const thumbIO = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target._size(); thumbIO.unobserve(e.target); } }), { rootMargin: '300px' });

function refreshCards() {
  const s = store.get();
  document.querySelectorAll('.card').forEach((el) => {
    const g = byId(el.dataset.id), fav = s.favorites.includes(g.id), b = s.best[g.id];
    const f = el.querySelector('.fav'); f.classList.toggle('on', fav); f.setAttribute('aria-pressed', fav);
    el.querySelector('[data-best]').innerHTML = b != null ? `★ ${fmtScore(g, b)}` : '';
  });
}

// Chapter grids
document.querySelectorAll('[data-chapter]').forEach((grid) => {
  const cats = grid.dataset.chapter.split(',');
  GAMES.filter((g) => cats.includes(g.cat)).forEach((g, i) => {
    const c = card(g, grid.classList.contains('layout-feature') && i === 0 ? 'card-hero' : grid.classList.contains('layout-wide') ? 'card-wide' : '');
    c.classList.add('reveal'); c.style.setProperty('--d', `${i * 70}ms`); grid.appendChild(c);
  });
});

// ---------- Library / discovery ----------
const lib = { filter: 'all', q: '', sort: 'featured' };
const libGrid = document.getElementById('libGrid');
const libCards = new Map(GAMES.map((g) => [g.id, card(g)]));

function renderLibrary() {
  const s = store.get();
  const q = lib.q.trim().toLowerCase();
  let list = GAMES.filter((g) => {
    if (lib.filter === 'favorites' && !s.favorites.includes(g.id)) return false;
    if (lib.filter === 'recent' && !s.recent.includes(g.id)) return false;
    if (!['all', 'favorites', 'recent'].includes(lib.filter) && g.cat !== lib.filter) return false;
    return !q || `${g.title} ${g.genre} ${g.cat}`.toLowerCase().includes(q);
  });
  const sort = lib.filter === 'recent' && lib.sort === 'featured' ? 'recent' : lib.sort;
  if (sort === 'az') list.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === 'recent') list.sort((a, b) => store.recentIndex(a.id) - store.recentIndex(b.id));
  if (sort === 'diff') list.sort((a, b) => a.difficulty - b.difficulty);
  libGrid.replaceChildren(...list.map((g) => libCards.get(g.id)));
  document.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-selected', c.dataset.filter === lib.filter));
  document.querySelectorAll('.nav-link[data-filter]').forEach((c) => c.classList.toggle('active', c.dataset.filter === lib.filter));
  const catLabel = CATEGORIES.find((c) => c.id === lib.filter).label;
  document.getElementById('libCount').textContent = `${list.length} ${list.length === 1 ? 'game' : 'games'} · ${catLabel}${q ? ` · “${lib.q}”` : ''}`;
  const empty = document.getElementById('libEmpty');
  empty.hidden = list.length > 0;
  if (!list.length) {
    const [t, p] = q ? ['No worlds match that search', `Nothing found for “${lib.q}”. Check the spelling or try a genre like “racing”.`]
      : lib.filter === 'favorites' ? ['No favorites yet', 'Tap the heart on any game card to keep it here.']
      : lib.filter === 'recent' ? ['Nothing played yet', 'Games you open will appear here, newest first.'] : ['No worlds found', 'Try another filter.'];
    document.getElementById('emptyTitle').textContent = t; document.getElementById('emptyText').textContent = p;
  }
  refreshCards();
}

function setFilter(f, scroll = true) {
  lib.filter = f; renderLibrary(); sfx('click');
  if (scroll) document.getElementById('library').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const navSearch = document.getElementById('navSearch'), libSearch = document.getElementById('libSearch');
let scrolledForSearch = false;
function onSearch(v, from) {
  lib.q = v; if (from !== navSearch) navSearch.value = v; if (from !== libSearch) libSearch.value = v;
  if (v && lib.filter !== 'all' && !['favorites', 'recent'].includes(lib.filter)) lib.filter = 'all';
  renderLibrary();
  if (from === navSearch && v && !scrolledForSearch) { scrolledForSearch = true; document.getElementById('library').scrollIntoView({ behavior: 'smooth' }); }
  if (!v) scrolledForSearch = false;
}
navSearch.addEventListener('input', () => onSearch(navSearch.value, navSearch));
libSearch.addEventListener('input', () => onSearch(libSearch.value, libSearch));
navSearch.addEventListener('keydown', (e) => { if (e.key === 'Enter') { document.getElementById('library').scrollIntoView({ behavior: 'smooth' }); } });
document.getElementById('sortSel').addEventListener('change', (e) => { lib.sort = e.target.value; renderLibrary(); });

// Delegated clicks: filters, play buttons, smooth scroll, dropdown.
const dd = document.querySelector('.dd');
document.addEventListener('click', (e) => {
  const f = e.target.closest('[data-filter]');
  if (f) { e.preventDefault(); if (f.hasAttribute('data-clear')) { onSearch('', null); } dd.classList.remove('open'); setFilter(f.dataset.filter, !f.classList.contains('chip')); return; }
  const p = e.target.closest('[data-play]');
  if (p && !p.closest('.card') && !p.closest('.player')) { e.preventDefault(); launch(p.dataset.play); return; }
  const a = e.target.closest('a[href^="#"]');
  if (a && !p) {
    const id = a.getAttribute('href').slice(1); const t = id === 'top' ? document.body : document.getElementById(id);
    if (t) { e.preventDefault(); (id === 'top' ? window.scrollTo({ top: 0, behavior: 'smooth' }) : t.scrollIntoView({ behavior: 'smooth' })); sfx('click'); }
  }
  const ddBtn = e.target.closest('[data-dd]');
  if (ddBtn) { const open = !dd.classList.contains('open'); dd.classList.toggle('open', open); ddBtn.setAttribute('aria-expanded', open); }
  else if (!e.target.closest('.dd-menu')) dd.classList.remove('open');
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') dd.classList.remove('open');
  if (e.key === '/' && !isPlaying() && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); navSearch.focus(); }
});

function launch(id) {
  const g = byId(id); if (!g) return;
  openGame(g, { onClose: () => { renderLibrary(); renderForge(); document.dispatchEvent(new Event('pf-resume-scenes')); } });
}

// ---------- Forge XP panel ----------
function miniList(ids, empty, extra = () => '') {
  return ids.length ? ids.map((id) => { const g = byId(id); return `<button class="f-item" data-play="${id}" style="--accent:${g.accent}"><span class="f-dot"></span><span>${g.title}<small>${g.genre}</small></span>${extra(g)}</button>`; }).join('')
    : `<p class="f-empty">${empty}</p>`;
}
function renderForge() {
  const s = store.get(), L = levelFor(s.xp);
  document.querySelectorAll('[data-lvl]').forEach((e) => (e.textContent = L.lvl));
  document.querySelectorAll('[data-xp]').forEach((e) => (e.textContent = `${s.xp.toLocaleString()} XP`));
  document.querySelector('[data-xpbar]').style.width = `${L.pct * 100}%`;
  document.querySelector('[data-xpnext]').textContent = `${(L.next - s.xp).toLocaleString()} XP to level ${L.lvl + 1}`;
  document.querySelector('[data-ring]').style.strokeDashoffset = 327 * (1 - L.pct);
  document.querySelector('[data-played]').textContent = Object.keys(s.plays).length;
  document.querySelector('[data-sessions]').textContent = Object.values(s.plays).reduce((a, b) => a + b, 0);
  document.querySelector('[data-bests]').textContent = Object.keys(s.best).length;
  const fc = document.querySelector('[data-fav-count]'); fc.textContent = s.favorites.length || ''; fc.hidden = !s.favorites.length;
  document.querySelector('[data-favlist]').innerHTML = miniList(s.favorites, 'Heart a game to pin it here.');
  document.querySelector('[data-recentlist]').innerHTML = miniList(s.recent.slice(0, 6), 'Open any game to start your history.');
  document.querySelector('[data-bestlist]').innerHTML = miniList(Object.keys(s.best), 'Finish a run to record your first best.', (g) => `<b>${fmtScore(g, s.best[g.id])}</b>`);
}
store.on(() => { renderForge(); refreshCards(); });

// ---------- Sound toggle ----------
const soundBtn = document.getElementById('soundBtn');
const paintSound = () => { const on = store.get().sound; soundBtn.innerHTML = on ? icons.soundOn : icons.soundOff; soundBtn.classList.toggle('on', on); soundBtn.title = on ? 'Sound on' : 'Sound off (click to enable)'; };
soundBtn.addEventListener('click', () => { setSound(!store.get().sound); paintSound(); sfx('success'); });
document.addEventListener('pf-sound', paintSound);
paintSound();

// ---------- Reveal + scroll effects ----------
const revealIO = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); } }), { threshold: 0.12, rootMargin: '0px 0px -40px' });
document.querySelectorAll('.reveal').forEach((el) => revealIO.observe(el));

const nav = document.getElementById('nav'), hero = document.querySelector('.hero');
let heroScene = null;
const onScroll = () => {
  const y = scrollY, h = hero.offsetHeight;
  const p = Math.min(1, y / h);
  hero.style.setProperty('--p', p.toFixed(3));
  heroScene?.setProgress(p);
  nav.classList.toggle('solid', y > 40);
};
addEventListener('scroll', onScroll, { passive: true }); onScroll();

// 3D is loaded after first paint so the page and library are usable immediately.
const start3D = () => {
  import('./hero.js').then(({ mountHero }) => { heroScene = mountHero(document.getElementById('heroCanvas')); onScroll(); });
  import('./showcases.js').then(({ mountShowcase }) => document.querySelectorAll('.showcase').forEach((s) => mountShowcase(s, s.dataset.kind)));
};
(window.requestIdleCallback || ((f) => setTimeout(f, 60)))(start3D);

renderLibrary(); renderForge();

// Deep link: #play/<id>
const m = location.hash.match(/^#play\/(.+)$/);
if (m && byId(m[1])) { history.replaceState(null, '', location.pathname); launch(m[1]); }
window.__playforge = { launch, closeGame, setFilter, GAMES };
