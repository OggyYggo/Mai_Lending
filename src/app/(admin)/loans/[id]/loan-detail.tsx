"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import gsap from "gsap";
import { toast } from "sonner";

import { activateLoan } from "@/lib/actions/loans";
import { deletePayment } from "@/lib/actions/payments";
import type { LoanWithBorrower, LoanSchedule, LoanStatus } from "@/types/loan";

import { ApproveLoanDialog } from "@/components/loans/ApproveLoanDialog";
import { RejectLoanDialog } from "@/components/loans/RejectLoanDialog";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  PlayIcon,
  Loader2Icon,
  BanknoteIcon,
  Trash2Icon,
} from "lucide-react";

// ---------- helpers ----------

const statusConfig: Record<LoanStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400" },
  approved: { label: "Approved", className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400" },
  active: { label: "Active", className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400" },
  overdue: { label: "Overdue", className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400" },
  completed: { label: "Completed", className: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400" },
  rejected: { label: "Rejected", className: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400" },
};

const scheduleStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400" },
  paid: { label: "Paid", className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400" },
  partial: { label: "Partial", className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400" },
  overdue: { label: "Overdue", className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400" },
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
};

// ---------- types ----------

interface LoanDetailProps {
  loan: LoanWithBorrower & { schedules: LoanSchedule[] };
  payments: { id: string; amount: number; payment_date: string; payment_method: string; reference_number: string | null; notes: string | null; created_at: string }[];
}

export function LoanDetail({ loan, payments }: LoanDetailProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<string | null>(null);

  // GSAP stagger
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-section]",
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.1, ease: "power3.out" }
      );
    }, el);
    return () => ctx.revert();
  }, []);

  // Computed
  const totalPayable = loan.schedules.reduce((s, r) => s + Number(r.total_amount), 0);
  const totalInterest = loan.schedules.reduce((s, r) => s + Number(r.interest_amount), 0);
  const amountPaid = loan.schedules.reduce((s, r) => s + Number(r.paid_amount), 0);
  const outstanding = totalPayable - amountPaid;
  const nextDue = loan.schedules.find(
    (s) => s.status === "pending" || s.status === "overdue"
  );
  const cfg = statusConfig[loan.status];

  // Actions
  const handleActivate = async () => {
    setLoading("activate");
    const { error } = await activateLoan(loan.id);
    if (error) {
      toast.error("Failed to activate", { description: error });
    } else {
      toast.success("Loan activated");
      router.refresh();
    }
    setLoading(null);
  };

  return (
    <div ref={containerRef} className="space-y-6">
      {/* ========== 1. Header ========== */}
      <Card data-section>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <CardTitle className="text-2xl">{loan.loan_number}</CardTitle>
              <Badge variant="outline" className={cfg.className}>
                {cfg.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Borrower:{" "}
              <Link
                href={`/borrowers/${loan.borrower_id}`}
                className="font-medium text-foreground hover:underline"
              >
                {loan.borrower.first_name} {loan.borrower.last_name}
              </Link>
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {loan.status === "pending" && (
              <>
                <ApproveLoanDialog loan={loan} />
                <RejectLoanDialog loanId={loan.id} loanNumber={loan.loan_number} />
              </>
            )}

            {loan.status === "approved" && (
              <AlertDialog>
                <AlertDialogTrigger render={<Button size="sm" />}>
                  <PlayIcon className="size-4" />
                  Mark as Active
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Activate Loan</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark the loan as active, indicating funds have been disbursed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleActivate} disabled={loading === "activate"}>
                      {loading === "activate" && <Loader2Icon className="size-4 animate-spin" />}
                      Activate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Principal</p>
              <p className="text-lg font-semibold">{fmt(Number(loan.principal_amount))}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Interest Rate</p>
              <p className="text-lg font-semibold">{loan.interest_rate}% ({loan.interest_type})</p>
            </div>
            <div>
              <p className="text-muted-foreground">Term</p>
              <p className="text-lg font-semibold">{loan.term_months} months ({loan.payment_frequency})</p>
            </div>
            <div>
              <p className="text-muted-foreground">Purpose</p>
              <p className="text-lg font-semibold">{loan.purpose || "—"}</p>
            </div>
          </div>
          {loan.rejection_reason && (
            <div className="mt-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <strong>Rejection Reason:</strong> {loan.rejection_reason}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========== 2. Summary ========== */}
      <Card data-section>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Loan Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <p className="text-muted-foreground">Total Payable</p>
              <p className="text-lg font-semibold">{fmt(totalPayable)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Interest</p>
              <p className="text-lg font-semibold text-amber-600">{fmt(totalInterest)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Amount Paid</p>
              <p className="text-lg font-semibold text-green-600">{fmt(amountPaid)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Outstanding</p>
              <p className="text-lg font-semibold text-red-600">{fmt(outstanding)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Next Due Date</p>
              <p className="text-lg font-semibold">
                {nextDue ? fmtDate(nextDue.due_date) : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========== 3. Payment Schedule ========== */}
      <Card data-section>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Payment Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loan.schedules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      No schedule generated yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  loan.schedules.map((s) => {
                    const sc = scheduleStatusConfig[s.status] ?? scheduleStatusConfig.pending;
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.installment_number}</TableCell>
                        <TableCell>{fmtDate(s.due_date)}</TableCell>
                        <TableCell>{fmt(Number(s.principal_amount))}</TableCell>
                        <TableCell>{fmt(Number(s.interest_amount))}</TableCell>
                        <TableCell className="font-medium">{fmt(Number(s.total_amount))}</TableCell>
                        <TableCell>{fmt(Number(s.paid_amount))}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={sc.className}>
                            {sc.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(s.status === "pending" || s.status === "overdue" || s.status === "partial") && (
                            <Button
                              size="sm"
                              variant="outline"
                              render={
                                <Link
                                  href={`/payments/new?loanId=${loan.id}&scheduleId=${s.id}&amount=${Number(s.total_amount) - Number(s.paid_amount)}`}
                                />
                              }
                            >
                              <BanknoteIcon className="size-3" />
                              Pay
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ========== 4. Payment History ========== */}
      <PaymentHistorySection
        payments={payments}
        totalPayable={totalPayable}
        loanId={loan.id}
      />
    </div>
  );
}

// ---------- Payment History Sub-component ----------

const methodBadgeConfig: Record<string, { label: string; className: string }> = {
  cash: { label: "Cash", className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400" },
  bank_transfer: { label: "Bank Transfer", className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400" },
  gcash: { label: "GCash", className: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400" },
  maya: { label: "Maya", className: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400" },
  check: { label: "Check", className: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400" },
  other: { label: "Other", className: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400" },
};

function PaymentHistorySection({
  payments,
  totalPayable,
  loanId,
}: {
  payments: LoanDetailProps["payments"];
  totalPayable: number;
  loanId: string;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await deletePayment(id);
    if (error) {
      toast.error("Failed to delete payment", { description: error });
    } else {
      toast.success("Payment deleted and schedule reversed");
      router.refresh();
    }
    setDeletingId(null);
  };

  // Build running balance (payments are ordered asc by date)
  let cumulative = 0;
  const rows = payments.map((p) => {
    cumulative += Number(p.amount);
    return { ...p, runningBalance: totalPayable - cumulative };
  });
  // Reverse for display (newest first)
  const displayRows = [...rows].reverse();

  return (
    <Card data-section>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Payment History</CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <BanknoteIcon className="size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No payments recorded yet.
            </p>
            <Button
              size="sm"
              render={<Link href={`/payments/record`} />}
            >
              Record First Payment
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Recorded</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRows.map((p) => {
                  const mc = methodBadgeConfig[p.payment_method] ?? methodBadgeConfig.other;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{fmtDate(p.payment_date)}</TableCell>
                      <TableCell className="font-semibold">
                        {fmt(Number(p.amount))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={mc.className}>
                          {mc.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{p.reference_number || "\u2014"}</TableCell>
                      <TableCell
                        className={`font-medium ${
                          p.runningBalance > 0
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {fmt(Math.max(0, p.runningBalance))}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtDate(p.created_at)}
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                className="text-destructive"
                              />
                            }
                          >
                            <Trash2Icon className="size-4" />
                            <span className="sr-only">Delete</span>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Payment</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will delete the {fmt(Number(p.amount))} payment and
                                reverse the schedule update. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(p.id)}
                                disabled={deletingId === p.id}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {deletingId === p.id && (
                                  <Loader2Icon className="size-4 animate-spin" />
                                )}
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
