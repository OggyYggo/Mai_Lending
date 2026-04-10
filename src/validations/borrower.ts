import { z } from "zod";

const idTypeEnum = z.enum([
  "National ID",
  "Passport",
  "Driver License",
  "SSS",
  "PhilHealth",
  "TIN",
]);

const statusEnum = z.enum(["active", "inactive", "blacklisted"]);

export const borrowerSchema = z.object({
  first_name: z
    .string()
    .min(2, "First name must be at least 2 characters"),
  last_name: z
    .string()
    .min(2, "Last name must be at least 2 characters"),
  phone: z
    .string()
    .min(7, "Phone must be at least 7 characters"),
  email: z
    .string()
    .email("Invalid email format")
    .nullish()
    .or(z.literal("")),
  address: z.string().nullish(),
  id_type: idTypeEnum.nullish(),
  id_number: z.string().nullish(),
  date_of_birth: z.string().nullish(),
  occupation: z.string().nullish(),
  monthly_income: z
    .number()
    .positive("Monthly income must be a positive number")
    .nullish(),
  notes: z.string().nullish(),
  status: statusEnum.default("active"),
});

export const CreateBorrowerSchema = borrowerSchema;

export const UpdateBorrowerSchema = borrowerSchema
  .partial()
  .extend({ id: z.string().uuid("Invalid borrower ID") });

export type CreateBorrowerFormValues = z.input<typeof CreateBorrowerSchema>;
export type CreateBorrowerOutput = z.infer<typeof CreateBorrowerSchema>;
export type UpdateBorrowerFormValues = z.input<typeof UpdateBorrowerSchema>;
export type UpdateBorrowerOutput = z.infer<typeof UpdateBorrowerSchema>;
