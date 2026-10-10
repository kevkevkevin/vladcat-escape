import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// Ephemeral Postgres, never connected to the user's Supabase project.
test('Supabase migration: ownership, permissions, trusted clocks and immutable outcomes', async t => {
  const db = new PGlite();
  const alice = '00000000-0000-4000-8000-000000000001';
  const bob = '00000000-0000-4000-8000-000000000002';
  const migration = await readFile(new URL('../supabase/migrations/202610100001_vladcat.sql', import.meta.url), 'utf8');
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
      insert into auth.users values ('${alice}'),('${bob}');`);
    await db.exec(migration);
    await db.exec(migration); // Applying the migration twice keeps data/policies valid.
    const call = async (user, action, run, stage, handle) => (await db.query(
      'select public.vladcat_run_action($1,$2,$3,$4,$5,$6) as run',
      [user, action, run?.id ?? null, run?.token ?? null, stage ?? null, handle ?? null],
    )).rows[0].run;
    const asRole = async (role, user, fn) => {
      await db.exec(`set role ${role};`);
      if (user) await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
      try { return await fn(); } finally { await db.exec('reset role'); }
    };
    let a = await asRole('service_role', null, () => call(alice, 'start', null, null, '@AliceCat'));
    let b = await asRole('service_role', null, () => call(bob, 'start', null, null, '@BobCat'));

    await t.test('anonymous access and direct player score changes are denied', async () => {
      await asRole('anon', null, async () => {
        await assert.rejects(db.query('select * from public.vladcat_runs'), /permission denied/);
        await assert.rejects(call(alice, 'start', null, null, '@Fake'), /permission denied/);
      });
      await asRole('authenticated', alice, async () => {
        const visible = (await db.query('select id from public.vladcat_runs')).rows;
        assert.deepEqual(visible.map(r => r.id), [a.id]);
        for (const sql of [
          'update public.vladcat_runs set total_ms=1',
          'delete from public.vladcat_runs',
          `insert into public.vladcat_runs(user_id,handle) values('${alice}','@Fake')`,
        ]) await assert.rejects(db.query(sql), /permission denied/);
        await assert.rejects(call(alice, 'checkpoint', a, 1), /permission denied/);
      });
      await asRole('authenticated', bob, async () => {
        assert.deepEqual((await db.query('select id from public.vladcat_runs')).rows.map(r => r.id), [b.id]);
      });
    });
    await t.test('server actions reject wrong owner, stage skips and inactive completion', async () => {
      await assert.rejects(call(bob, 'resume', a), /Run not found/);
      await assert.rejects(call(alice, 'checkpoint', a, 1), /not active/);
      a = await call(alice, 'play', a, 1);
      await assert.rejects(call(alice, 'checkpoint', a, 2), /not active/);
      await assert.rejects(call(alice, 'checkpoint', a, 1), /too quickly/);
    });
    await t.test('timestamps determine time, retries do not duplicate and pauses save progress', async () => {
      await db.query("update public.vladcat_runs set clock_at=clock_timestamp()-interval '2 seconds',lease_until=clock_timestamp()+interval '12 seconds' where id=$1", [a.id]);
      a = await call(alice, 'checkpoint', a, 1);
      assert.equal(a.stage, 2); assert.equal(a.splits.length, 1);
      assert.ok(a.total_ms >= 2000 && a.total_ms < 2500);
      const repeated = await call(alice, 'checkpoint', a, 1);
      assert.equal(repeated.total_ms, a.total_ms); assert.equal(repeated.splits.length, 1);
      a = await call(alice, 'play', a, 2);
      await db.query("update public.vladcat_runs set clock_at=clock_timestamp()-interval '1 second' where id=$1", [a.id]);
      a = await call(alice, 'pause', a);
      const paused = await call(alice, 'pause', a);
      assert.equal(paused.stage_ms, a.stage_ms);
      assert.ok(a.stage_ms >= 1000);
      assert.equal(a.total_ms, repeated.total_ms);
    });
    await t.test('resuming invalidates old sessions and caps disconnected time', async () => {
      const old = a;
      a = await call(alice, 'resume', a);
      assert.notEqual(old.token, a.token);
      await assert.rejects(call(alice, 'play', old, 2), /another session/);
      a = await call(alice, 'play', a, 2);
      await db.query("update public.vladcat_runs set clock_at=clock_timestamp()-interval '30 seconds',lease_until=clock_timestamp()-interval '18 seconds',stage_ms=0 where id=$1", [a.id]);
      await assert.rejects(call(alice, 'heartbeat', a), /interrupted/);
      a = await call(alice, 'resume', a);
      assert.equal(a.stage_ms, 12000); assert.equal(a.status, 'paused');
    });
    await t.test('completion requires all stages, final scores cannot be overwritten and least time ranks first', async () => {
      await assert.rejects(call(alice, 'finish', a), /every stage/);
      for (let stage = 2; stage <= 49; stage++) {
        a = await call(alice, 'play', a, stage);
        await db.query('update public.vladcat_runs set stage_ms=1000 where id=$1', [a.id]);
        a = await call(alice, 'checkpoint', a, stage);
      }
      assert.equal(a.status, 'completed'); assert.equal(a.stage, 50); assert.equal(a.splits.length, 49);
      assert.equal(a.total_ms, a.splits.reduce((sum,s) => sum+s.milliseconds,0));
      const finished = await call(alice, 'finish', a);
      assert.equal(finished.total_ms, a.total_ms);
      for (const action of ['resume','checkpoint','abandon','play']) await assert.rejects(call(alice, action, a, 49), /ended/);
      await db.query("insert into public.vladcat_runs(user_id,handle,status,stage,total_ms,finished_at) values($1,'@Faster','completed',50,1000,clock_timestamp())", [bob]);
      const ranks = (await db.query("select handle from public.vladcat_runs where status='completed' order by total_ms,finished_at")).rows;
      assert.deepEqual(ranks.map(r=>r.handle), ['@Faster','@AliceCat']);
    });
    await t.test('abandonment is final and repeat requests return the same entry', async () => {
      b = await call(bob, 'play', b, 1);
      await db.query('update public.vladcat_runs set stage_ms=9000 where id=$1', [b.id]);
      b = await call(bob, 'abandon', b);
      assert.equal(b.status, 'abandoned'); assert.ok(b.total_ms >= 9000);
      const repeat = await call(bob, 'abandon', b);
      assert.equal(repeat.total_ms, b.total_ms);
      await assert.rejects(call(bob, 'finish', b), /ended/);
      await assert.rejects(call(bob, 'resume', b), /ended/);
    });
  } finally { await db.close(); }
});

test('resumed runtime keeps completed splits and current-stage time', async () => {
  const code = await readFile(new URL('../public/game/run-timer.js', import.meta.url), 'utf8');
  const { RunTimer } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  const timer = new RunTimer(true);
  timer.restore({ stage: 3, stageMs: 1500, splits: [{stage:1,milliseconds:2000},{stage:2,milliseconds:3000}] });
  timer.enterLayout('Level_3', 0); timer.step(1000); timer.completeStage(1000);
  assert.equal(timer.snapshot().stageMs, 2500);
  assert.equal(timer.snapshot().totalMs, 7500);
  assert.equal(timer.snapshot().eligible, true);
  timer.enterLayout('Level_4', 2000);
  assert.equal(timer.snapshot().stageMs, 0); assert.equal(timer.snapshot().totalMs, 7500);
});
