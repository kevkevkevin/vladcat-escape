// Explicit live setup verification. Creates two random QA accounts, uses only
// their runs, and removes those accounts (and their cascading runs) in finally.
// Never logs credentials, auth tokens, real players, or their records.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
require('@next/env').loadEnvConfig(process.cwd(), true);
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const origin = 'http://127.0.0.1:3000';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;
const options = { auth: { persistSession: false, autoRefreshToken: false }, realtime: { transport: ws } };
const admin = createClient(url, secret, options);
const stamp = crypto.randomUUID();
const started = Date.now();
const created = [];
const report = { checks: [], browserErrors: [], cleanup: false };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const check = name => { report.checks.push(name); console.log(JSON.stringify({ passed: name })); };
const requireOk = (result, label) => { assert.equal(result.error, null, `${label}: ${result.error?.message ?? 'failed'}`); return result.data; };
async function newPlayer(label) {
  const email = `vladcat-qa-${stamp}-${label}@example.com`;
  const password = crypto.randomBytes(24).toString('base64url');
  const client = createClient(url, key, options);
  const result = await client.auth.signUp({ email, password });
  if (result.data?.user?.id) created.push({ id: result.data.user.id, email });
  const data = requireOk(result, 'Temporary signup');
  assert.ok(data.session, 'Signup must return a session without email confirmation');
  return { id: data.user.id, email, password, client };
}
async function ownRun(userId) {
  return requireOk(await admin.from('vladcat_runs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).single(), 'Read own QA run');
}
async function waitRunStatus(userId, status) {
  const deadline = Date.now() + 15000;
  let row;
  do {
    row = await ownRun(userId);
    if (row.status === status) return row;
    await delay(250);
  } while (Date.now() < deadline);
  assert.equal(row.status, status, 'Wait for the game clock acknowledgement');
}
async function request(context, path, body, expected=200) {
  const response = await context.request.post(origin+path, { headers: { Origin: origin }, data: body });
  assert.equal(response.status(), expected, `${path} returned ${response.status()}: ${(await response.json()).error ?? 'unexpected result'}`);
  return response.json();
}
(async () => {
  let browser;
  try {
    const a = await newPlayer('a');
    const b = await newPlayer('b');
    check('Email signup returns an immediate session');
    browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
    const page = await context.newPage();
    page.on('pageerror', error => report.browserErrors.push(error.message));
    await page.goto(origin+'/play');
    await page.getByLabel('Email', { exact: true }).fill(a.email);
    await page.getByLabel('Password', { exact: true }).fill(a.password);
    await page.getByRole('button', { name: 'Log in →', exact: true }).click();
    await page.getByRole('button', { name: 'Log out', exact: true }).waitFor();
    const cookies = await context.cookies(origin);
    const authCookies = cookies.filter(cookie => cookie.name.includes('auth-token'));
    assert.ok(authCookies.length); assert.ok(authCookies.every(cookie => cookie.httpOnly && cookie.sameSite === 'Lax'));
    check('Game email login and HttpOnly session cookies');
    const handle = `@Qa${stamp.replaceAll('-','').slice(0,10)}`;
    await page.getByLabel('Enter X handle', { exact: true }).fill(handle);
    await page.getByLabel('Wallet address (EVM)', { exact: true }).fill('0x52908400098527886E0F7030069857D2E4169EE7');
    await page.getByRole('button', { name: 'Save details →', exact: true }).click();
    await page.getByRole('dialog', { name: 'Give VLADCAT your coordinates.' }).waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Take the challenge →', exact: true }).click();
    await page.waitForFunction(()=>document.querySelector('.stage-label')?.textContent.includes('STAGE 01'));
    await page.waitForFunction(()=>!document.querySelector('.game-loading'));
    await delay(1000);
    let row = await waitRunStatus(a.id, 'active');
    assert.equal(row.status, 'active');
    const frame = page.frames().find(f=>f.url().endsWith('/game/index.html'));
    await frame.evaluate(()=>self.EcodroidsTiming.completeStage(1));
    await page.waitForFunction(()=>document.querySelector('.run-summary summary')?.textContent.includes('1 stage completed'));
    row = await ownRun(a.id);
    assert.equal(row.stage,2); assert.equal(row.splits.length,1); assert.ok(Number(row.total_ms)>=250);
    check('Iframe checkpoint saves server-calculated stage time');
    const oldToken = row.token;
    await page.reload();
    await page.getByRole('button', { name:'Resume challenge →', exact:true }).click();
    await page.waitForFunction(()=>document.querySelector('.stage-label')?.textContent.includes('STAGE 02'));
    await page.waitForFunction(()=>!document.querySelector('.game-loading'));
    row = await waitRunStatus(a.id, 'active');
    assert.equal(row.stage,2); assert.equal(row.status,'active'); assert.notEqual(row.token,oldToken);
    await page.getByRole('button',{name:'Pause game',exact:true}).click();
    row = await waitRunStatus(a.id, 'paused');
    assert.equal(row.status,'paused');
    const pausedMs = Number(row.stage_ms);
    await delay(500);
    assert.equal(Number((await ownRun(a.id)).stage_ms),pausedMs);
    check('Refresh resumes the saved stage; pauses stop its clock');

    const clientA = a.client;
    const denied = result => assert.ok(result.error && ['42501','PGRST301'].includes(result.error.code), 'Database action must be denied');
    denied(await clientA.from('vladcat_runs').update({total_ms:1,status:'completed'}).eq('id',row.id));
    denied(await clientA.from('vladcat_runs').delete().eq('id',row.id));
    denied(await clientA.from('vladcat_runs').insert({user_id:a.id,handle:'@Forged',total_ms:1}));
    denied(await clientA.rpc('vladcat_run_action',{p_user:a.id,p_action:'checkpoint',p_id:row.id,p_token:row.token,p_stage:2}));
    const own = requireOk(await clientA.from('vladcat_runs').select('id'), 'Own progress access');
    assert.deepEqual(own.map(r=>r.id),[row.id]);
    const cross = requireOk(await b.client.from('vladcat_runs').select('id').eq('id',row.id),'Cross-player isolation');
    assert.deepEqual(cross,[]);
    const anonymous = createClient(url,key,options);
    denied(await anonymous.from('vladcat_runs').select('id'));
    denied(await anonymous.rpc('vladcat_run_action',{p_user:a.id,p_action:'resume',p_id:row.id}));
    check('Live RLS denies inserts, score edits, deletes, RPC execution and cross-player reads');

    const contextB = await browser.newContext();
    await request(contextB,'/api/account',{action:'login',email:b.email,password:b.password});
    await request(contextB,'/api/profile',{xHandle:handle,walletAddress:'0x52908400098527886E0F7030069857D2E4169EE7'});
    await request(contextB,'/api/runs',{action:'resume',id:row.id},409);
    await request(context,'/api/runs',{action:'play',id:row.id,token:oldToken,stage:2},409);
    await request(context,'/api/leaderboard',{id:row.id,token:row.token,totalMs:1,splits:Array.from({length:49},(_,i)=>({stage:i+1,milliseconds:1}))},409);
    const unchanged = await ownRun(a.id);
    assert.equal(unchanged.total_ms,row.total_ms);assert.equal(unchanged.status,'paused');
    check('Game API rejects another owner, stale tokens and forged early finish');

    await page.getByRole('button',{name:'Resume game →',exact:true}).click();
    await delay(500);
    await page.getByRole('button',{name:'End challenge',exact:true}).click();
    await page.getByText('You’re on the list of shames. This challenge is over.',{exact:true}).waitFor();
    row = await ownRun(a.id);assert.equal(row.status,'abandoned');
    const shames = await (await context.request.get(origin+'/api/shames')).json();
    assert.ok(shames.entries.some(entry=>entry.id===row.id));
    assert.ok(shames.entries.every(entry=>!('email' in entry) && !('user_id' in entry) && !('token' in entry)));
    check('Ending the challenge saves and publishes only its handle/time');
    await request(context,'/api/runs',{action:'resume',id:row.id},409);
    await page.getByRole('button',{name:'View list of shames →',exact:true}).click();
    await page.waitForURL('**/leaderboard#shames');
    await page.goto(origin+'/play');
    await page.getByRole('button',{name:'Log out',exact:true}).click();
    await page.getByRole('button',{name:'Log in →',exact:true}).waitFor();
    assert.equal((await (await context.request.get(origin+'/api/account')).json()).user,null);
    check('Game logout clears the session');

    // Verify the full ordered server protocol using only the second QA account.
    // This checks persistence/permissions, not whether every puzzle was solved.
    let ranked = await request(contextB,'/api/runs',{name:handle});
    for(let stage=1;stage<=49;stage++) {
      ranked = await request(contextB,'/api/runs',{action:'play',id:ranked.id,token:ranked.token,stage});
      await delay(300);
      ranked = await request(contextB,'/api/runs',{action:'checkpoint',id:ranked.id,token:ranked.token,stage,totalMs:1,stageMs:1});
      if(stage%10===0) console.log(JSON.stringify({phase:'Ordered completion protocol',stagesVerified:stage}));
    }
    assert.equal(ranked.status,'completed'); assert.equal(ranked.splits.length,49);
    assert.equal(ranked.totalMs,ranked.splits.reduce((total,s)=>total+s.milliseconds,0));
    assert.ok(ranked.totalMs>=49*250);
    const finished = await request(contextB,'/api/leaderboard',{id:ranked.id,token:ranked.token,totalMs:1,splits:[]});
    const entry = finished.entries.find(entry=>entry.id===ranked.id);
    assert.ok(entry);assert.equal(entry.totalMs,ranked.totalMs);
    const repeat = await request(contextB,'/api/leaderboard',{id:ranked.id,token:ranked.token,totalMs:0});
    assert.equal(repeat.run.totalMs,ranked.totalMs);
    await request(contextB,'/api/shames',{id:ranked.id,token:ranked.token},409);
    assert.ok(finished.entries.every((entry,i,all)=>i===0||all[i-1].totalMs<=entry.totalMs));
    check('49 ordered server checkpoints finish once, ignore forged times, and rank least time first');
    assert.deepEqual(report.browserErrors,[]);
  } finally {
    if(browser) await browser.close();
    let clean=true;
    for(const fixture of created) {
      try {
        const {user} = requireOk(await admin.auth.admin.getUserById(fixture.id),'QA cleanup identity');
        assert.equal(user.email,fixture.email);
        assert.ok(Date.parse(user.created_at)>=started-5000);
        assert.ok(fixture.email.startsWith(`vladcat-qa-${stamp}-`));
        requireOk(await admin.auth.admin.deleteUser(fixture.id),'QA account cleanup');
        const {count,error} = await admin.from('vladcat_runs').select('id',{count:'exact',head:true}).eq('user_id',fixture.id);
        assert.equal(error,null);assert.equal(count,0);
      } catch {clean=false;console.error('A test account could not be cleaned up. Only this invocation’s QA IDs are in artifacts/supabase-qa-cleanup.json.');}
    }
    report.cleanup=clean;
    if(!clean) await fs.writeFile('artifacts/supabase-qa-cleanup.json',JSON.stringify(created,null,2));
    await fs.writeFile('artifacts/supabase-live-results.json',JSON.stringify(report,null,2));
    console.log(JSON.stringify({cleanup:clean,checksPassed:report.checks.length,browserErrors:report.browserErrors.length}));
    if(!clean) process.exitCode=1;
  }
})().catch(error=>{console.error('Live verification stopped: '+error.message);process.exitCode=1;});
