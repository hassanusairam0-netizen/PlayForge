// Smoke test: loads the site, opens every game, starts it, drives inputs, checks for errors,
// verifies teardown, and captures screenshots. Usage: node tests/smoke.mjs [gameId ...] [--mobile]
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const mobile = args.includes('--mobile');
const only = args.filter((a) => !a.startsWith('--'));
const out = new URL('../test-results/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });

// Test the production build so file edits (HMR) can't reload the page mid-run.
execSync('npx vite build', { stdio: 'ignore' });
const server = spawn('npx', ['vite', 'preview', '--port', '5199', '--strictPort'], { stdio: 'pipe' });
for (let i = 0; i < 60; i++) { try { await fetch('http://localhost:5199/'); break; } catch { await new Promise((r) => setTimeout(r, 500)); } }

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1024, height: 680 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`); });

await page.goto('http://localhost:5199/', { waitUntil: 'load' });
await page.waitForTimeout(2500);
const tag = mobile ? 'm-' : '';
await page.screenshot({ path: `${out}${tag}00-hero.png` });

const games = await page.evaluate(() => window.__playforge.GAMES.map((g) => g.id));
console.log(`Library has ${games.length} games; cards rendered: ${await page.locator('#libGrid .card').count()}`);

const results = [];
for (const id of games) {
  if (only.length && !only.includes(id)) continue;
  const before = errors.length;
  await page.evaluate((id) => window.__playforge.launch(id), id);
  await page.waitForSelector('[data-act="go"]', { timeout: 15000 });
  await page.click('[data-act="go"]');
  await page.waitForTimeout(700);
  const stage = await page.locator('.p-stage').boundingBox();
  const cx = stage.x + stage.width / 2, cy = stage.y + stage.height / 2;
  // Drive a generic mix of inputs.
  for (let i = 0; i < 6; i++) {
    if (await page.locator('.p-overlay.show').count()) break; // game over / menu shown: stop random clicking
    await page.keyboard.down(['KeyW', 'KeyD', 'ArrowRight', 'KeyA'][i % 4]);
    await page.mouse.move(cx + (i - 3) * 40, cy + (i % 2 ? 30 : -30));
    await page.mouse.down(); await page.waitForTimeout(120); await page.mouse.up();
    await page.keyboard.press('Space');
    await page.keyboard.up(['KeyW', 'KeyD', 'ArrowRight', 'KeyA'][i % 4]);
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}${tag}${id}.png`, timeout: 120000 }).catch(() => console.log(`  (screenshot timed out for ${id})`));
  const state = await page.evaluate(() => ({ score: document.querySelector('[data-score]')?.textContent, status: document.querySelector('[data-status]')?.textContent, canvases: document.querySelectorAll('.p-stage canvas').length, dom: document.querySelector('.p-stage')?.children.length ?? 0 }));
  // Pause / resume / restart / exit
  const ended = await page.locator('.p-overlay.end').count();
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  const paused = ended ? 'ended' : await page.locator('.p-overlay.pause').count();
  if (paused === 1) await page.click('[data-act="resume"]');
  await page.click('.p-ctrls [data-act="restart"]'); await page.waitForTimeout(300);
  const restarted = await page.evaluate(() => document.querySelectorAll('.p-stage canvas, .p-stage .g-dom').length);
  await page.click('.p-back'); await page.waitForTimeout(400);
  const leftover = await page.evaluate(() => document.querySelectorAll('.player').length);
  const errs = errors.slice(before);
  const ok = !errs.length && !leftover && restarted > 0 && state.status !== 'Ready' && (state.canvases > 0 || state.dom > 0);
  results.push({ id, ...state, paused: !!paused, leftover, errs, ok });
  console.log(`${ok ? '✓' : '✗'} ${id.padEnd(20)} score=${state.score} status=${state.status} canvas=${state.canvases} paused=${paused} restart=${restarted} leftover=${leftover}${errs.length ? '\n   ' + errs.join('\n   ') : ''}`);
}

// Discovery checks
await page.fill('#libSearch', 'drift');
const searchCount = await page.locator('#libGrid .card').count();
await page.fill('#libSearch', 'zzzz');
const emptyShown = await page.locator('#libEmpty:not([hidden])').count();
await page.fill('#libSearch', '');
await page.click('.chip[data-filter="racing"]');
const racing = await page.locator('#libGrid .card').count();
await page.click('#libGrid .card .fav >> nth=0');
await page.click('.chip[data-filter="favorites"]');
const favs = await page.locator('#libGrid .card').count();
await page.click('.chip[data-filter="recent"]');
const recent = await page.locator('#libGrid .card').count();
console.log(`search "drift"=${searchCount} empty-state=${emptyShown} racing=${racing} favorites=${favs} recent=${recent}`);
await page.click('.chip[data-filter="all"]');
await page.locator('#library').scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}${tag}01-library.png` });
for (const [i, sel] of ['#ch-01', '.sc-arena', '#ch-03', '.sc-cube', '.sc-city', '#forge'].entries()) {
  await page.locator(sel).scrollIntoViewIfNeeded(); await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}${tag}02-section-${i}.png` });
}
console.log(errors.length ? `TOTAL ERRORS: ${errors.length}` : 'No console errors.');
await browser.close();
server.kill();
console.log(`${results.filter((r) => r.ok).length}/${results.length} games passed`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
