"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import gsap from "gsap";
import { toast } from "sonner";

import { CreateLoanSchema, type CreateLoanFormValues } from "@/validations/loan";
import { createLoan } from "@/lib/actions/loans";
import { getBorrowers } from "@/lib/actions/borrowers";
import { calculateLoanSummary } from "@/lib/loan-utils";
import type { Borrower } from "@/types/borrower";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Loader2Icon,
  ChevronsUpDownIcon,
  CheckIcon,
  CalendarIcon,
  BanknoteIcon,
  PercentIcon,
  TrendingUpIcon,
} from "lucide-react";

const interestTypes = [
  { value: "flat", label: "Flat" },
  { value: "diminishing", label: "Diminishing" },
] as const;

const frequencies = [
  { value: "weekly", label: "Weekly" },
  { value: "bi-weekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
] as const;

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);

export default function NewLoanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedBorrowerId = searchParams.get("borrowerId");

  const formRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loadingBorrowers, setLoadingBorrowers] = useState(true);
  const [borrowerOpen, setBorrowerOpen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateLoanFormValues>({
    resolver: zodResolver(CreateLoanSchema),
    defaultValues: {
      borrower_id: preselectedBorrowerId ?? "",
      principal_amount: undefined,
      interest_rate: undefined,
      interest_type: "flat",
      term_months: undefined,
      payment_frequency: "monthly",
      purpose: "",
      start_date: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  const watchPrincipal = watch("principal_amount");
  const watchRate = watch("interest_rate");
  const watchTerm = watch("term_months");
  const watchType = watch("interest_type");
  const watchStartDate = watch("start_date");
  const selectedBorrowerId = watch("borrower_id");

  // Fetch borrowers
  useEffect(() => {
    (async () => {
      const { data } = await getBorrowers();
      setBorrowers(
        (data ?? []).filter((b) => b.status === "active")
      );
      setLoadingBorrowers(false);
    })();
  }, []);

  // GSAP entrance
  useEffect(() => {
    const el = formRef.current;
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

  // Live summary
  const summary = useMemo(() => {
    const p = Number(watchPrincipal);
    const r = Number(watchRate);
    const t = Number(watchTerm);
    if (!p || !r || !t || p <= 0 || r <= 0 || t <= 0) return null;
    return calculateLoanSummary(p, r, t, watchType ?? "flat");
  }, [watchPrincipal, watchRate, watchTerm, watchType]);

  const endDate = useMemo(() => {
    const t = Number(watchTerm);
    if (!watchStartDate || !t || t <= 0) return null;
    const d = new Date(watchStartDate);
    d.setMonth(d.getMonth() + t);
    return d;
  }, [watchStartDate, watchTerm]);

  const selectedBorrower = borrowers.find(
    (b) => b.id === selectedBorrowerId
  );

  const onSubmit = async (values: CreateLoanFormValues) => {
    setIsSubmitting(true);
    try {
      const { data, error } = await createLoan({
        ...values,
        principal_amount: Number(values.principal_amount),
        interest_rate: Number(values.interest_rate),
        term_months: Number(values.term_months),
        purpose: values.purpose || null,
        notes: values.notes || null,
      });

      if (error) {
        toast.error("Failed to create loan", { description: error });
        return;
      }

      toast.success("Loan created successfully", {
        description: `Loan ${data!.loan_number} has been created.`,
      });
      router.push(`/loans/${data!.id}`);
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Loan</h1>
        <p className="mt-1 text-muted-foreground">
          Set up a new loan application.
        </p>
      </div>

      <div
        ref={formRef}
        className="grid gap-6 lg:grid-cols-[1fr_320px]"
      >
        {/* Form */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <form
            id="loan-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            {/* Borrower */}
            <div className="space-y-2">
              <Label>Borrower *</Label>
              <Controller
                control={control}
                name="borrower_id"
                render={({ field }) => (
                  <Popover open={borrowerOpen} onOpenChange={setBorrowerOpen}>
                    <PopoverTrigger
                      render={
                        <Button
                          variant="outline"
                          className="w-full justify-between font-normal"
                        />
                      }
                    >
                      {selectedBorrower
                        ? `${selectedBorrower.first_name} ${selectedBorrower.last_name}`
                        : loadingBorrowers
                          ? "Loading borrowers..."
                          : "Select a borrower"}
                      <ChevronsUpDownIcon className="ml-auto size-4 shrink-0 opacity-50" />
                    </PopoverTrigger>
                    <PopoverContent className="w-[--anchor-width] p-0">
                      <Command>
                        <CommandInput placeholder="Search borrower..." />
                        <CommandList>
                          <CommandEmpty>No borrower found.</CommandEmpty>
                          <CommandGroup>
                            {borrowers.map((b) => (
                              <CommandItem
                                key={b.id}
                                value={`${b.first_name} ${b.last_name} ${b.phone}`}
                                onSelect={() => {
                                  field.onChange(b.id);
                                  setBorrowerOpen(false);
                                }}
                              >
                                <CheckIcon
                                  className={`size-4 ${
                                    field.value === b.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  }`}
                                />
                                <span>
                                  {b.first_name} {b.last_name}
                                </span>
                                <span className="ml-auto text-xs text-muted-foreground">
                                  {b.phone}
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.borrower_id && (
                <p className="text-sm text-destructive">
                  {errors.borrower_id.message}
                </p>
              )}
            </div>

            {/* Principal + Rate */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="principal_amount">Principal Amount *</Label>
                <div className="relative">
                  <BanknoteIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="principal_amount"
                    type="number"
                    step="0.01"
                    placeholder="50,000"
                    className="pl-9"
                    {...register("principal_amount", { valueAsNumber: true })}
                  />
                </div>
                {errors.principal_amount && (
                  <p className="text-sm text-destructive">
                    {errors.principal_amount.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="interest_rate">Interest Rate *</Label>
                <div className="relative">
                  <PercentIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="interest_rate"
                    type="number"
                    step="0.01"
                    placeholder="3.00"
                    className="pl-9"
                    {...register("interest_rate", { valueAsNumber: true })}
                  />
                </div>
                {errors.interest_rate && (
                  <p className="text-sm text-destructive">
                    {errors.interest_rate.message}
                  </p>
                )}
              </div>
            </div>

            {/* Interest Type + Term */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Interest Type *</Label>
                <Select
                  defaultValue="flat"
                  onValueChange={(val) => {
                    if (val)
                      setValue(
                        "interest_type",
                        val as "flat" | "diminishing",
                        { shouldValidate: true }
                      );
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {interestTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="term_months">Term (Months) *</Label>
                <Input
                  id="term_months"
                  type="number"
                  min={1}
                  max={120}
                  placeholder="12"
                  {...register("term_months", { valueAsNumber: true })}
                />
                {errors.term_months && (
                  <p className="text-sm text-destructive">
                    {errors.term_months.message}
                  </p>
                )}
              </div>
            </div>

            {/* Frequency + Start Date */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Payment Frequency *</Label>
                <Select
                  defaultValue="monthly"
                  onValueChange={(val) => {
                    if (val)
                      setValue(
                        "payment_frequency",
                        val as "weekly" | "bi-weekly" | "monthly",
                        { shouldValidate: true }
                      );
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencies.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="start_date"
                    type="date"
                    className="pl-9"
                    {...register("start_date")}
                  />
                </div>
                {errors.start_date && (
                  <p className="text-sm text-destructive">
                    {errors.start_date.message}
                  </p>
                )}
              </div>
            </div>

            {/* Purpose */}
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose</Label>
              <Input
                id="purpose"
                placeholder="e.g. Business expansion"
                {...register("purpose")}
              />
            </div>

            {/* Notes */}
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
                render={<Link href="/loans" />}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2Icon className="size-4 animate-spin" />
                )}
                {isSubmitting ? "Creating..." : "Create Loan"}
              </Button>
            </div>
          </form>
        </div>

        {/* Live Summary Card */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUpIcon className="size-4" />
                Loan Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {summary ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Monthly Payment
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(summary.monthlyPayment)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Total Interest
                    </span>
                    <span className="font-medium text-amber-600">
                      {formatCurrency(summary.totalInterest)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Total Payable
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(summary.totalPayable)}
                    </span>
                  </div>
                  {endDate && (
                    <div className="flex items-center justify-between border-t pt-3">
                      <span className="text-sm text-muted-foreground">
                        End Date
                      </span>
                      <span className="font-medium">
                        {endDate.toLocaleDateString("en-PH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Fill in principal, rate, and term to see a live summary.
                </p>
              )}
            </CardContent>
          </Card>

          {selectedBorrower && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Borrower</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-medium">
                  {selectedBorrower.first_name} {selectedBorrower.last_name}
                </p>
                <p className="text-muted-foreground">
                  {selectedBorrower.phone}
                </p>
                {selectedBorrower.email && (
                  <p className="text-muted-foreground">
                    {selectedBorrower.email}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
