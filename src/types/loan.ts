export type LoanStatus =
  | "pending"
  | "approved"
  | "active"
  | "completed"
  | "overdue"
  | "rejected";

export type InterestType = "flat" | "diminishing";

export type PaymentFrequency = "weekly" | "bi-weekly" | "monthly";

export type ScheduleStatus = "pending" | "paid" | "partial" | "overdue";

export interface Loan {
  id: string;
  borrower_id: string;
  loan_number: string;
  principal_amount: number;
  interest_rate: number;
  interest_type: InterestType;
  term_months: number;
  payment_frequency: PaymentFrequency;
  status: LoanStatus;
  purpose: string | null;
  start_date: string | null;
  end_date: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanSchedule {
  id: string;
  loan_id: string;
  installment_number: number;
  due_date: string;
  principal_amount: number;
  interest_amount: number;
  total_amount: number;
  paid_amount: number;
  status: ScheduleStatus;
  paid_at: string | null;
  created_at: string;
}

export interface LoanWithBorrower extends Loan {
  borrower: {
    first_name: string;
    last_name: string;
    phone: string;
  };
}

export interface LoanSummary {
  totalInterest: number;
  totalPayable: number;
  monthlyPayment: number;
}
