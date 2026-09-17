-- Advisor fixes: no extension in public, keep is_admin() out of the REST API.

alter table public.profiles alter column email type text using lower(email::text);
alter table public.admin_allowlist alter column email type text using lower(email::text);
alter table public.admin_allowlist add constraint admin_allowlist_email_lower check (email = lower(email));
drop extension citext;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    lower(new.email),
    case when exists (select 1 from public.admin_allowlist a where a.email = lower(new.email))
         then 'admin' else 'customer' end
  );
  return new;
end;
$$;

-- Policies reference the function by OID, so moving the schema keeps them working.
create schema if not exists private;
grant usage on schema private to anon, authenticated;
alter function public.is_admin() set schema private;
