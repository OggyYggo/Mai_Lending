import { z } from "zod";

const interestTypeEnum = z.enum(["flat", "diminishing"]);
const paymentFrequencyEnum = z.enum(["weekly", "bi-weekly", "monthly"]);

export const CreateLoanSchema = z.object({
  borrower_id: z.string().uuid("Invalid borrower ID"),
  principal_amount: z
    .number()
    .positive("Principal must be positive")
    .min(1, "Principal must be at least 1"),
  interest_rate: z
    .number()
    .positive("Interest rate must be positive")
    .max(100, "Interest rate cannot exceed 100%"),
  interest_type: interestTypeEnum,
  term_months: z
    .number()
    .int("Term must be a whole number")
    .min(1, "Term must be at least 1 month")
    .max(120, "Term cannot exceed 120 months"),
  payment_frequency: paymentFrequencyEnum,
  purpose: z.string().nullish(),
  start_date: z.string().min(1, "Start date is required"),
  notes: z.string().nullish(),
});

export const ApproveLoanSchema = z.object({
  loan_id: z.string().uuid("Invalid loan ID"),
  start_date: z.string().min(1, "Start date is required"),
});

export const RejectLoanSchema = z.object({
  loan_id: z.string().uuid("Invalid loan ID"),
  rejection_reason: z
    .string()
    .min(10, "Rejection reason must be at least 10 characters"),
});

export type CreateLoanFormValues = z.input<typeof CreateLoanSchema>;
export type CreateLoanOutput = z.infer<typeof CreateLoanSchema>;
export type ApproveLoanFormValues = z.input<typeof ApproveLoanSchema>;
export type RejectLoanFormValues = z.input<typeof RejectLoanSchema>;
