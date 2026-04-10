"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

import { getBorrowers } from "@/lib/actions/borrowers";
import { getLoans } from "@/lib/actions/loans";
import { createClient } from "@/lib/supabase/client";
import type { Borrower } from "@/types/borrower";
import type { LoanWithBorrower } from "@/types/loan";
import type { LoanSchedule } from "@/types/loan";

import { RecordPaymentDialog } from "@/components/payments/RecordPaymentDialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  SearchIcon,
  ArrowLeftIcon,
  CheckIcon,
  UserIcon,
  FileTextIcon,
  BanknoteIcon,
} from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const steps = [
  { label: "Borrower", icon: UserIcon },
  { label: "Loan", icon: FileTextIcon },
  { label: "Payment", icon: BanknoteIcon },
];

export default function RecordPaymentPage() {
  const [step, setStep] = useState(0);
  const stepRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Step 1 state
  const [search, setSearch] = useState("");
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [filteredBorrowers, setFilteredBorrowers] = useState<Borrower[]>([]);
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null);

  // Step 2 state
  const [loans, setLoans] = useState<LoanWithBorrower[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<LoanWithBorrower | null>(null);

  // Step 3 state
  const [schedules, setSchedules] = useState<LoanSchedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // Load borrowers on mount
  useEffect(() => {
    (async () => {
      const { data } = await getBorrowers();
      setBorrowers((data ?? []).filter((b) => b.status === "active"));
    })();
  }, []);

  // Filter borrowers
  useEffect(() => {
    if (!search.trim()) {
      setFilteredBorrowers([]);
      return;
    }
    const q = search.toLowerCase();
    setFilteredBorrowers(
      borrowers.filter((b) => {
        const name = `${b.first_name} ${b.last_name}`.toLowerCase();
        const phone = b.phone?.toLowerCase() ?? "";
        return name.includes(q) || phone.includes(q);
      }).slice(0, 8)
    );
  }, [search, borrowers]);

  // GSAP step indicator
  useEffect(() => {
    const el = stepRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        `[data-step-marker="${step}"]`,
        { scale: 0.8, opacity: 0.5 },
        { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(2)" }
      );
    }, el);
    return () => ctx.revert();
  }, [step]);

  // GSAP content entrance
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.35, ease: "power2.out" }
      );
    }, el);
    return () => ctx.revert();
  }, [step]);

  // Step handlers
  const selectBorrower = async (borrower: Borrower) => {
    setSelectedBorrower(borrower);
    setSearch("");
    setFilteredBorrowers([]);
    setStep(1);

    setLoadingLoans(true);
    const { data } = await getLoans({
      borrowerId: borrower.id,
      status: "active",
    });
    // Also include overdue and approved
    const { data: overdue } = await getLoans({
      borrowerId: borrower.id,
      status: "overdue",
    });
    const { data: approved } = await getLoans({
      borrowerId: borrower.id,
      status: "approved",
    });
    setLoans([...(data ?? []), ...(overdue ?? []), ...(approved ?? [])]);
    setLoadingLoans(false);
  };

  const selectLoan = async (loan: LoanWithBorrower) => {
    setSelectedLoan(loan);
    setStep(2);

    setLoadingSchedules(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("loan_schedules")
      .select("*")
      .eq("loan_id", loan.id)
      .order("installment_number", { ascending: true });
    setSchedules((data ?? []) as LoanSchedule[]);
    setLoadingSchedules(false);
  };

  const goBack = () => {
    if (step === 1) {
      setSelectedBorrower(null);
      setLoans([]);
      setStep(0);
    } else if (step === 2) {
      setSelectedLoan(null);
      setSchedules([]);
      setStep(1);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Record Payment</h1>
        <p className="mt-1 text-muted-foreground">
          Search for a borrower and record a payment against their loan.
        </p>
      </div>

      {/* Step Indicator */}
      <div ref={stepRef} className="flex items-center justify-center gap-2">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isComplete = i < step;
          return (
            <div key={s.label} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={`h-px w-10 sm:w-16 ${
                    isComplete ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
              <div
                data-step-marker={i}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isComplete
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isComplete ? (
                  <CheckIcon className="size-3.5" />
                ) : (
                  <Icon className="size-3.5" />
                )}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Content */}
      <div ref={contentRef}>
        {/* ===== Step 1: Search Borrower ===== */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Search Borrower</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>

              {filteredBorrowers.length > 0 && (
                <div className="rounded-md border">
                  {filteredBorrowers.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => selectBorrower(b)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50 [&:not(:last-child)]:border-b"
                    >
                      <div>
                        <p className="font-medium">
                          {b.first_name} {b.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {b.phone}
                          {b.email ? ` · ${b.email}` : ""}
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {b.status}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}

              {search.trim() && filteredBorrowers.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No borrowers found matching &quot;{search}&quot;
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ===== Step 2: Select Loan ===== */}
        {step === 1 && selectedBorrower && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ArrowLeftIcon className="size-4" />
              Back to Search
            </Button>

            <Card>
              <CardHeader>
                <CardTitle>
                  Loans for {selectedBorrower.first_name}{" "}
                  {selectedBorrower.last_name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingLoans ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Loading loans...
                  </p>
                ) : loans.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No active loans found for this borrower.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {loans.map((loan) => {
                      const isOverdue = loan.status === "overdue";
                      return (
                        <button
                          key={loan.id}
                          type="button"
                          onClick={() => selectLoan(loan)}
                          className={`rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 ${
                            isOverdue ? "border-red-300 dark:border-red-800" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">
                              {loan.loan_number}
                            </span>
                            <Badge
                              variant="outline"
                              className={
                                isOverdue
                                  ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400"
                                  : loan.status === "approved"
                                    ? "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
                                    : "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400"
                              }
                            >
                              {loan.status}
                            </Badge>
                          </div>
                          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                            <p>
                              Principal:{" "}
                              <span className="text-foreground">
                                {fmt(Number(loan.principal_amount))}
                              </span>
                            </p>
                            <p>
                              Rate: {loan.interest_rate}% ({loan.interest_type}) ·{" "}
                              {loan.term_months}mo
                            </p>
                            {loan.end_date && (
                              <p>Due: {fmtDate(loan.end_date)}</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ===== Step 3: Select Installment ===== */}
        {step === 2 && selectedBorrower && selectedLoan && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ArrowLeftIcon className="size-4" />
              Back to Loans
            </Button>

            <Card>
              <CardHeader>
                <CardTitle>
                  Schedule — {selectedLoan.loan_number}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingSchedules ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Loading schedule...
                  </p>
                ) : schedules.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No schedule found for this loan.
                  </p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Paid</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schedules.map((s) => {
                          const balance =
                            Number(s.total_amount) - Number(s.paid_amount);
                          const isOverdue = s.status === "overdue";
                          const isPaid = s.status === "paid";
                          const canPay = !isPaid && balance > 0;

                          return (
                            <TableRow
                              key={s.id}
                              className={
                                isOverdue
                                  ? "bg-red-50 dark:bg-red-950/20"
                                  : ""
                              }
                            >
                              <TableCell className="font-medium">
                                {s.installment_number}
                              </TableCell>
                              <TableCell>{fmtDate(s.due_date)}</TableCell>
                              <TableCell>{fmt(Number(s.total_amount))}</TableCell>
                              <TableCell>{fmt(Number(s.paid_amount))}</TableCell>
                              <TableCell className="font-medium">
                                {fmt(balance)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    isOverdue
                                      ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400"
                                      : isPaid
                                        ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400"
                                        : s.status === "partial"
                                          ? "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
                                          : "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
                                  }
                                >
                                  {s.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {canPay && (
                                  <RecordPaymentDialog
                                    loanId={selectedLoan.id}
                                    loanScheduleId={s.id}
                                    borrowerId={selectedBorrower.id}
                                    dueAmount={balance}
                                    installmentNumber={s.installment_number}
                                    borrowerName={`${selectedBorrower.first_name} ${selectedBorrower.last_name}`}
                                    loanNumber={selectedLoan.loan_number}
                                  />
                                )}
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
          </div>
        )}
      </div>
    </div>
  );
}
