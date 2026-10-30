-- Server-managed accounts and live session authorization. No business data changes.
begin;

alter table public.ttxd_admin_users add column if not exists role text;
alter table public.ttxd_admin_users add column if not exists commune_code text;
alter table public.ttxd_admin_users add column if not exists active boolean not null default true;
alter table public.ttxd_admin_sessions add column if not exists user_email text references public.ttxd_admin_users(email);

-- Only the explicitly designated bootstrap account inherits province access.
update public.ttxd_admin_users
set role='province', commune_code=null
where email='admin@qlxd' and role is null;
update public.ttxd_admin_users
set active=false
where role is null and email<>'admin@qlxd';

alter table public.ttxd_admin_users drop constraint if exists ttxd_admin_users_scope_check;
alter table public.ttxd_admin_users add constraint ttxd_admin_users_scope_check check (
  role is null or
  (role='province' and commune_code is null) or
  (role='commune' and commune_code is not null)
);
alter table public.ttxd_admin_users drop constraint if exists ttxd_admin_users_commune_fk;
alter table public.ttxd_admin_users add constraint ttxd_admin_users_commune_fk
  foreign key (commune_code) references public.ttxd_communes(commune_code);
create index if not exists ttxd_admin_sessions_user_email on public.ttxd_admin_sessions(user_email);

-- Old unbound sessions intentionally remain stored but cannot authenticate the new app.
-- The application resolves each bound session against the current account on every request.
alter table public.ttxd_admin_users enable row level security;
alter table public.ttxd_admin_sessions enable row level security;
revoke all on public.ttxd_admin_users,public.ttxd_admin_sessions from public,anon,authenticated;
grant all on public.ttxd_admin_users,public.ttxd_admin_sessions to service_role;

-- Serialize province demotions/locks to prevent two administrators removing the last access.
create or replace function public.ttxd_guard_last_province_account()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
  if old.email='admin@qlxd' and (new.role is distinct from 'province' or new.commune_code is not null or not new.active) then
    raise exception 'TTXD_RESERVED_PROVINCE_ACCOUNT';
  end if;
  if old.role='province' and old.active and old.commune_code is null and (new.role is distinct from 'province' or not new.active or new.commune_code is not null) then
    perform pg_catalog.pg_advisory_xact_lock(2134589,1);
    if (select count(*) from public.ttxd_admin_users where role='province' and active and commune_code is null)<=1 then
      raise exception 'TTXD_LAST_PROVINCE';
    end if;
  end if;
  if not new.active then
    update public.ttxd_admin_sessions set expires=0 where user_email=old.email;
  end if;
  return new;
end;
$$;
revoke all on function public.ttxd_guard_last_province_account() from public,anon,authenticated;
grant execute on function public.ttxd_guard_last_province_account() to service_role;
drop trigger if exists ttxd_guard_last_province_account on public.ttxd_admin_users;
create trigger ttxd_guard_last_province_account before update on public.ttxd_admin_users
for each row execute function public.ttxd_guard_last_province_account();

-- Serialize login with account locking so an in-flight login cannot outlive a disable.
create or replace function public.ttxd_guard_bound_admin_session()
returns trigger language plpgsql security invoker set search_path=''
as $$
declare v_account public.ttxd_admin_users%rowtype;
begin
  select * into v_account from public.ttxd_admin_users where email=new.user_email for share;
  if not found or v_account.active is not true or
    ((v_account.role='province' and v_account.commune_code is null) or
     (v_account.role='commune' and v_account.commune_code is not null)) is not true then
    raise exception 'TTXD_SESSION_ACCOUNT_UNAVAILABLE';
  end if;
  return new;
end;
$$;
revoke all on function public.ttxd_guard_bound_admin_session() from public,anon,authenticated;
grant execute on function public.ttxd_guard_bound_admin_session() to service_role;
drop trigger if exists ttxd_guard_bound_admin_session on public.ttxd_admin_sessions;
create trigger ttxd_guard_bound_admin_session before insert on public.ttxd_admin_sessions
for each row execute function public.ttxd_guard_bound_admin_session();

commit;
