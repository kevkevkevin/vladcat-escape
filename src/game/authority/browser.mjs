import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { WIDTH, HEIGHT, KEY_CODES } from './protocol.mjs';
import { compileProject } from '../codec.mjs';

const browserKey = Symbol.for('vladcat.authority.browser');
export async function serverBrowser() {
  if (!globalThis[browserKey]) {
    globalThis[browserKey] = chromium.launch({ headless: true, chromiumSandbox: true,
      ...(process.env.VLADCAT_CHROMIUM_PATH ? { executablePath: process.env.VLADCAT_CHROMIUM_PATH } : process.platform === 'win32' ? { channel: 'chrome' } : {}),
      args: ['--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
    }).catch(error => { delete globalThis[browserKey]; throw error; });
  }
  const browser = await globalThis[browserKey];
  if (!browser.isConnected()) { delete globalThis[browserKey]; return serverBrowser(); }
  return browser;
}
export async function closeServerBrowser() {
  const browser = globalThis[browserKey]; delete globalThis[browserKey];
  if (browser) await (await browser).close();
}
const mime = { '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.webm': 'audio/webm', '.ogg': 'audio/ogg' };
export async function createEngine(source, run) {
  if (!Number.isInteger(run.stage) || run.stage < 1 || run.stage > 49 || !Array.isArray(run.splits) || run.splits.length !== run.stage - 1) throw new Error('Invalid saved stage order');
  const context = await (await serverBrowser()).newContext({ viewport: { width: WIDTH, height: HEIGHT }, serviceWorkers: 'block', acceptDownloads: false });
  const page = await context.newPage();
  const root = path.resolve('public');
  const project = compileProject(source, { startLayout: `Level_${run.stage}` });
  const bootstrap = await fs.readFile(path.resolve('src/game/authority/bootstrap.js'), 'utf8');
  // No network access, server credentials, client cookies, editable previews,
  // navigation, or code supplied by a player enter this browser.
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'https://vladcat-engine.invalid' || route.request().method() !== 'GET') return route.abort();
    if (url.pathname === '/authority-project') return route.fulfill({ json: { project, stage: run.stage, handle: run.name, savedTiming: { stage: run.stage, stageMs: run.stageMs, splits: run.splits } } });
    if (url.pathname === '/game/authority-bootstrap.js') return route.fulfill({ contentType: 'text/javascript', body: bootstrap });
    if (!/^\/(game|vladcat)\/[a-zA-Z0-9_./-]+$/.test(url.pathname) || url.pathname.includes('..')) return route.abort();
    const target = path.resolve(root, '.' + url.pathname);
    if (!target.startsWith(root + path.sep)) return route.abort();
    try {
      let body = await fs.readFile(target);
      if (url.pathname === '/game/index.html') body = Buffer.from(body.toString().replace('src="bootstrap.js"', 'src="authority-bootstrap.js"'));
      return route.fulfill({ contentType: mime[path.extname(target)] ?? 'application/octet-stream', body });
    } catch { return route.abort(); }
  });
  page.on('popup', popup => { void popup.close(); });
  await context.routeWebSocket('**/*', socket => { socket.close(); });
  page.on('dialog', dialog => { void dialog.dismiss(); });
  let keys = new Set(); let pointerDown = false;
  try {
    await page.goto('https://vladcat-engine.invalid/game/index.html');
    await page.waitForFunction(() => window.__authority?.snapshot().loaded && window.__authority.snapshot().tick > 2, { timeout: 15000 });
    return {
      async snapshot() { return page.evaluate(() => window.__authority.snapshot()); },
      // Read-only server diagnostics, never part of the public input protocol.
      async inspect() { return page.evaluate(() => window.__authority.inspect()); },
      async acknowledge(count) { await page.evaluate(n => window.__authority.acknowledge(n), count); },
      async acknowledgeAudio(id) { await page.evaluate(n => window.__authority.acknowledgeAudio(n), id); },
      async pause(value) { await page.evaluate(p => window.__authority.pause(p), value); },
      async input(input) {
        const next = new Set(input.paused ? [] : input.keys);
        for (const code of keys) if (!next.has(code)) await page.keyboard.up(KEY_CODES[code]);
        for (const code of next) if (!keys.has(code)) await page.keyboard.down(KEY_CODES[code]);
        keys = next;
        if (input.pointer) await page.mouse.move(input.pointer.x, input.pointer.y);
        const down = !input.paused && Boolean(input.pointer?.down);
        if (pointerDown && !down) await page.mouse.up();
        if (!pointerDown && down) await page.mouse.down();
        pointerDown = down;
      },
      async frame() { return (await page.screenshot({ type: 'jpeg', quality: 80, timeout: 4000 })).toString('base64'); },
      async close() { await context.close(); },
    };
  } catch (error) { await context.close(); throw error; }
}
