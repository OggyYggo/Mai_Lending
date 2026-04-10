-- ============================================================
-- 002_borrowers.sql – Revised borrowers table
-- Drops and recreates the borrowers table from 001_initial.sql
-- with updated schema (occupation, monthly_income, status)
-- ============================================================

-- Drop dependent objects first (from 001_initial.sql)
drop trigger if exists set_borrowers_updated_at on public.borrowers;
drop policy if exists "Authenticated users can read borrowers" on public.borrowers;
drop policy if exists "Authenticated users can insert borrowers" on public.borrowers;
drop policy if exists "Authenticated users can update borrowers" on public.borrowers;
drop index if exists idx_borrowers_created_by;

-- Drop the old table (cascade removes FK references from loans/payments)
drop table if exists public.borrowers cascade;

-- Recreate with updated schema
CREATE TABLE public.borrowers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  address TEXT,
  id_type TEXT CHECK (id_type IN ('National ID', 'Passport', 'Driver License', 'SSS', 'PhilHealth', 'TIN')),
  id_number TEXT,
  date_of_birth DATE,
  occupation TEXT,
  monthly_income NUMERIC(12,2),
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access" ON public.borrowers
  FOR ALL USING (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER borrowers_updated_at
  BEFORE UPDATE ON public.borrowers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Re-add FK from loans to new borrowers table
ALTER TABLE public.loans
  ADD CONSTRAINT loans_borrower_id_fkey
  FOREIGN KEY (borrower_id) REFERENCES public.borrowers(id) ON DELETE CASCADE;
