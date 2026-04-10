-- ============================================================
-- 004_payments.sql – Payments table & process_payment function
-- Drops the payments table created by 003_loans.sql and
-- recreates with updated schema (borrower_id, gcash/maya methods)
-- ============================================================

-- Drop old objects from 003_loans.sql
drop trigger if exists set_payments_updated_at on public.payments;
drop policy if exists "Authenticated users can read payments" on public.payments;
drop table if exists public.payments cascade;

-- ===================
-- payments
-- ===================
CREATE TABLE public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE RESTRICT,
  loan_schedule_id UUID REFERENCES public.loan_schedules(id),
  borrower_id UUID NOT NULL REFERENCES public.borrowers(id),
  amount NUMERIC(12,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN
    ('cash', 'bank_transfer', 'gcash', 'maya', 'check', 'other')),
  reference_number TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

drop policy if exists "Admin full access payments" on public.payments;
CREATE POLICY "Admin full access payments" ON public.payments
  FOR ALL USING (auth.role() = 'authenticated');

-- ===================
-- Indexes
-- ===================
CREATE INDEX IF NOT EXISTS idx_payments_loan_id ON public.payments (loan_id);
CREATE INDEX IF NOT EXISTS idx_payments_borrower_id ON public.payments (borrower_id);
CREATE INDEX IF NOT EXISTS idx_payments_schedule_id ON public.payments (loan_schedule_id);

-- ===================
-- process_payment() – atomically records payment,
-- updates schedule status, and completes loan if all paid
-- ===================
CREATE OR REPLACE FUNCTION public.process_payment(
  p_loan_id UUID,
  p_loan_schedule_id UUID,
  p_amount NUMERIC,
  p_payment_date DATE,
  p_payment_method TEXT,
  p_reference_number TEXT,
  p_notes TEXT,
  p_borrower_id UUID
) RETURNS void AS $$
DECLARE
  v_total_due NUMERIC;
  v_already_paid NUMERIC;
BEGIN
  -- Get current schedule amounts
  SELECT total_amount, paid_amount
  INTO v_total_due, v_already_paid
  FROM public.loan_schedules WHERE id = p_loan_schedule_id;

  -- Update schedule
  UPDATE public.loan_schedules SET
    paid_amount = paid_amount + p_amount,
    status = CASE
      WHEN (paid_amount + p_amount) >= total_amount THEN 'paid'
      WHEN (paid_amount + p_amount) > 0 THEN 'partial'
      ELSE status
    END,
    paid_at = CASE
      WHEN (paid_amount + p_amount) >= total_amount THEN now()
      ELSE paid_at
    END
  WHERE id = p_loan_schedule_id;

  -- If all schedules for this loan are paid, mark loan completed
  IF (SELECT COUNT(*) FROM public.loan_schedules
      WHERE loan_id = p_loan_id AND status != 'paid') = 0 THEN
    UPDATE public.loans SET status = 'completed' WHERE id = p_loan_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY definer;
