export type BorrowerStatus = "active" | "inactive" | "blacklisted";

export type BorrowerIdType =
  | "National ID"
  | "Passport"
  | "Driver License"
  | "SSS"
  | "PhilHealth"
  | "TIN";

export interface Borrower {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string;
  address: string | null;
  id_type: BorrowerIdType | null;
  id_number: string | null;
  date_of_birth: string | null;
  occupation: string | null;
  monthly_income: number | null;
  notes: string | null;
  status: BorrowerStatus;
  created_at: string;
  updated_at: string;
}

export type CreateBorrowerInput = Omit<
  Borrower,
  "id" | "created_at" | "updated_at"
>;

export type UpdateBorrowerInput = Partial<Omit<Borrower, "id">> & {
  id: string;
};
