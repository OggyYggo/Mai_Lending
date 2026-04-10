-- ============================================================
-- 001_initial.sql – Mai Lending Management
-- Tables: admins, borrowers, loans, loan_schedules, payments
-- RLS: only authenticated users can access data
-- ============================================================

-- ===================
-- 1. admins
-- ===================
create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null default 'admin' check (role in ('admin', 'super_admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admins enable row level security;

drop policy if exists "Authenticated users can read admins" on public.admins;
create policy "Authenticated users can read admins"
  on public.admins for select
  to authenticated
  using (true);

drop policy if exists "Admins can insert admins" on public.admins;
create policy "Admins can insert admins"
  on public.admins for insert
  to authenticated
  with check (true);

drop policy if exists "Admins can update their own record" on public.admins;
create policy "Admins can update their own record"
  on public.admins for update
  to authenticated
  using (user_id = auth.uid());

-- ===================
-- 2. borrowers
-- ===================
create table if not exists public.borrowers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  middle_name text,
  email text,
  phone text,
  address text,
  date_of_birth date,
  id_type text,
  id_number text,
  notes text,
  is_active boolean not null default true,
  created_by uuid references public.admins(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.borrowers enable row level security;

drop policy if exists "Authenticated users can read borrowers" on public.borrowers;
create policy "Authenticated users can read borrowers"
  on public.borrowers for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert borrowers" on public.borrowers;
create policy "Authenticated users can insert borrowers"
  on public.borrowers for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update borrowers" on public.borrowers;
create policy "Authenticated users can update borrowers"
  on public.borrowers for update
  to authenticated
  using (true);

-- ===================
-- 3. loans
-- ===================
create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  borrower_id uuid not null references public.borrowers(id) on delete cascade,
  loan_amount numeric(15,2) not null check (loan_amount > 0),
  interest_rate numeric(5,4) not null check (interest_rate >= 0),
  term_months integer not null check (term_months > 0),
  payment_frequency text not null default 'monthly'
    check (payment_frequency in ('daily', 'weekly', 'bi_weekly', 'monthly')),
  start_date date not null,
  maturity_date date not null,
  outstanding_balance numeric(15,2) not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'paid', 'defaulted', 'cancelled')),
  notes text,
  created_by uuid references public.admins(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.loans enable row level security;

drop policy if exists "Authenticated users can read loans" on public.loans;
create policy "Authenticated users can read loans"
  on public.loans for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert loans" on public.loans;
create policy "Authenticated users can insert loans"
  on public.loans for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update loans" on public.loans;
create policy "Authenticated users can update loans"
  on public.loans for update
  to authenticated
  using (true);

-- ===================
-- 4. loan_schedules
-- ===================
create table if not exists public.loan_schedules (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  due_date date not null,
  principal_amount numeric(15,2) not null default 0,
  interest_amount numeric(15,2) not null default 0,
  total_amount numeric(15,2) not null default 0,
  paid_amount numeric(15,2) not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'partial', 'overdue', 'waived')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.loan_schedules enable row level security;

drop policy if exists "Authenticated users can read loan_schedules" on public.loan_schedules;
create policy "Authenticated users can read loan_schedules"
  on public.loan_schedules for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert loan_schedules" on public.loan_schedules;
create policy "Authenticated users can insert loan_schedules"
  on public.loan_schedules for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update loan_schedules" on public.loan_schedules;
create policy "Authenticated users can update loan_schedules"
  on public.loan_schedules for update
  to authenticated
  using (true);

-- ===================
-- 5. payments
-- ===================
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  schedule_id uuid references public.loan_schedules(id) on delete set null,
  amount numeric(15,2) not null check (amount > 0),
  payment_date date not null,
  payment_method text not null default 'cash'
    check (payment_method in ('cash', 'bank_transfer', 'check', 'online', 'other')),
  reference_number text,
  notes text,
  recorded_by uuid references public.admins(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payments enable row level security;

drop policy if exists "Authenticated users can read payments" on public.payments;
create policy "Authenticated users can read payments"
  on public.payments for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert payments" on public.payments;
create policy "Authenticated users can insert payments"
  on public.payments for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update payments" on public.payments;
create policy "Authenticated users can update payments"
  on public.payments for update
  to authenticated
  using (true);

-- ===================
-- Indexes
-- ===================
create index if not exists idx_borrowers_created_by on public.borrowers(created_by);
create index if not exists idx_loans_borrower_id on public.loans(borrower_id);
create index if not exists idx_loans_status on public.loans(status);
create index if not exists idx_loan_schedules_loan_id on public.loan_schedules(loan_id);
create index if not exists idx_loan_schedules_due_date on public.loan_schedules(due_date);
create index if not exists idx_loan_schedules_status on public.loan_schedules(status);
create index if not exists idx_payments_loan_id on public.payments(loan_id);
create index if not exists idx_payments_schedule_id on public.payments(schedule_id);
create index if not exists idx_payments_payment_date on public.payments(payment_date);

-- ===================
-- updated_at trigger
-- ===================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_admins_updated_at on public.admins;
create trigger set_admins_updated_at
  before update on public.admins
  for each row execute function public.handle_updated_at();

drop trigger if exists set_borrowers_updated_at on public.borrowers;
create trigger set_borrowers_updated_at
  before update on public.borrowers
  for each row execute function public.handle_updated_at();

drop trigger if exists set_loans_updated_at on public.loans;
create trigger set_loans_updated_at
  before update on public.loans
  for each row execute function public.handle_updated_at();

drop trigger if exists set_loan_schedules_updated_at on public.loan_schedules;
create trigger set_loan_schedules_updated_at
  before update on public.loan_schedules
  for each row execute function public.handle_updated_at();

drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at
  before update on public.payments
  for each row execute function public.handle_updated_at();
