// Run inside the deployed container before opening challenges to players.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';

assert.notEqual(process.getuid?.(), 0, 'Chromium must run as a non-root user');
await fs.access('src/game/authority/bootstrap.js');
await fs.access('public/game/index.html');
const browser = await chromium.launch({ headless: true, chromiumSandbox: true });
try {
  const page = await browser.newPage();
  await page.setContent('<canvas id="canvas" width="32" height="32"></canvas>');
  await page.evaluate(() => document.querySelector('canvas').getContext('2d').fillRect(0, 0, 32, 32));
  assert.ok((await page.screenshot({ type: 'jpeg' })).length > 100);
  console.log('Non-root Chromium launched with sandbox enabled; canvas/screenshot and game assets passed.');
} finally {
  await browser.close();
}
