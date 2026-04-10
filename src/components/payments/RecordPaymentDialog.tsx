"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  RecordPaymentSchema,
  type RecordPaymentFormValues,
} from "@/validations/payment";
import { recordPayment } from "@/lib/actions/payments";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BanknoteIcon, Loader2Icon } from "lucide-react";

const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "gcash", label: "GCash" },
  { value: "maya", label: "Maya" },
  { value: "check", label: "Check" },
  { value: "other", label: "Other" },
] as const;

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);

interface RecordPaymentDialogProps {
  loanId: string;
  loanScheduleId: string;
  borrowerId: string;
  dueAmount: number;
  installmentNumber: number;
  borrowerName: string;
  loanNumber: string;
}

export function RecordPaymentDialog({
  loanId,
  loanScheduleId,
  borrowerId,
  dueAmount,
  installmentNumber,
  borrowerName,
  loanNumber,
}: RecordPaymentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<RecordPaymentFormValues>({
    resolver: zodResolver(RecordPaymentSchema),
    defaultValues: {
      loan_id: loanId,
      loan_schedule_id: loanScheduleId,
      borrower_id: borrowerId,
      amount: dueAmount,
      payment_date: new Date().toISOString().split("T")[0],
      payment_method: "cash",
      reference_number: "",
      notes: "",
    },
  });

  const watchMethod = watch("payment_method");
  const showReference = watchMethod !== "cash";

  const onSubmit = async (values: RecordPaymentFormValues) => {
    setIsSubmitting(true);
    try {
      const { error } = await recordPayment({
        ...values,
        amount: Number(values.amount),
        reference_number: values.reference_number || null,
        notes: values.notes || null,
      });

      if (error) {
        toast.error("Payment failed", { description: error });
        return;
      }

      toast.success(`Payment of ${fmt(Number(values.amount))} recorded successfully`);
      setOpen(false);
      reset();
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) reset();
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <BanknoteIcon className="size-3" />
        Pay
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a payment for this installment.
          </DialogDescription>
        </DialogHeader>

        {/* Summary bar */}
        <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/50 p-3 text-sm">
          <div>
            <p className="text-muted-foreground">Borrower</p>
            <p className="font-medium">{borrowerName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Loan</p>
            <p className="font-medium">{loanNumber}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Installment</p>
            <p className="font-medium">#{installmentNumber}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Amount Due</p>
            <p className="text-lg font-bold">{fmt(dueAmount)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Hidden fields */}
          <input type="hidden" {...register("loan_id")} />
          <input type="hidden" {...register("loan_schedule_id")} />
          <input type="hidden" {...register("borrower_id")} />

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="pay-amount">Amount *</Label>
            <div className="relative">
              <BanknoteIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="pay-amount"
                type="number"
                step="0.01"
                className="pl-9"
                {...register("amount", { valueAsNumber: true })}
              />
            </div>
            {errors.amount && (
              <p className="text-sm text-destructive">
                {errors.amount.message}
              </p>
            )}
          </div>

          {/* Date + Method */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pay-date">Payment Date *</Label>
              <Input
                id="pay-date"
                type="date"
                {...register("payment_date")}
              />
              {errors.payment_date && (
                <p className="text-sm text-destructive">
                  {errors.payment_date.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Payment Method *</Label>
              <Select
                defaultValue="cash"
                onValueChange={(val) => {
                  if (val)
                    setValue(
                      "payment_method",
                      val as RecordPaymentFormValues["payment_method"],
                      { shouldValidate: true }
                    );
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reference Number — only for non-cash */}
          {showReference && (
            <div className="space-y-2">
              <Label htmlFor="pay-ref">Reference Number</Label>
              <Input
                id="pay-ref"
                placeholder="e.g. TXN-123456"
                {...register("reference_number")}
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="pay-notes">Notes</Label>
            <Textarea
              id="pay-notes"
              rows={2}
              placeholder="Optional notes..."
              {...register("notes")}
            />
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2Icon className="size-4 animate-spin" />
              )}
              {isSubmitting ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
