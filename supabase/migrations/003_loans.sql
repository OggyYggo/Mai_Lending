-- ============================================================
-- 003_loans.sql – Loans & Loan Schedules
-- Drops old tables from 001_initial.sql and recreates with
-- updated schema (loan_number, interest_type, approval flow)
-- ============================================================

-- Drop old objects from 001_initial.sql
drop trigger if exists set_loans_updated_at on public.loans;
drop trigger if exists set_loan_schedules_updated_at on public.loan_schedules;
drop policy if exists "Authenticated users can read loans" on public.loans;
drop policy if exists "Authenticated users can insert loans" on public.loans;
drop policy if exists "Authenticated users can update loans" on public.loans;
drop policy if exists "Authenticated users can read loan_schedules" on public.loan_schedules;
drop policy if exists "Authenticated users can insert loan_schedules" on public.loan_schedules;
drop policy if exists "Authenticated users can update loan_schedules" on public.loan_schedules;
drop index if exists idx_loans_borrower_id;
drop index if exists idx_loans_status;
drop index if exists idx_loan_schedules_loan_id;
drop index if exists idx_loan_schedules_due_date;
drop index if exists idx_loan_schedules_status;

-- Drop old tables (payments depends on loans, cascade)
drop table if exists public.loan_schedules cascade;
drop table if exists public.loans cascade;

-- ===================
-- loans
-- ===================
CREATE TABLE public.loans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  borrower_id UUID NOT NULL REFERENCES public.borrowers(id) ON DELETE RESTRICT,
  loan_number TEXT UNIQUE NOT NULL,
  principal_amount NUMERIC(12,2) NOT NULL,
  interest_rate NUMERIC(5,2) NOT NULL,
  interest_type TEXT DEFAULT 'flat' CHECK (interest_type IN ('flat', 'diminishing')),
  term_months INTEGER NOT NULL,
  payment_frequency TEXT DEFAULT 'monthly' CHECK (payment_frequency IN ('weekly', 'bi-weekly', 'monthly')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'completed', 'overdue', 'rejected')),
  purpose TEXT,
  start_date DATE,
  end_date DATE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

drop policy if exists "Admin full access loans" on public.loans;
CREATE POLICY "Admin full access loans" ON public.loans
  FOR ALL USING (auth.role() = 'authenticated');

drop trigger if exists loans_updated_at on public.loans;
CREATE TRIGGER loans_updated_at
  BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ===================
-- loan_schedules
-- ===================
CREATE TABLE public.loan_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  principal_amount NUMERIC(12,2) NOT NULL,
  interest_amount NUMERIC(12,2) NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial', 'overdue')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.loan_schedules ENABLE ROW LEVEL SECURITY;

drop policy if exists "Admin full access schedules" on public.loan_schedules;
CREATE POLICY "Admin full access schedules" ON public.loan_schedules
  FOR ALL USING (auth.role() = 'authenticated');

-- ===================
-- Sequence for loan numbers
-- ===================
CREATE SEQUENCE IF NOT EXISTS public.loan_number_seq START 1000;

-- RPC function to get next loan number value
CREATE OR REPLACE FUNCTION public.nextval_loan_number()
RETURNS bigint
LANGUAGE sql
SECURITY definer
AS $$ SELECT nextval('public.loan_number_seq') $$;

-- ===================
-- Re-add payments FK (dropped by cascade)
-- ===================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.loan_schedules(id) ON DELETE SET NULL,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'bank_transfer', 'check', 'online', 'other')),
  reference_number TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES public.admins(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

drop policy if exists "Authenticated users can read payments" on public.payments;
CREATE POLICY "Authenticated users can read payments" ON public.payments
  FOR ALL USING (auth.role() = 'authenticated');

drop trigger if exists set_payments_updated_at on public.payments;
CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
