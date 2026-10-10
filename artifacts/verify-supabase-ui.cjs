// Local browser QA with an isolated Postgres fixture. No hosted accounts/data.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { PGlite } = require('@electric-sql/pglite');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const origin = 'http://127.0.0.1:3001';
(async () => {
  const db = new PGlite();
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(origin);
    await page.getByRole('button', { name: 'Log in to start', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Log in to start', exact: true }).isDisabled(), true);
    await page.getByLabel('Email', {exact:true}).fill('catqa@example.invalid');
    await page.getByLabel('Password', {exact:true}).fill('Only-A-Local-Fixture-123');
    await page.getByRole('button', {name:'Log in →',exact:true}).click();
    await page.getByLabel('Player account',{exact:true}).getByRole('alert').filter({hasText:'awaiting Supabase setup'}).waitFor();
    // Real routes reject forged, unauthenticated score submissions.
    for (const endpoint of ['/api/runs','/api/leaderboard','/api/shames']) {
      const result = await page.evaluate(async endpoint => {
        const r = await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'@Forged',token:'fake',totalMs:1,splits:[]})});
        return {status:r.status,body:await r.json()};
      },endpoint);
      assert.equal(result.status,401,JSON.stringify(result));
    }
    await page.locator('.account-card').screenshot({ path: 'artifacts/supabase-login-desktop.png' });
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
    await page.locator('.account-card').screenshot({path:'artifacts/supabase-login-mobile.png'});

    const user='00000000-0000-4000-8000-000000000001';
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      insert into auth.users values('${user}');`);
    await db.exec(await fs.readFile('supabase/migrations/202610100001_vladcat.sql','utf8'));
    const call = async body => (await db.query('select public.vladcat_run_action($1,$2,$3,$4,$5,$6) as run',[user,body.action??'start',body.id??null,body.token??null,body.stage??null,body.name??null])).rows[0].run;
    let row=await call({action:'start',name:'@LocalCatQA'});
    const splits=Array.from({length:4},(_,i)=>({stage:i+1,milliseconds:1000}));
    await db.query('update public.vladcat_runs set stage=5,splits=$1,total_ms=4000,stage_ms=1000 where id=$2',[JSON.stringify(splits),row.id]);
    const state=r=>({id:r.id,name:r.handle,token:r.token,stage:r.stage,stageMs:Number(r.stage_ms),totalMs:Number(r.total_ms),splits:r.splits,status:r.status});
    const actions=[];
    let failPlay=false;
    await page.route('**/api/account',async route=>route.fulfill({json:{user:{email:'catqa@example.invalid'},configured:true}}));
    await page.route('**/api/progress',async route=>{
      row=(await db.query('select * from public.vladcat_runs where id=$1',[row.id])).rows[0];
      await route.fulfill({json:{run:{...state(row),token:''}}});
    });
    await page.route('**/api/runs',async route=>{
      const body=route.request().postDataJSON();actions.push(body.action??'start');
      if(body.action==='play' && failPlay){failPlay=false;return route.fulfill({status:503,json:{error:'Local fixture: connection interrupted'}});}
      try {row=await call(body);await route.fulfill({json:state(row)});}
      catch(e){await route.fulfill({status:409,json:{error:e.message}});}
    });
    await page.route('**/api/leaderboard',async route=>{
      if(route.request().method()==='POST'){row=await call({...route.request().postDataJSON(),action:'finish'});actions.push('finish');}
      await route.fulfill({json:{id:row.id,run:state(row),entries:[],storage:'online'}});
    });
    await page.route('**/api/shames',async route=>{
      if(route.request().method()==='POST'){row=await call({...route.request().postDataJSON(),action:'abandon'});actions.push('abandon');}
      await route.fulfill({json:{id:row.id,run:state(row),entries:[],storage:'online'}});
    });
    await page.setViewportSize({width:1440,height:1100});
    await page.reload();
    await page.getByRole('button',{name:'Resume challenge →',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.stage-label')?.textContent.includes('STAGE 05'));
    await page.waitForFunction(()=>!document.querySelector('.game-loading'));
    await page.waitForTimeout(1000);
    assert.equal(row.status,'active');assert.equal(row.stage,5);
    assert.equal(await page.getByLabel('Enter X handle',{exact:true}).inputValue(),'@LocalCatQA');
    assert.equal(await page.locator('.run-summary summary').textContent(),'4 stages completed · View times');
    await page.getByRole('button',{name:'Pause game',exact:true}).click();
    await page.waitForTimeout(300);
    assert.equal(row.status,'paused');
    await page.getByRole('button',{name:'Resume game →',exact:true}).click();
    await page.waitForTimeout(500);
    assert.equal(row.status,'active');
    await page.locator('.play-shell').screenshot({path:'artifacts/supabase-resumed-stage.png'});
    // Exercise the real iframe completion bridge and parent request queue.
    const frame=page.frames().find(f=>f.url().endsWith('/game/index.html'));
    await frame.evaluate(()=>self.EcodroidsTiming.completeStage(5));
    await page.waitForTimeout(500);
    assert.equal(row.stage,6);assert.equal(row.splits.length,5);assert.equal(row.status,'paused');
    failPlay=true;
    await page.reload();
    await page.getByRole('button',{name:'Resume challenge →',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.stage-label')?.textContent.includes('STAGE 06'));
    await page.waitForFunction(()=>!document.querySelector('.game-loading'));
    await page.getByRole('button',{name:'Resume saved stage →',exact:true}).waitFor();
    assert.equal(row.status,'paused');
    await page.getByRole('button',{name:'Resume saved stage →',exact:true}).click();
    await page.waitForTimeout(500);
    assert.equal(row.status,'active');
    await page.getByRole('button',{name:'End challenge',exact:true}).click();
    await page.waitForTimeout(500);
    assert.equal(row.status,'abandoned');
    assert.ok(row.total_ms>=5000);assert.equal(row.splits.length,5);
    // Restore a local fixture near the ending, then verify the final checkpoint
    // and leaderboard acknowledgement use persisted times, not the browser total.
    row=await call({action:'start',name:'@LocalCatQA'});
    const finalSplits=Array.from({length:48},(_,i)=>({stage:i+1,milliseconds:1000}));
    await db.query('update public.vladcat_runs set stage=49,splits=$1,total_ms=48000,stage_ms=1000 where id=$2',[JSON.stringify(finalSplits),row.id]);
    await page.reload();
    await page.getByRole('button',{name:'Resume challenge →',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.stage-label')?.textContent.includes('STAGE 49'));
    await page.waitForFunction(()=>!document.querySelector('.game-loading'));
    await page.waitForTimeout(500);
    const finalFrame=page.frames().find(f=>f.url().endsWith('/game/index.html'));
    await finalFrame.evaluate(()=>{
      self.EcodroidsTiming.completeStage(49);
      parent.postMessage({type:'game:timing',timing:{stage:49,stageMs:1,totalMs:1,splits:[],eligible:true,finished:true,stopped:true,reason:''}},location.origin);
    });
    await page.getByText('Your time is on the leaderboard.',{exact:true}).waitFor();
    assert.equal(row.status,'completed');assert.equal(row.splits.length,49);assert.ok(row.total_ms>=49000);
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({realApi:'unauthenticated writes denied',fixture:'resume, pause, checkpoint, refresh, disconnect recovery, abandon and finish passed',actions,errors}));
  } finally {await browser.close();await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
