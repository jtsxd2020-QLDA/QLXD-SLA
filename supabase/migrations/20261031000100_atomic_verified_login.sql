-- Serialize password resets and creation of sessions authenticated with that password.
begin;
create or replace function public.ttxd_create_verified_session(
  p_email text, p_expected_hash text, p_hash text, p_csrf text, p_expires bigint
) returns boolean language plpgsql security invoker set search_path=''
as $$
declare v_account public.ttxd_admin_users%rowtype;
begin
  select * into v_account from public.ttxd_admin_users where email=p_email for share;
  if not found or v_account.active is not true or v_account.password_hash is distinct from p_expected_hash or
    ((v_account.role='province' and v_account.commune_code is null) or
     (v_account.role='commune' and v_account.commune_code is not null)) is not true then
    return false;
  end if;
  insert into public.ttxd_admin_sessions(hash,csrf,expires,user_email) values(p_hash,p_csrf,p_expires,p_email);
  return true;
end;
$$;
revoke all on function public.ttxd_create_verified_session(text,text,text,text,bigint) from public,anon,authenticated;
grant execute on function public.ttxd_create_verified_session(text,text,text,text,bigint) to service_role;
commit;
