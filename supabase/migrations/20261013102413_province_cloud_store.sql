-- Dedicated application tables; no access for browser Data API roles.
create table if not exists public.ttxd_permits (
 id text primary key, duplicate_key text not null unique check(duplicate_key ~ '^[0-9a-f]{64}$'),
 payload text not null, inserted_at timestamptz not null default now()
);
create table if not exists public.ttxd_reports (id text primary key,payload text not null,inserted_at timestamptz not null default now());
create table if not exists public.ttxd_admin_users (email text primary key,salt text not null,password_hash text not null,created_at timestamptz not null);
create table if not exists public.ttxd_admin_sessions (hash text primary key,csrf text not null,expires bigint not null);
create table if not exists public.ttxd_rate_limits (key_hash text primary key,hits integer not null,expires_at timestamptz not null);
create index if not exists ttxd_rate_limits_expiry on public.ttxd_rate_limits(expires_at);
create index if not exists ttxd_admin_sessions_expiry on public.ttxd_admin_sessions(expires);
alter table public.ttxd_permits enable row level security;
alter table public.ttxd_reports enable row level security;
alter table public.ttxd_admin_users enable row level security;
alter table public.ttxd_admin_sessions enable row level security;
alter table public.ttxd_rate_limits enable row level security;
revoke all on public.ttxd_permits,public.ttxd_reports,public.ttxd_admin_users,public.ttxd_admin_sessions,public.ttxd_rate_limits from public,anon,authenticated;
grant all on public.ttxd_permits,public.ttxd_reports,public.ttxd_admin_users,public.ttxd_admin_sessions,public.ttxd_rate_limits to service_role;
create or replace function public.ttxd_consume_rate_limit(p_key_hash text,p_max integer,p_window_ms integer)
returns boolean language plpgsql security invoker set search_path = ''
as $$
declare v_hits integer; v_now timestamptz := clock_timestamp();
begin
 if p_key_hash is null or p_max is null or p_window_ms is null or p_key_hash !~ '^[0-9a-f]{64}$' or p_max<1 or p_max>10000 or p_window_ms<1000 or p_window_ms>86400000 then
  raise exception 'Invalid rate limit parameters';
 end if;
 delete from public.ttxd_rate_limits where expires_at < v_now - interval '1 day';
 insert into public.ttxd_rate_limits(key_hash,hits,expires_at)
 values(p_key_hash,1,v_now + p_window_ms * interval '1 millisecond')
 on conflict(key_hash) do update
 set hits=case when ttxd_rate_limits.expires_at<=v_now then 1 else least(ttxd_rate_limits.hits+1,p_max+1) end,
 expires_at=case when ttxd_rate_limits.expires_at<=v_now then v_now + p_window_ms * interval '1 millisecond' else ttxd_rate_limits.expires_at end
 returning hits into v_hits;
 return v_hits<=p_max;
end;
$$;
revoke all on function public.ttxd_consume_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.ttxd_consume_rate_limit(text,integer,integer) to service_role;

create table if not exists public.ttxd_communes (commune_code text primary key,name text not null,kind text not null,geometry jsonb not null,provenance jsonb not null);
alter table public.ttxd_communes enable row level security;
revoke all on public.ttxd_communes from public,anon,authenticated;
grant all on public.ttxd_communes to service_role;
