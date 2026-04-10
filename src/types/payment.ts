export type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "gcash"
  | "maya"
  | "check"
  | "other";

export interface Payment {
  id: string;
  loan_id: string;
  loan_schedule_id: string | null;
  borrower_id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  reference_number: string | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface PaymentWithDetails extends Payment {
  borrower: {
    first_name: string;
    last_name: string;
  };
  loan: {
    loan_number: string;
  };
}

export interface PaymentSummary {
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  collectionRate: number;
}
