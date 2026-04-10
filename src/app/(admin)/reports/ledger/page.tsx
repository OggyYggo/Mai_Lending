"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import {
  SearchIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarIcon,
  ChevronDownIcon,
  FileTextIcon,
} from "lucide-react";

import { getBorrowers } from "@/lib/actions/borrowers";
import {
  getBorrowerLedger,
  type BorrowerLedger,
  type BorrowerLedgerLoan,
} from "@/lib/actions/reports";
import { exportToPDF, formatCurrency, formatReportDate } from "@/lib/export-utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { Borrower } from "@/types/borrower";

// ---------- helpers ----------

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400" },
  approved: { label: "Approved", className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400" },
  active: { label: "Active", className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400" },
  overdue: { label: "Overdue", className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400" },
  completed: { label: "Completed", className: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400" },
  rejected: { label: "Rejected", className: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400" },
};

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// ---------- Loan Section ----------

function LoanSection({ loan, index }: { loan: BorrowerLedgerLoan; index: number }) {
  const cfg = statusConfig[loan.status] ?? statusConfig.pending;

  // Running balance per payment
  let cumulative = 0;
  const paymentsWithBalance = loan.payments.map((p) => {
    cumulative += p.amount;
    return { ...p, balance: loan.principal_amount - cumulative };
  });

  return (
    <Collapsible defaultOpen={index === 0} data-ledger-section>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-muted/30 px-4 py-3 text-left hover:bg-muted/50 transition-colors">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm font-semibold">
            {loan.loan_number}
          </span>
          <Badge variant="outline" className={cfg.className}>
            {cfg.label}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {formatCurrency(loan.principal_amount)}
          </span>
          <span className="text-xs text-muted-foreground">
            {loan.term_months}mo &middot; {loan.interest_rate}%
          </span>
          {loan.start_date && (
            <span className="text-xs text-muted-foreground">
              Started {fmtDate(loan.start_date)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-sm">
            <span className="text-muted-foreground">Paid </span>
            <span className="font-semibold text-green-600">
              {formatCurrency(loan.total_paid)}
            </span>
            <span className="text-muted-foreground"> / </span>
            <span className="font-medium">
              {formatCurrency(loan.principal_amount)}
            </span>
          </div>
          <ChevronDownIcon className="size-4 text-muted-foreground transition-transform [[data-panel-open]_&]:rotate-180" />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2 space-y-3 pl-2">
        {/* Payments table */}
        {loan.payments.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentsWithBalance.map((p, i) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-muted-foreground text-xs">
                      {i + 1}
                    </TableCell>
                    <TableCell>{fmtDate(p.payment_date)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {p.payment_method.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {p.reference_number || "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {formatCurrency(p.amount)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        p.balance > 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {formatCurrency(Math.max(0, p.balance))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No payments recorded for this loan.
          </p>
        )}

        {/* Loan subtotal */}
        <div className="flex items-center justify-end gap-4 rounded-md bg-muted/40 px-4 py-2 text-sm">
          <span className="text-muted-foreground">Outstanding:</span>
          <span
            className={`font-bold ${
              loan.running_balance > 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            {formatCurrency(Math.max(0, loan.running_balance))}
          </span>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ---------- Page ----------

export default function LedgerReportPage() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Borrower[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [ledger, setLedger] = useState<BorrowerLedger | null>(null);
  const [loading, setLoading] = useState(false);

  const ledgerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (search.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await getBorrowers(search);
      setResults(data ?? []);
      setShowDropdown(true);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectBorrower = useCallback(async (borrower: Borrower) => {
    setSearch(`${borrower.first_name} ${borrower.last_name}`);
    setShowDropdown(false);
    setLoading(true);
    const { data } = await getBorrowerLedger(borrower.id);
    setLedger(data ?? null);
    setLoading(false);

    // Animate
    requestAnimationFrame(() => {
      if (!ledgerRef.current) return;
      gsap.context(() => {
        gsap.fromTo(
          "[data-ledger-section]",
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.1,
            ease: "power3.out",
          }
        );
      }, ledgerRef.current);
    });
  }, []);

  const handleExportPDF = () => {
    if (!ledger) return;
    const b = ledger.borrower;
    const allPayments = ledger.loans.flatMap((loan) =>
      loan.payments.map((p) => ({
        loan_number: loan.loan_number,
        payment_date: p.payment_date,
        payment_method: p.payment_method.replace("_", " "),
        reference_number: p.reference_number ?? "—",
        amount: p.amount,
      }))
    );

    exportToPDF({
      title: `Borrower Ledger — ${b.first_name} ${b.last_name}`,
      subtitle: `Phone: ${b.phone ?? "—"} | Address: ${b.address ?? "—"} | Member since ${formatReportDate(ledger.borrower.id)}`,
      columns: [
        { header: "Loan #", dataKey: "loan_number" },
        { header: "Date", dataKey: "payment_date" },
        { header: "Method", dataKey: "payment_method" },
        { header: "Reference", dataKey: "reference_number" },
        { header: "Amount", dataKey: "amount" },
      ],
      data: allPayments,
      filename: `Ledger_${b.first_name}_${b.last_name}`,
      totalsRow: {
        amount: ledger.totalPaid,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Borrower Ledger</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete transaction history per borrower.
          </p>
        </div>
        {ledger && (
          <Button size="sm" variant="outline" onClick={handleExportPDF}>
            <FileTextIcon className="size-4" />
            Export Ledger PDF
          </Button>
        )}
      </div>

      {/* Borrower Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative" ref={dropdownRef}>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search borrower by name or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {showDropdown && results.length > 0 && (
              <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg">
                {results.slice(0, 8).map((b) => (
                  <button
                    key={b.id}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg"
                    onClick={() => selectBorrower(b)}
                  >
                    <div className="rounded-full bg-muted p-1.5">
                      <UserIcon className="size-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {b.first_name} {b.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {b.phone}
                        {b.address && ` · ${b.address}`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {showDropdown && search.length >= 2 && results.length === 0 && (
              <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover p-4 text-center text-sm text-muted-foreground shadow-lg">
                No borrowers found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-md bg-muted/60"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      )}

      {/* Ledger */}
      {ledger && !loading && (
        <div ref={ledgerRef} className="space-y-6">
          {/* Borrower Header */}
          <Card data-ledger-section>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <h2 className="text-xl font-bold">
                    {ledger.borrower.first_name} {ledger.borrower.last_name}
                  </h2>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                    {ledger.borrower.phone && (
                      <span className="flex items-center gap-1.5">
                        <PhoneIcon className="size-3.5" />
                        {ledger.borrower.phone}
                      </span>
                    )}
                    {ledger.borrower.address && (
                      <span className="flex items-center gap-1.5">
                        <MapPinIcon className="size-3.5" />
                        {ledger.borrower.address}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <CalendarIcon className="size-3.5" />
                      Member since — 
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Loans</p>
                    <p className="text-lg font-bold">{ledger.loans.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Paid</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(ledger.totalPaid)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                    <p
                      className={`text-lg font-bold ${
                        ledger.totalOutstanding > 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {formatCurrency(Math.max(0, ledger.totalOutstanding))}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loan Sections */}
          {ledger.loans.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12">
                <p className="text-sm text-muted-foreground">
                  No loans found for this borrower.
                </p>
              </CardContent>
            </Card>
          ) : (
            ledger.loans.map((loan, i) => (
              <LoanSection key={loan.id} loan={loan} index={i} />
            ))
          )}

          {/* Grand Total */}
          {ledger.loans.length > 0 && (
            <Card data-ledger-section className="border-2">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <h3 className="text-base font-bold">Grand Total</h3>
                <div className="flex flex-wrap gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Disbursed: </span>
                    <span className="font-bold">
                      {formatCurrency(ledger.totalDisbursed)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Paid: </span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(ledger.totalPaid)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Outstanding: </span>
                    <span
                      className={`font-bold ${
                        ledger.totalOutstanding > 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {formatCurrency(Math.max(0, ledger.totalOutstanding))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
