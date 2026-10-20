# PLAYFORGE — One World. 25 Ways to Play.

**Made by Usairam Hassan.**

PLAYFORGE is a premium 3D browser gaming universe: a cinematic Three.js landing experience wrapped around a library of **25 original, fully playable games**. Each game has its own mechanics, controls, goal and visual style.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm test           # Playwright smoke test: opens & drives all 25 games (uses the preinstalled Chromium)
```

## The 25 games

| # | Game | Genre | Rendering | Core mechanic |
|---|------|-------|-----------|---------------|
| 01 | Neon Strike | Arena shooter | 3D | First-person aim (pointer lock), WASD, reload, drone waves, 90 s timer |
| 02 | Shadow Ops | Tactical stealth | 3D | Third-person, patrol vision cones with line-of-sight, hack 3 terminals, extract |
| 03 | Zombie Last Stand | Survival shooter | 3D | Twin-stick wave survival, ammo economy, streak multiplier, 10 waves |
| 04 | Rooftop Duel | 1v1 arena battle | 3D | Strike / dodge / bolt vs adaptive AI, best of three rounds |
| 05 | Portal Escape | Action puzzle | 3D | Side-on platformer with linked portals, switches, doors, moving platforms, checkpoints |
| 06 | Turbo Circuit | Circuit racing | 3D | 3-lap time trial, ordered checkpoint gates, ghost replay of best run |
| 07 | Drift Legends | Drift challenge | 3D | Low-grip handbrake physics, drift points, combo multiplier, walls break combos |
| 08 | Offroad Extreme | Off-road rally | 3D | Heightmap terrain, slope physics, suspension pose, mud, rocks, recovery |
| 09 | Parking Master | Precision driving | 3D | SAT collision, 6 levels of tightening bays, 3-bump limit, timer |
| 10 | Sky Racer | Aerial racing | 3D | Bank-to-turn flight, ring gates add time, boost rings, 3 courses |
| 11 | Cube Genius | 3D logic | 3D | Sliding-block puzzle in 2×2×2 → 3×3×3 lattices, orbit camera, hints |
| 12 | Circuit Breaker | Logic puzzle | 2D canvas | Rotate tiles to power all lamps; procedurally generated spanning-tree boards |
| 13 | Memory Vault | Memory | DOM | Growing glyph sequences, per-press timer, three difficulty modes |
| 14 | Escape the Room | Point & click | 2D canvas | Inventory, item use, keypad and dial locks, clue chain, hints |
| 15 | Word Wizard | Word puzzle | DOM | Offline dictionary (~19k words), timed rounds with targets, difficulty ranks |
| 16 | Slice Master | Reflex arcade | 2D canvas | Swipe-segment slicing, bombs, combos, escalating waves |
| 17 | Bounce Lab | Physics platformer | 2D canvas | Auto-bouncing ball, ramps, springs, moving platforms, power bounce |
| 18 | Stack Attack | Timing arcade | 3D | Slab slicing, perfect-drop streaks restore width |
| 19 | Gravity Flip | Platform puzzle | 2D canvas | No jump — flip gravity between floor and ceiling |
| 20 | Chaos Pinball | Pinball | 3D | 2D rigid-ball physics, flippers, bumpers, slings, targets, multiball |
| 21 | Mini City Builder | City building | 3D | Grid zoning, money / jobs / happiness simulation, auto-save + reload |
| 22 | Island Survivor | Survival | 3D | Gather, craft, hunger & warmth, day/night cycle, signal-fire rescue |
| 23 | Tower Defenders | Tower defense | 2D canvas | 3 tower types, upgrades, selling, 10 waves with a boss |
| 24 | Pet World | Creature collecting | 3D | Rarity tiers, skittish rares, treasure treats, collection book, pet parade |
| 25 | Cosmic Explorer | Space exploration | 3D | Free-flight ship, energy management, instanced asteroid field, return to base |

## Architecture

```
index.html
src/
  main.js            page: nav, hero, chapters, showcases, library (search / filter / sort), Forge XP
  hero.js            Three.js hero universe (lazy-loaded after first paint)
  showcases.js       5 cinematic featured scenes, created on approach, rendered only while visible
  thumbs.js          procedural card artwork for every game (animated on hover)
  player.js          shared game player: loading, start / pause / end screens, HUD bar, fullscreen, teardown
  store.js           localStorage: favorites, recently played, personal bests, Forge XP, settings
  audio.js           procedural Web Audio SFX, engine hum and ambience (muted until enabled)
  games/
    registry.js      metadata + lazy import() for each game
    lib/kit.js       loop, keyboard / pointer / touch-stick input, HUD helpers, 2D canvas
    lib/three-kit.js renderer scaffolding, disposal, lights, textures, particles
    lib/car.js       shared arcade car model + physics (tuned differently per game)
    <25 game modules>
  data/words.js      offline word list for Word Wizard (derived from SCOWL via wordlist-english)
tests/smoke.mjs      Playwright smoke test
```

**Game contract.** Each module exports `create(host)` and returns `{ start, pause, resume, destroy }`.
`host` provides the stage element, `score()`, `status()`, `end({ won, score, title, msg })`, sound helpers and touch detection.
`destroy()` removes listeners, stops loops and disposes WebGL resources, so switching games doesn't leak.

Every game is a separate chunk loaded only when opened. Three.js is shared between the hero, the showcases and the 3D games.

## Progression (Forge XP)

- +10 XP per finished session, +40 for a win or completion, +30 for a new personal best.
- Level = ⌊√(XP / 60)⌋ + 1. The Forge panel shows total XP, level, favorites, recently played games and personal bests.
- Everything is stored in `localStorage`. No account is needed.

## Credits

Design, code and games: **Usairam Hassan**. Built with [Three.js](https://threejs.org) and [Vite](https://vitejs.dev).
Word list: SCOWL (© Kevin Atkinson, permissive licence) via `wordlist-english`.
