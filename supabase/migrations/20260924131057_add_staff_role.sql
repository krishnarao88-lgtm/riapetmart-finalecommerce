alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('customer', 'admin', 'staff'));

alter table public.admin_allowlist add column role text not null default 'admin' check (role in ('admin', 'staff'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    coalesce((select a.role from public.admin_allowlist a where a.email = new.email), 'customer')
  );
  return new;
end;
$$;

create function private.is_staff()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'staff'
  );
$$;

create policy "staff views orders" on public.orders
  for select using (private.is_staff());

create function public.invite_staff(p_email text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not private.is_admin() then
    raise exception 'Only admins can invite staff';
  end if;
  insert into public.admin_allowlist (email, role) values (lower(trim(p_email)), 'staff')
  on conflict (email) do update set role = 'staff';
end;
$$;

grant execute on function public.invite_staff to authenticated;

create function public.remove_staff(p_email text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not private.is_admin() then
    raise exception 'Only admins can remove staff';
  end if;
  delete from public.admin_allowlist where email = lower(trim(p_email)) and role = 'staff';
end;
$$;

grant execute on function public.remove_staff to authenticated;

create function public.list_staff()
returns table (email text)
language sql security definer set search_path = public as $$
  select email::text from public.admin_allowlist where role = 'staff' order by email;
$$;

grant execute on function public.list_staff to authenticated;
