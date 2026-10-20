// Scripted play-throughs that check controls really change game state (score / progress / inventory).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const server = spawn('npx', ['vite', 'preview', '--port', '5197', '--strictPort'], { stdio: 'ignore' });
for (let i = 0; i < 60; i++) { try { await fetch('http://localhost:5197/'); break; } catch { await new Promise((r) => setTimeout(r, 500)); } }
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:5197/');
await page.waitForTimeout(1500);

const results = [];
const score = () => page.evaluate(() => document.querySelector('[data-score]').textContent);
const status = () => page.evaluate(() => document.querySelector('[data-status]').textContent);
async function open(id) { await page.evaluate((id) => window.__playforge.launch(id), id); await page.waitForSelector('[data-act="go"]'); await page.click('[data-act="go"]'); await page.waitForTimeout(500); }
async function close() { await page.click('.p-back'); await page.waitForTimeout(300); }
const check = (name, ok, detail) => { results.push(ok); console.log(`${ok ? '✓' : '✗'} ${name.padEnd(18)} ${detail}`); };

// Memory Vault — watch the lit sequence, then repeat it.
await open('memory-vault');
await page.click('[data-m="easy"]');
for (let round = 0; round < 3; round++) {
  const seq = []; let prev = -1;
  await page.waitForFunction(() => document.querySelector('.mv-msg')?.textContent.startsWith('Watch'));
  while (true) {
    const st = await page.evaluate(() => ({ lit: [...document.querySelectorAll('.mv-grid button')].findIndex((b) => b.classList.contains('lit')), msg: document.querySelector('.mv-msg').textContent }));
    if (st.msg === 'Your turn!') break;
    if (st.lit >= 0 && prev < 0) seq.push(st.lit);
    prev = st.lit;
    await page.waitForTimeout(30);
  }
  for (const i of seq) await page.click(`.mv-grid [data-i="${i}"]`);
  await page.waitForTimeout(300);
}
check('memory-vault', parseInt(await score()) >= 60, `score ${await score()}, ${await status()}`);
await close();

// Word Wizard — find a valid word from the tiles with the bundled dictionary and cast it.
const words = readFileSync(new URL('../src/data/words.js', import.meta.url), 'utf8').match(/export default "([^"]+)"/)[1].split(' ');
await open('word-wizard');
await page.click('[data-m="easy"]');
const letters = (await page.$$eval('.ww-tiles button', (b) => b.map((x) => x.textContent.toLowerCase()))).join('');
const can = (w) => { const pool = [...letters]; for (const ch of w) { const i = pool.indexOf(ch); if (i < 0) return false; pool.splice(i, 1); } return true; };
const found = words.filter((w) => w.length >= 3 && can(w)).slice(0, 3);
for (const w of found) { await page.keyboard.type(w); await page.keyboard.press('Enter'); await page.waitForTimeout(150); }
await page.keyboard.type('zzq'); await page.keyboard.press('Enter');
const fb = await page.textContent('.ww-fb');
check('word-wizard', parseInt((await score()).replace(/,/g, '')) > 0 && /spellbook|3\+/.test(fb), `letters "${letters}" cast ${found.join(', ')} → score ${await score()}; invalid feedback: "${fb}"`);
await close();

// Stack Attack — drop each slab when it lines up with the tower below.
await open('stack-attack');
for (let i = 0; i < 5; i++) {
  await page.waitForFunction(() => Math.abs(parseFloat(document.querySelector('.p-stage').dataset.slide)) < 0.4, null, { timeout: 60000 });
  await page.keyboard.press('Space'); await page.waitForTimeout(200);
}
check('stack-attack', parseInt(await score()) > 0 && /Height [1-9]/.test(await status()), `score ${await score()}, ${await status()}`);
await close();

// Tower Defenders — build a cannon next to the path and start wave 1.
await open('tower-defenders');
const cv = await page.locator('.p-stage canvas').boundingBox();
const at = (c, r) => ({ x: cv.x + ((c + 0.5) / 16) * cv.width, y: cv.y + ((r + 0.5) / 10) * cv.height });
await page.mouse.click(at(3, 4).x, at(3, 4).y);
await page.mouse.click(at(5, 3).x, at(5, 3).y);
await page.click('.g-panel [data-w]');
await page.waitForTimeout(9000);
check('tower-defenders', /Wave 1\/10/.test(await status()), `status "${await status()}", score ${await score()}`);
await close();

// Escape the Room — lift the rug, take the key, open the drawer with it.
await open('escape-room');
const er = await page.locator('.p-stage canvas').boundingBox();
const ec = (x, y) => page.mouse.click(er.x + (x / 960) * er.width, er.y + (y / 540) * er.height);
await ec(600, 490); await page.waitForTimeout(100); await ec(600, 490); await page.waitForTimeout(100);
const hasKey = await page.locator('[data-item="key"]').count();
await page.click('[data-item="key"]'); await ec(350, 380); await page.waitForTimeout(100); await ec(350, 380);
const hasTorch = await page.locator('[data-item="torch"]').count();
check('escape-room', hasKey && hasTorch, `key picked up: ${!!hasKey}, drawer opened & torch taken: ${!!hasTorch}, ${await status()}`);
await close();

// Slice Master — swipe through whichever gem is on screen.
await open('slice-master');
const sm = await page.locator('.p-stage canvas').boundingBox();
for (let i = 0; i < 30 && parseInt(await score()) < 30; i++) {
  const tg = await page.evaluate(() => document.querySelector('.p-stage')?.dataset.target);
  if (!tg) { await page.waitForTimeout(150); continue; }
  const [nx, ny] = tg.split(',').map(Number), x = sm.x + nx * sm.width, y = sm.y + ny * sm.height;
  await page.mouse.move(x - 60, y - 20); await page.mouse.down(); await page.mouse.move(x + 60, y + 20, { steps: 4 }); await page.mouse.up();
}
check('slice-master', parseInt(await score()) > 0, `score ${await score()}, ${await status()}`);
await close();

console.log(errors.length ? `Errors: ${errors.join(' | ')}` : 'No page errors.');
await browser.close(); server.kill();
process.exit(results.every(Boolean) && !errors.length ? 0 : 1);
