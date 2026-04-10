"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import gsap from "gsap";
import { toast } from "sonner";

import {
  CreateBorrowerSchema,
  type CreateBorrowerFormValues,
} from "@/validations/borrower";
import type { Borrower } from "@/types/borrower";
import { createBorrower, updateBorrower } from "@/lib/actions/borrowers";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2Icon } from "lucide-react";

const idTypes = [
  "National ID",
  "Passport",
  "Driver License",
  "SSS",
  "PhilHealth",
  "TIN",
] as const;

interface BorrowerFormProps {
  mode: "create" | "edit";
  borrower?: Borrower;
}

export function BorrowerForm({ mode, borrower }: BorrowerFormProps) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateBorrowerFormValues>({
    resolver: zodResolver(CreateBorrowerSchema),
    defaultValues: {
      first_name: borrower?.first_name ?? "",
      last_name: borrower?.last_name ?? "",
      phone: borrower?.phone ?? "",
      email: borrower?.email ?? "",
      address: borrower?.address ?? "",
      id_type: borrower?.id_type ?? undefined,
      id_number: borrower?.id_number ?? "",
      date_of_birth: borrower?.date_of_birth ?? "",
      occupation: borrower?.occupation ?? "",
      monthly_income: borrower?.monthly_income ?? undefined,
      notes: borrower?.notes ?? "",
      status: borrower?.status ?? "active",
    },
  });

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }
      );
    }, el);

    return () => ctx.revert();
  }, []);

  const onSubmit = async (values: CreateBorrowerFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        first_name: values.first_name,
        last_name: values.last_name,
        phone: values.phone,
        email: values.email || null,
        address: values.address || null,
        id_type: values.id_type ?? null,
        id_number: values.id_number || null,
        date_of_birth: values.date_of_birth || null,
        occupation: values.occupation || null,
        monthly_income: values.monthly_income ?? null,
        notes: values.notes || null,
        status: values.status ?? ("active" as const),
      };

      if (mode === "edit" && borrower) {
        const { error } = await updateBorrower(borrower.id, payload);
        if (error) {
          toast.error("Failed to update borrower", { description: error });
          return;
        }
        toast.success("Borrower updated successfully", {
          description: `${values.first_name} ${values.last_name} has been updated.`,
        });
        router.push(`/borrowers/${borrower.id}`);
      } else {
        const { data, error } = await createBorrower(payload);
        if (error) {
          toast.error("Failed to create borrower", { description: error });
          return;
        }
        toast.success("Borrower created successfully", {
          description: `${values.first_name} ${values.last_name} has been added.`,
        });
        router.push(`/borrowers/${data!.id}`);
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEdit = mode === "edit";

  return (
    <div
      ref={cardRef}
      className="rounded-lg border bg-card p-6 shadow-sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Name */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name *</Label>
            <Input
              id="first_name"
              placeholder="Juan"
              {...register("first_name")}
            />
            {errors.first_name && (
              <p className="text-sm text-destructive">
                {errors.first_name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name *</Label>
            <Input
              id="last_name"
              placeholder="Dela Cruz"
              {...register("last_name")}
            />
            {errors.last_name && (
              <p className="text-sm text-destructive">
                {errors.last_name.message}
              </p>
            )}
          </div>
        </div>

        {/* Phone + Email */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              placeholder="09171234567"
              {...register("phone")}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">
                {errors.phone.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="juan@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>
        </div>

        {/* DOB + Occupation */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="date_of_birth">Date of Birth</Label>
            <Input
              id="date_of_birth"
              type="date"
              {...register("date_of_birth")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="occupation">Occupation</Label>
            <Input
              id="occupation"
              placeholder="e.g. Teacher"
              {...register("occupation")}
            />
          </div>
        </div>

        {/* ID Type + ID Number */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>ID Type</Label>
            <Select
              defaultValue={borrower?.id_type ?? undefined}
              onValueChange={(val) => {
                if (val) {
                  setValue(
                    "id_type",
                    val as CreateBorrowerFormValues["id_type"],
                    { shouldValidate: true }
                  );
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select ID type" />
              </SelectTrigger>
              <SelectContent>
                {idTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.id_type && (
              <p className="text-sm text-destructive">
                {errors.id_type.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="id_number">ID Number</Label>
            <Input
              id="id_number"
              placeholder="e.g. 1234-5678-9012"
              {...register("id_number")}
            />
          </div>
        </div>

        {/* Monthly Income */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="monthly_income">Monthly Income (PHP)</Label>
            <Input
              id="monthly_income"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("monthly_income", { valueAsNumber: true })}
            />
            {errors.monthly_income && (
              <p className="text-sm text-destructive">
                {errors.monthly_income.message}
              </p>
            )}
          </div>
        </div>

        {/* Address – full width */}
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            rows={2}
            placeholder="Complete address"
            {...register("address")}
          />
        </div>

        {/* Notes – full width */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            rows={3}
            placeholder="Additional notes..."
            {...register("notes")}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            render={
              <Link
                href={
                  isEdit && borrower
                    ? `/borrowers/${borrower.id}`
                    : "/borrowers"
                }
              />
            }
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && (
              <Loader2Icon className="size-4 animate-spin" />
            )}
            {isSubmitting
              ? "Saving..."
              : isEdit
                ? "Update Borrower"
                : "Save Borrower"}
          </Button>
        </div>
      </form>
    </div>
  );
}
