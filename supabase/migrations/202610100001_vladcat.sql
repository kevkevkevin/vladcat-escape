-- Run once in this project's Supabase SQL editor. Scoped to VLADCAT tables.
begin;

create table if not exists public.vladcat_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  handle text not null check (handle ~ '^@[A-Za-z0-9_]{1,15}$'),
  status text not null default 'paused' check (status in ('active','paused','completed','abandoned','discarded')),
  stage integer not null default 1 check (stage between 1 and 50),
  splits jsonb not null default '[]'::jsonb check (jsonb_typeof(splits) = 'array'),
  stage_ms bigint not null default 0 check (stage_ms >= 0),
  total_ms bigint not null default 0 check (total_ms >= 0),
  token uuid not null default gen_random_uuid(),
  clock_at timestamptz,
  lease_until timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  finished_at timestamptz
);
create unique index if not exists vladcat_one_open_run on public.vladcat_runs(user_id) where status in ('active','paused');
create index if not exists vladcat_rank_times on public.vladcat_runs(total_ms, finished_at) where status = 'completed';
alter table public.vladcat_runs enable row level security;
revoke all on public.vladcat_runs from public, anon, authenticated;
grant select on public.vladcat_runs to authenticated;
grant select, insert, update, delete on public.vladcat_runs to service_role;
drop policy if exists vladcat_read_own_progress on public.vladcat_runs;
create policy vladcat_read_own_progress on public.vladcat_runs for select to authenticated using ((select auth.uid()) = user_id);

-- No browser role can execute this function or write a run. The Next.js server
-- verifies the login, supplies p_user, and calls it with its server-only key.
-- A row lock serializes checkpoints, retries, and finish/abandon races.
create or replace function public.vladcat_run_action(
  p_user uuid, p_action text, p_id uuid default null, p_token uuid default null,
  p_stage integer default null, p_handle text default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  r public.vladcat_runs;
  n timestamptz := clock_timestamp();
  elapsed bigint := 0;
begin
  if p_user is null then raise exception 'Login required'; end if;
  -- Serialize even creation of a user's first run.
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 9049));
  if p_action = 'start' then
    if p_handle is null or p_handle !~ '^@[A-Za-z0-9_]{1,15}$' then raise exception 'Invalid X handle'; end if;
    update public.vladcat_runs set status='discarded', updated_at=n where user_id=p_user and status in ('active','paused');
    insert into public.vladcat_runs(user_id,handle) values(p_user,p_handle) returning * into r;
    return to_jsonb(r);
  end if;
  select * into r from public.vladcat_runs where id=p_id and user_id=p_user for update;
  if not found then raise exception 'Run not found'; end if;
  if p_action = 'resume' then
    if r.status not in ('active','paused') then raise exception 'Challenge has ended'; end if;
  elsif p_token is null or p_token <> r.token then
    raise exception 'This run is open in another session. Resume your saved progress';
  end if;
  if r.status in ('completed','abandoned','discarded') then
    if (p_action='finish' and r.status='completed') or (p_action='abandon' and r.status='abandoned') then return to_jsonb(r); end if;
    raise exception 'Challenge has ended';
  end if;
  if r.status='active' then
    elapsed := greatest(0, floor(extract(epoch from (least(n,r.lease_until)-r.clock_at))*1000)::bigint);
    r.stage_ms := r.stage_ms + elapsed;
  end if;
  if p_action='resume' then
    r.token := gen_random_uuid();
    r.status := 'paused';
  elsif p_action='checkpoint' then
    -- A repeated acknowledgement must not add the split twice or start a clock.
    if p_stage = r.stage-1 then return to_jsonb(r); end if;
    if p_stage is null or p_stage <> r.stage or r.status <> 'active' or n > r.lease_until then raise exception 'Stage is not active. Resume and retry'; end if;
    -- Reject instantaneous scripted checkpoints. This is a coarse sanity check,
    -- not proof of solving a client-side puzzle.
    if r.stage_ms < 250 then raise exception 'Stage completed too quickly'; end if;
    r.splits := r.splits || jsonb_build_array(jsonb_build_object('stage',r.stage,'milliseconds',r.stage_ms));
    r.total_ms := r.total_ms + r.stage_ms;
    r.stage_ms := 0;
    r.stage := r.stage+1;
    r.status := case when r.stage=50 then 'completed' else 'paused' end;
    if r.stage=50 then r.finished_at := n; end if;
  elsif p_action='play' then
    if p_stage is null or p_stage <> r.stage then raise exception 'Stage order mismatch'; end if;
    r.status := 'active';
  elsif p_action='pause' then
    r.status := 'paused';
  elsif p_action='heartbeat' then
    if r.status <> 'active' or n > r.lease_until then raise exception 'Connection interrupted. Resume your saved progress'; end if;
  elsif p_action='abandon' then
    r.status := 'abandoned';
    r.total_ms := r.total_ms + r.stage_ms;
    r.finished_at := n;
  elsif p_action='finish' then
    raise exception 'Complete every stage before posting a score';
  else
    raise exception 'Invalid run action';
  end if;
  r.clock_at := case when r.status='active' then n else null end;
  r.lease_until := case when r.status='active' then n+interval '12 seconds' else null end;
  update public.vladcat_runs set status=r.status,stage=r.stage,splits=r.splits,
    stage_ms=r.stage_ms,total_ms=r.total_ms,token=r.token,clock_at=r.clock_at,
    lease_until=r.lease_until,finished_at=r.finished_at,updated_at=n where id=r.id returning * into r;
  return to_jsonb(r);
end;
$$;
revoke all on function public.vladcat_run_action(uuid,text,uuid,uuid,integer,text) from public, anon, authenticated;
grant execute on function public.vladcat_run_action(uuid,text,uuid,uuid,integer,text) to service_role;
commit;
