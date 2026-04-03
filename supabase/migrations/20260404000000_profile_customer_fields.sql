-- Customer profile: contact & reference person (run after initial migration)

alter table public.profiles
  add column if not exists mobile_number text,
  add column if not exists address text,
  add column if not exists reference_person_mobile text,
  add column if not exists reference_relationship text;

comment on column public.profiles.mobile_number is 'Customer mobile phone';
comment on column public.profiles.address is 'Customer address';
comment on column public.profiles.reference_person_mobile is 'Reference person contact number';
comment on column public.profiles.reference_relationship is 'Relationship to reference person';

-- Customers may update their own row (contact fields); admins retain full updates via existing policy
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Prevent non-admins from changing role (or any escalation) on self-update
create or replace function public.profiles_prevent_non_admin_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
begin
  if new.role is distinct from old.role then
    -- SQL editor / service role often have no JWT; allow those updates
    if auth.uid() is null then
      return new;
    end if;
    select exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    ) into is_admin;
    if not is_admin then
      raise exception 'Only administrators can change roles' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard
  before update on public.profiles
  for each row
  execute function public.profiles_prevent_non_admin_role_change();
