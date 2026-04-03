-- Lending app: profiles, loans, payments, support, push tokens
-- Run in Supabase SQL Editor or via CLI: supabase db push

-- Enum-like checks via text + constraint

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'customer' check (role in ('admin', 'staff', 'customer')),
  created_at timestamptz not null default now()
);

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(14, 2) not null check (amount >= 0),
  interest_rate numeric(6, 3) not null default 0,
  total_amount numeric(14, 2) not null check (total_amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'paid')),
  due_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans (id) on delete cascade,
  amount_paid numeric(14, 2) not null check (amount_paid >= 0),
  payment_date date not null default (current_date)
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  message text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  staff_reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  expo_push_token text not null,
  updated_at timestamptz not null default now(),
  unique (user_id, expo_push_token)
);

create index if not exists idx_loans_user on public.loans (user_id);
create index if not exists idx_loans_status on public.loans (status);
create index if not exists idx_loans_due on public.loans (due_date);
create index if not exists idx_payments_loan on public.payments (loan_id);
create index if not exists idx_support_user on public.support_messages (user_id);
create index if not exists idx_support_status on public.support_messages (status);

-- Auto profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'customer')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at on support_messages
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists support_messages_updated on public.support_messages;
create trigger support_messages_updated
  before update on public.support_messages
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.loans enable row level security;
alter table public.payments enable row level security;
alter table public.support_messages enable row level security;
alter table public.user_push_tokens enable row level security;

-- Helper: current role
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Profiles
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid() or public.current_role() in ('admin', 'staff'));

create policy "profiles_update_admin"
  on public.profiles for update
  using (public.current_role() = 'admin');

create policy "profiles_insert_self"
  on public.profiles for insert
  with check (id = auth.uid());

-- Loans
create policy "loans_select"
  on public.loans for select
  using (
    user_id = auth.uid()
    or public.current_role() in ('admin', 'staff')
  );

create policy "loans_insert_staff"
  on public.loans for insert
  with check (public.current_role() in ('admin', 'staff'));

create policy "loans_update_staff"
  on public.loans for update
  using (public.current_role() in ('admin', 'staff'));

create policy "loans_delete_admin"
  on public.loans for delete
  using (public.current_role() = 'admin');

-- Payments
create policy "payments_select"
  on public.payments for select
  using (
    exists (
      select 1 from public.loans l
      where l.id = payments.loan_id
        and (l.user_id = auth.uid() or public.current_role() in ('admin', 'staff'))
    )
  );

create policy "payments_mutate_staff"
  on public.payments for all
  using (public.current_role() in ('admin', 'staff'))
  with check (public.current_role() in ('admin', 'staff'));

-- Support
create policy "support_select"
  on public.support_messages for select
  using (
    user_id = auth.uid()
    or public.current_role() in ('admin', 'staff')
  );

create policy "support_insert_customer"
  on public.support_messages for insert
  with check (user_id = auth.uid());

create policy "support_update_staff"
  on public.support_messages for update
  using (public.current_role() in ('admin', 'staff'));

-- Push tokens
create policy "push_select_own"
  on public.user_push_tokens for select
  using (user_id = auth.uid() or public.current_role() = 'admin');

create policy "push_upsert_own"
  on public.user_push_tokens for insert
  with check (user_id = auth.uid());

create policy "push_update_own"
  on public.user_push_tokens for update
  using (user_id = auth.uid());

create policy "push_delete_own"
  on public.user_push_tokens for delete
  using (user_id = auth.uid());

-- Realtime (support + loans for dashboard)
alter publication supabase_realtime add table public.loans;
alter publication supabase_realtime add table public.payments;
alter publication supabase_realtime add table public.support_messages;
