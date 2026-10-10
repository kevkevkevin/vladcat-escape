const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const origin = 'http://127.0.0.1:3000';
const report = { checks: [], browserErrors: [] };
const check = name => { report.checks.push(name); console.log(JSON.stringify({ passed: name })); };
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', e => report.browserErrors.push(e.message));
    const requests = [];
    page.on('request', r => requests.push(new URL(r.url()).pathname));
    await page.goto(origin);
    await page.getByRole('heading', { name: 'ESCAPE THE VOID. CHASE THE GLORY.' }).waitFor();
    assert.equal(await page.locator('iframe').count(), 0);
    assert.ok(!requests.includes('/api/runtime'));
    await page.screenshot({ path: 'artifacts/landing-desktop.png', fullPage: true });
    await page.getByRole('link', { name: 'Play VLADCAT ESCAPE ↗', exact: true }).click();
    await page.waitForURL('**/play');
    await page.waitForFunction(() => !document.querySelector('.game-loading'));
    assert.equal(await page.locator('.vladcat-intro').count(), 0);
    assert.equal(await page.getByRole('region', { name: 'Leaderboard', exact: true }).count(), 0);
    assert.equal(await page.getByRole('region', { name: 'List of shames', exact: true }).count(), 0);
    assert.ok((await page.locator('.play-shell').boundingBox()).width > 1300);
    assert.equal(await page.locator('#profile-panel').evaluate(el => el.open), true);
    await page.screenshot({ path: 'artifacts/play-desktop.png', fullPage: true });
    check('Home loads no game; Play navigation shows the wider canvas without hero or ranking tables');
    await page.getByRole('navigation').getByRole('link', { name: 'Leaderboard', exact: true }).click();
    await page.waitForURL('**/leaderboard');
    await page.getByRole('region', { name: 'Leaderboard', exact: true }).waitFor();
    await page.getByRole('region', { name: 'List of shames', exact: true }).waitFor();
    assert.equal(await page.locator('iframe').count(), 0);
    await page.screenshot({ path: 'artifacts/leaderboard-desktop.png', fullPage: true });
    check('Dedicated leaderboard page contains rankings and shames and no game iframe');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin+'/play');
    await page.waitForFunction(() => !document.querySelector('.game-loading'));
    assert.equal(await page.locator('#profile-panel').evaluate(el => el.open), false);
    assert.equal(await page.locator('#instructions-panel').evaluate(el => el.open), false);
    assert.ok(await page.locator('.rotate-phone-tip').isVisible());
    await page.locator('#instructions-panel > summary').click();
    assert.equal(await page.locator('#instructions-panel').evaluate(el => el.open), true);
    await page.getByText('Turn your phone horizontally for a better experience. Tap ⛶ to enter fullscreen.', { exact: true }).waitFor();
    await page.locator('#instructions-panel > summary').click();
    await page.getByRole('button', { name: 'Take the challenge →', exact: true }).click();
    await page.getByLabel('Email', { exact: true }).waitFor();
    assert.equal(await page.locator('#profile-panel').evaluate(el => el.open), true);
    await page.locator('#profile-panel > summary').click();
    await page.screenshot({ path: 'artifacts/play-mobile.png', fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    check('Mobile profile and instructions toggle; challenge opens login; portrait rotation tip is visible');
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForFunction(() => !document.querySelector('#profile-panel').open && !document.querySelector('#instructions-panel').open);
    assert.equal(await page.locator('.rotate-phone-tip').isVisible(), false);
    await page.screenshot({ path: 'artifacts/play-landscape.png', fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    check('Landscape hides the rotation tip and keeps the play layout within the viewport');
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ['/', '/leaderboard', '/editor']) {
      const response = await page.goto(origin+path); assert.equal(response.status(), 200);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Overflow at ${path}`);
      if(path === '/') {
        await page.locator('.rewards-image img').scrollIntoViewIfNeeded();
        await page.waitForFunction(() => document.querySelector('.rewards-image img').complete);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: 'artifacts/landing-mobile.png', fullPage: true });
      }
    }
    assert.equal(report.browserErrors.length, 0);
    check('Landing, leaderboard and editor routes work on mobile with no browser errors');
  } finally { await browser.close(); await fs.writeFile('artifacts/pages-ui-results.json', JSON.stringify(report, null, 2)+'\n'); }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
