// Shared game-player shell: loading, start screen, HUD bar, pause/restart,
// fullscreen, sound, completion screen and clean teardown of each game module.
import { store, fmtScore, levelFor } from './store.js';
import { sfx, engine, ambient, setSound } from './audio.js';
import { isTouch } from './games/lib/kit.js';
import { drawThumb } from './thumbs.js';
import { icons } from './icons.js';

let current = null;

export function isPlaying() { return !!current; }

export async function openGame(game, { onClose } = {}) {
  if (current) closeGame(true);
  store.markPlayed(game.id);
  sfx('click');

  const root = document.createElement('div');
  root.className = 'player';
  root.style.setProperty('--accent', game.accent);
  root.style.setProperty('--accent2', game.accent2);
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', `${game.title} game player`);
  root.innerHTML = `
    <header class="p-bar">
      <button class="p-back" data-act="back" aria-label="Return to games">${icons.back}<span>Games</span></button>
      <div class="p-title"><span class="p-num">${game.num}</span><div><h2>${game.title}</h2><small>${game.genre} · ${game.render}</small></div></div>
      <div class="p-stats">
        <div><label>${game.scoreLabel}</label><b data-score>—</b></div>
        <div><label>Best</label><b data-best>${fmtScore(game, store.get().best[game.id])}</b></div>
        <div class="p-status" data-status>Ready</div>
      </div>
      <div class="p-ctrls">
        <button data-act="pause" aria-label="Pause" title="Pause (Esc / P)">${icons.pause}</button>
        <button data-act="restart" aria-label="Restart" title="Restart">${icons.restart}</button>
        <button data-act="help" aria-label="Instructions" title="Instructions">${icons.help}</button>
        <button data-act="sound" aria-label="Toggle sound" title="Sound">${store.get().sound ? icons.soundOn : icons.soundOff}</button>
        <button data-act="fullscreen" aria-label="Fullscreen" title="Fullscreen">${icons.full}</button>
      </div>
    </header>
    <main class="p-main"><div class="p-stage" tabindex="-1"></div><div class="p-overlay"></div></main>`;
  document.body.appendChild(root);
  document.documentElement.classList.add('playing');
  requestAnimationFrame(() => root.classList.add('open'));

  const $ = (s) => root.querySelector(s);
  const stage = $('.p-stage'), overlay = $('.p-overlay');
  const st = { game, root, stage, overlay, inst: null, mod: null, state: 'loading', onClose, sounds: [] };
  current = st;
  history.pushState({ playforge: game.id }, '', `#play/${game.id}`);

  const setStatus = (t) => ($('[data-status]').textContent = t);
  const setScore = (v) => ($('[data-score]').textContent = fmtScore(game, v));

  const showOverlay = (html, cls = '') => { overlay.className = 'p-overlay show ' + cls; overlay.innerHTML = html; };
  const hideOverlay = () => { overlay.className = 'p-overlay'; overlay.innerHTML = ''; };

  const instructions = () => `
    <div class="p-howto">
      <h4>Objective</h4><p>${game.goal}</p>
      <h4>Controls</h4><ul>${game.controls.map((c) => `<li>${c}</li>`).join('')}</ul>
    </div>`;

  const startScreen = () => {
    st.state = 'start';
    const best = store.get().best[game.id];
    showOverlay(`
      <div class="p-card p-start">
        <canvas class="p-art" width="640" height="300"></canvas>
        <div class="p-start-body">
          <span class="kicker">${game.num} · ${game.genre}</span>
          <h3>${game.title}</h3>
          <p class="lead">${game.desc}</p>
          ${instructions()}
          <div class="p-actions">
            <button class="btn btn-primary" data-act="go">${icons.play} Start game</button>
            <button class="btn btn-ghost" data-act="back">Back to library</button>
          </div>
          <p class="p-meta">${best != null ? `Personal best: <b>${fmtScore(game, best)}</b> · ` : ''}~${game.time} · ${'●'.repeat(game.difficulty)}${'○'.repeat(3 - game.difficulty)} difficulty</p>
        </div>
      </div>`, 'start');
    const c = overlay.querySelector('.p-art');
    drawThumb(game, c.getContext('2d'), c.width, c.height, 1.2);
    overlay.querySelector('[data-act="go"]').focus();
  };

  const host = {
    el: stage, game, touch: isTouch(),
    get best() { return store.get().best[game.id]; },
    score: setScore, status: setStatus, sfx,
    engine: (...a) => { const e = engine(...a); st.sounds.push(e); return e; },
    ambient: (...a) => { const e = ambient(...a); st.sounds.push(e); return e; },
    end(res) { if (st.inst && st.state === 'playing') finish(res); },
  };

  const stopSounds = () => { st.sounds.forEach((s) => s.stop()); st.sounds = []; };

  const begin = () => {
    teardown();
    stage.innerHTML = '';
    hideOverlay();
    setScore(game.lowerBetter ? null : 0); setStatus('Playing');
    try {
      st.inst = st.mod.default(host);
      st.state = 'playing';
      st.inst.start();
      stage.focus({ preventScroll: true });
      sfx('start');
    } catch (err) {
      console.error(err);
      showOverlay(`<div class="p-card"><h3>Something went wrong</h3><p>${err.message}</p><button class="btn btn-primary" data-act="restart">Try again</button></div>`);
    }
  };

  const teardown = () => {
    if (document.pointerLockElement) document.exitPointerLock();
    stopSounds();
    if (st.inst) { try { st.inst.destroy(); } catch (e) { console.error(e); } st.inst = null; }
  };

  const finish = (res) => {
    st.state = 'ended';
    st.inst.pause();
    stopSounds();
    if (document.pointerLockElement) document.exitPointerLock();
    const before = levelFor(store.get().xp).lvl;
    const r = store.submit(game, res);
    const after = levelFor(store.get().xp).lvl;
    $('[data-best]').textContent = fmtScore(game, r.best);
    setStatus(res.won ? 'Complete' : 'Game over');
    sfx(res.won ? 'win' : 'lose');
    showOverlay(`
      <div class="p-card p-end ${res.won ? 'won' : 'lost'}">
        <span class="kicker">${res.won ? 'Mission complete' : 'Run over'}</span>
        <h3>${res.title || (res.won ? 'Victory!' : 'Game Over')}</h3>
        ${res.msg ? `<p class="lead">${res.msg}</p>` : ''}
        <div class="p-result">
          <div><label>${game.scoreLabel}</label><b>${fmtScore(game, res.score)}</b></div>
          <div><label>Best</label><b>${fmtScore(game, r.best)}</b></div>
          <div><label>Forge XP</label><b>+${r.gained}</b></div>
        </div>
        ${r.newBest ? '<p class="p-badge">★ New personal best!</p>' : ''}
        ${after > before ? `<p class="p-badge lvl">Level up! You are now Forge level ${after}.</p>` : ''}
        <div class="p-actions">
          <button class="btn btn-primary" data-act="restart">${icons.restart} Play again</button>
          <button class="btn btn-ghost" data-act="back">Back to library</button>
        </div>
      </div>`, 'end');
    overlay.querySelector('[data-act="restart"]').focus();
  };

  const pause = () => {
    if (st.state !== 'playing') return;
    st.state = 'paused'; st.inst.pause();
    if (document.pointerLockElement) document.exitPointerLock();
    st.sounds.forEach((s) => s.set?.(0));
    setStatus('Paused');
    $('[data-act="pause"]').innerHTML = icons.play;
    showOverlay(`<div class="p-card p-pause"><span class="kicker">Paused</span><h3>${game.title}</h3>${instructions()}
      <div class="p-actions"><button class="btn btn-primary" data-act="resume">${icons.play} Resume</button>
      <button class="btn btn-ghost" data-act="restart">Restart</button><button class="btn btn-ghost" data-act="back">Exit to library</button></div></div>`, 'pause');
    overlay.querySelector('[data-act="resume"]').focus();
  };
  const resume = () => {
    if (st.state !== 'paused') return;
    hideOverlay(); st.state = 'playing'; st.inst.resume(); setStatus('Playing');
    $('[data-act="pause"]').innerHTML = icons.pause;
    stage.focus({ preventScroll: true });
  };
  st.pause = pause;

  const actions = {
    back: () => closeGame(),
    go: begin,
    restart: () => { $('[data-act="pause"]').innerHTML = icons.pause; begin(); },
    resume,
    pause: () => (st.state === 'paused' ? resume() : pause()),
    help: () => (st.state === 'playing' ? pause() : st.state === 'start' ? null : null),
    sound: (btn) => { setSound(!store.get().sound); btn.innerHTML = store.get().sound ? icons.soundOn : icons.soundOff; document.dispatchEvent(new Event('pf-sound')); },
    fullscreen: () => {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else (root.requestFullscreen || root.webkitRequestFullscreen)?.call(root);
    },
  };
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    e.preventDefault(); actions[b.dataset.act]?.(b);
  });
  st.onKey = (e) => {
    if (e.code === 'Escape' || (e.code === 'KeyP' && st.state !== 'start' && !game.typing)) {
      if (st.state === 'playing') pause(); else if (st.state === 'paused') resume();
    } else if (e.code === 'Enter' && st.state === 'start') begin();
  };
  st.onVis = () => { if (document.hidden) pause(); };
  st.onPop = () => { if (current === st) closeGame(true); };
  window.addEventListener('keydown', st.onKey);
  document.addEventListener('visibilitychange', st.onVis);
  window.addEventListener('popstate', st.onPop);
  st.teardown = teardown;

  showOverlay('<div class="p-loading"><div class="spinner"></div><p>Forging world…</p></div>', 'loading');
  try {
    st.mod = await game.load();
    if (current !== st) return;
    startScreen();
  } catch (err) {
    console.error(err);
    showOverlay(`<div class="p-card"><h3>Could not load ${game.title}</h3><p>Check your connection and try again.</p><button class="btn btn-ghost" data-act="back">Back</button></div>`);
  }
}

export function closeGame(fromHistory = false) {
  const st = current; if (!st) return;
  current = null;
  st.teardown();
  window.removeEventListener('keydown', st.onKey);
  document.removeEventListener('visibilitychange', st.onVis);
  window.removeEventListener('popstate', st.onPop);
  if (document.fullscreenElement) document.exitFullscreen?.();
  st.root.classList.remove('open');
  setTimeout(() => st.root.remove(), 250);
  document.documentElement.classList.remove('playing');
  if (!fromHistory && history.state?.playforge) history.back();
  sfx('click');
  st.onClose?.();
}
