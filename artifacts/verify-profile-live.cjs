// Uses one disposable QA account; never changes real player data or logs secrets.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
require('@next/env').loadEnvConfig(process.cwd(), true);
const { createClient } = require('@supabase/supabase-js');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const options = { auth: { persistSession: false, autoRefreshToken: false }, realtime: { transport: require('ws') } };
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, options);
const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options);
const origin = 'http://127.0.0.1:3000';
const stamp = crypto.randomUUID();
const email = `vladcat-qa-profile-${stamp}@example.com`;
const password = crypto.randomBytes(24).toString('base64url');
const wallet = '0x52908400098527886E0F7030069857D2E4169EE7';
const report = { checks: [], browserErrors: [], cleanup: false };
const check = name => { report.checks.push(name); console.log(JSON.stringify({ passed: name })); };
const delay = ms => new Promise(r => setTimeout(r, ms));
let createdId;
async function post(context, path, data, status = 200, requestOrigin = origin) {
  const response = await context.request.post(origin + path, { headers: { Origin: requestOrigin }, data });
  const body = await response.json();
  assert.equal(response.status(), status, `${path}: ${body.error ?? response.status()}`);
  return body;
}
(async () => {
  let browser;
  try {
    const signup = await client.auth.signUp({ email, password });
    createdId = signup.data.user?.id;
    assert.equal(signup.error, null); assert.ok(signup.data.session);
    browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
    await post(context, '/api/profile', { xHandle: '@Cat', walletAddress: wallet }, 401);
    const page = await context.newPage();
    page.on('pageerror', e => report.browserErrors.push(e.message));
    await page.goto(origin+'/play');
    await page.getByRole('button', { name: 'Take the challenge →', exact: true }).click();
    await page.getByText('Log in with email to take the challenge.', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Preview level').count(), 0);
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Log in →', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Give VLADCAT your coordinates.' });
    await dialog.waitFor();
    assert.ok(await page.locator('.stage-footer').textContent().then(t => t.includes('PRACTICE')));
    assert.equal(await page.locator('.ranked-controls').count(), 0);
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    check('Login prompts for details; closing keeps the game in practice without a stage picker');

    await client.auth.updateUser({ data: { vladcat_profile: { xHandle: '@Forged', walletAddress: wallet } }, app_metadata: { vladcat_profile: { xHandle: '@Forged', walletAddress: wallet } } });
    await post(context, '/api/runs', { action: 'start', name: '@Forged' }, 422);
    await post(context, '/api/profile', { xHandle: '@Cat', walletAddress: wallet }, 403, 'https://evil.example');
    await post(context, '/api/profile', { xHandle: '@Cat', walletAddress: '0x'+'0'.repeat(40) }, 400);
    const emptyAccount = await (await context.request.get(origin+'/api/account')).json();
    assert.equal(emptyAccount.user.walletAddress, null);
    assert.equal(emptyAccount.user.xHandle, null);
    check('Server gate rejects missing details, forged metadata, zero wallets and cross-origin updates');

    await page.getByRole('button', { name: 'Take the challenge →', exact: true }).click();
    await dialog.waitFor();
    await page.getByLabel('Enter X handle', { exact: true }).fill('@ProfileCat');
    await page.getByLabel('Wallet address (EVM)', { exact: true }).fill(wallet.toLowerCase());
    await dialog.getByRole('button', { name: 'Save & take the challenge →', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    await page.waitForFunction(() => document.querySelector('.stage-footer')?.textContent.includes('CHALLENGE · @ProfileCat'));
    await page.waitForFunction(() => !document.querySelector('.game-loading'));
    await delay(1200);
    const account = await (await context.request.get(origin+'/api/account')).json();
    assert.equal(account.user.walletAddress, wallet); assert.equal(account.user.xHandle, '@ProfileCat');
    assert.ok(await page.locator('.account-details').textContent().then(t => t.includes(wallet)));
    check('Save-and-challenge persists the checksum wallet and handle and starts stage 1');

    await page.getByRole('button', { name: 'Edit X handle and wallet address', exact: true }).click();
    await dialog.waitFor(); await delay(1000);
    const own = async () => (await admin.from('vladcat_runs').select('id,handle,status,stage_ms').eq('user_id', createdId).order('created_at', { ascending: false }).limit(1).single()).data;
    const paused = await own(); assert.equal(paused.status, 'paused');
    await delay(700); assert.equal((await own()).stage_ms, paused.stage_ms);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'artifacts/profile-modal-mobile.png' });
    const bounds = await dialog.boundingBox(); assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 391);
    assert.ok(await page.getByText('Make sure it is your active X handle. A wrong handle can’t receive rewards.', { exact: true }).isVisible());
    await page.getByLabel('Enter X handle', { exact: true }).fill('@NewProfileCat');
    await dialog.getByRole('button', { name: 'Save details →', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    assert.equal((await own()).handle, '@ProfileCat');
    check('Profile dialog pauses the challenge clock, fits mobile and preserves the current run handle');

    await page.reload();
    await page.getByRole('button', { name: 'Resume challenge →', exact: true }).waitFor();
    assert.equal(await dialog.isVisible(), false);
    assert.equal((await (await context.request.get(origin+'/api/account')).json()).user.xHandle, '@NewProfileCat');
    await page.getByRole('button', { name: 'Take the challenge →', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.stage-footer')?.textContent.includes('CHALLENGE · @NewProfileCat'));
    await page.getByRole('button', { name: 'Pause game', exact: true }).click();
    await delay(700);
    const forged = await post(context, '/api/runs', { action: 'start', name: '@BrowserForged', user_id: crypto.randomUUID() });
    assert.equal(forged.name, '@NewProfileCat');
    const progress = await (await context.request.get(origin+'/api/progress')).json(); assert.equal(progress.run.id, forged.id);
    const board = await (await context.request.get(origin+'/api/leaderboard')).json();
    assert.ok(board.entries.every(e => !('walletAddress' in e) && !('wallet_address' in e) && !('email' in e)));
    check('Refresh keeps saved details; complete profiles start directly and caller handles are ignored');
    await page.reload();
    await page.getByRole('button', { name: 'Resume challenge →', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.stage-footer')?.textContent.includes('CHALLENGE · @NewProfileCat'));
    await page.getByRole('button', { name: 'Pause game', exact: true }).click();
    await delay(500);
    await page.locator('.play-shell').screenshot({ path: 'artifacts/profile-challenge-mobile.png' });
    assert.equal(report.browserErrors.length, 0);
    check('Resume still works with saved account details; no browser JavaScript errors');
    await page.getByRole('button', { name: 'Resume game →', exact: true }).click();
    await page.getByRole('button', { name: 'End challenge', exact: true }).click();
    await page.getByText('You’re on the list of shames. This challenge is over.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'View list of shames →', exact: true }).click();
    await page.waitForURL('**/leaderboard#shames');
    await page.getByRole('region', { name: 'List of shames', exact: true }).waitFor();
    assert.equal(await page.locator('iframe').count(), 0);
    assert.equal((await own()).status, 'abandoned');
    assert.equal(report.browserErrors.length, 0);
    check('Ending a challenge saves the shame entry and opens the dedicated leaderboard page');
  } finally {
    if (browser) await browser.close();
    if (createdId) {
      const user = await admin.auth.admin.getUserById(createdId);
      assert.equal(user.data.user?.email, email, 'Delete only our disposable account');
      const result = await admin.auth.admin.deleteUser(createdId); assert.equal(result.error, null);
      const remaining = await admin.from('vladcat_runs').select('id', { count: 'exact', head: true }).eq('user_id', createdId);
      assert.equal(remaining.count, 0);
    }
    report.cleanup = true;
    await fs.writeFile('artifacts/profile-live-results.json', JSON.stringify(report, null, 2)+'\n');
    console.log(JSON.stringify({ checks: report.checks.length, cleanup: report.cleanup }));
  }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
