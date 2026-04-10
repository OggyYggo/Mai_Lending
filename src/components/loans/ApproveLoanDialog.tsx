"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { approveLoan } from "@/lib/actions/loans";
import type { LoanWithBorrower } from "@/types/loan";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CheckCircleIcon, Loader2Icon } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);

interface ApproveLoanDialogProps {
  loan: LoanWithBorrower;
}

export function ApproveLoanDialog({ loan }: ApproveLoanDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const handleApprove = async () => {
    setLoading(true);
    const { error } = await approveLoan(loan.id, startDate);
    if (error) {
      toast.error("Failed to approve loan", { description: error });
    } else {
      toast.success("Loan approved", {
        description: `${loan.loan_number} has been approved.`,
      });
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button size="sm" />}>
        <CheckCircleIcon className="size-4" />
        Approve
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Approve Loan {loan.loan_number}</AlertDialogTitle>
          <AlertDialogDescription>
            Review the loan details and confirm approval.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 rounded-md border bg-muted/50 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Borrower</span>
            <span className="font-medium">
              {loan.borrower.first_name} {loan.borrower.last_name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Principal</span>
            <span className="font-medium">{fmt(Number(loan.principal_amount))}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Interest</span>
            <span className="font-medium">
              {loan.interest_rate}% ({loan.interest_type})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Term</span>
            <span className="font-medium">
              {loan.term_months} months ({loan.payment_frequency})
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="approve-start-date">Start Date</Label>
          <Input
            id="approve-start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleApprove} disabled={loading}>
            {loading && <Loader2Icon className="size-4 animate-spin" />}
            Approve Loan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
