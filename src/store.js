// Local save data: favorites, recently played, personal bests, Forge XP and settings.
const KEY = 'playforge.v1';
const defaults = () => ({ favorites: [], recent: [], best: {}, plays: {}, xp: 0, sound: false });
let state;
try { state = { ...defaults(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { state = defaults(); }
const listeners = new Set();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} listeners.forEach((f) => f(state)); };

export const store = {
  get: () => state,
  on: (f) => (listeners.add(f), () => listeners.delete(f)),
  isFav: (id) => state.favorites.includes(id),
  toggleFav(id) {
    state.favorites = store.isFav(id) ? state.favorites.filter((x) => x !== id) : [id, ...state.favorites];
    save();
  },
  markPlayed(id) {
    state.recent = [id, ...state.recent.filter((x) => x !== id)].slice(0, 12);
    state.plays[id] = (state.plays[id] || 0) + 1;
    save();
  },
  recentIndex: (id) => { const i = state.recent.indexOf(id); return i < 0 ? 999 : i; },
  setSound(on) { state.sound = on; save(); },
  // Returns { xp gained, newBest }
  submit(game, { score, won }) {
    let gained = 10;
    const prev = state.best[game.id];
    const valid = typeof score === 'number' && isFinite(score);
    const better = valid && (prev == null || (game.lowerBetter ? score < prev : score > prev));
    // Times only count as bests when the run was finished.
    const newBest = better && (!game.lowerBetter || won) && (score > 0 || game.lowerBetter);
    if (won) gained += 40;
    if (newBest) { state.best[game.id] = score; gained += 30; }
    state.xp += gained;
    save();
    return { gained, newBest, best: state.best[game.id] };
  },
};

export const levelFor = (xp) => {
  const lvl = Math.floor(Math.sqrt(xp / 60)) + 1;
  const cur = 60 * (lvl - 1) ** 2, next = 60 * lvl ** 2;
  return { lvl, pct: (xp - cur) / (next - cur), next };
};

export const fmtScore = (game, v) => {
  if (v == null) return '—';
  if (game.lowerBetter) { const m = Math.floor(v / 60), s = (v % 60).toFixed(2).padStart(5, '0'); return `${m}:${s}`; }
  return Math.round(v).toLocaleString();
};
