import { z } from "zod";

const paymentMethodEnum = z.enum([
  "cash",
  "bank_transfer",
  "gcash",
  "maya",
  "check",
  "other",
]);

export const RecordPaymentSchema = z.object({
  loan_id: z.string().uuid("Invalid loan ID"),
  loan_schedule_id: z.string().uuid("Invalid schedule ID"),
  borrower_id: z.string().uuid("Invalid borrower ID"),
  amount: z
    .number()
    .positive("Amount must be positive"),
  payment_date: z
    .string()
    .min(1, "Payment date is required")
    .refine(
      (val) => new Date(val) <= new Date(),
      "Payment date cannot be in the future"
    ),
  payment_method: paymentMethodEnum,
  reference_number: z.string().nullish(),
  notes: z.string().nullish(),
});

export type RecordPaymentFormValues = z.input<typeof RecordPaymentSchema>;
export type RecordPaymentOutput = z.infer<typeof RecordPaymentSchema>;
