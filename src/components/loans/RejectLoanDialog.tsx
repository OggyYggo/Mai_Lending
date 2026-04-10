"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { rejectLoan } from "@/lib/actions/loans";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { XCircleIcon, Loader2Icon } from "lucide-react";

interface RejectLoanDialogProps {
  loanId: string;
  loanNumber: string;
}

export function RejectLoanDialog({ loanId, loanNumber }: RejectLoanDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");

  const isValid = reason.trim().length >= 10;

  const handleReject = async () => {
    if (!isValid) {
      toast.error("Reason must be at least 10 characters");
      return;
    }
    setLoading(true);
    const { error } = await rejectLoan(loanId, reason.trim());
    if (error) {
      toast.error("Failed to reject loan", { description: error });
    } else {
      toast.success("Loan rejected", {
        description: `${loanNumber} has been rejected.`,
      });
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button size="sm" variant="destructive" />}>
        <XCircleIcon className="size-4" />
        Reject
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject Loan {loanNumber}</AlertDialogTitle>
          <AlertDialogDescription>
            Provide a reason for rejecting this loan application.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="reject-reason">
            Rejection Reason *{" "}
            <span className="text-xs text-muted-foreground">
              ({reason.trim().length}/10 min)
            </span>
          </Label>
          <Textarea
            id="reject-reason"
            rows={3}
            placeholder="Explain why this loan is being rejected..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          {reason.length > 0 && !isValid && (
            <p className="text-sm text-destructive">
              Reason must be at least 10 characters
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReject}
            disabled={loading || !isValid}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && <Loader2Icon className="size-4 animate-spin" />}
            Reject Loan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
