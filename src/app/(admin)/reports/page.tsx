"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import Link from "next/link";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  BarChart2Icon,
  BookOpenIcon,
  CreditCardIcon,
  DownloadIcon,
  FileTextIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  getAgingReport,
  getBorrowerLedger,
  getCollectionReport,
  getLoanReport,
  getMonthlySummaryReport,
  getOverdueReport,
} from "@/lib/actions/reports";
import { getBorrowers } from "@/lib/actions/borrowers";
import { exportToExcel } from "@/lib/export-utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ReportCard = {
  title: string;
  href: string;
  description: string;
  icon: React.ElementType;
  iconClassName: string;
};

const REPORT_CARDS: ReportCard[] = [
  {
    title: "Loan Report",
    href: "/reports/loans",
    description:
      "View and export all loans with outstanding balances and payment progress",
    icon: FileTextIcon,
    iconClassName:
      "bg-blue-100 text-blue-600 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:ring-blue-900/60",
  },
  {
    title: "Collection Report",
    href: "/reports/collections",
    description:
      "Track all payments collected with method breakdown and date filtering",
    icon: CreditCardIcon,
    iconClassName:
      "bg-green-100 text-green-600 ring-green-200 dark:bg-green-950/40 dark:text-green-400 dark:ring-green-900/60",
  },
  {
    title: "Overdue Report",
    href: "/reports/overdue",
    description:
      "Aging analysis of overdue loans grouped by days past due",
    icon: AlertTriangleIcon,
    iconClassName:
      "bg-red-100 text-red-600 ring-red-200 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-900/60",
  },
  {
    title: "Borrower Ledger",
    href: "/reports/ledger",
    description:
      "Complete loan and payment history for individual borrowers",
    icon: BookOpenIcon,
    iconClassName:
      "bg-purple-100 text-purple-600 ring-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:ring-purple-900/60",
  },
  {
    title: "Monthly Summary",
    href: "/reports/monthly",
    description:
      "Month-by-month performance overview with disbursement and collection trends",
    icon: BarChart2Icon,
    iconClassName:
      "bg-amber-100 text-amber-600 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-900/60",
  },
];

function formatUpdatedTime(date: Date) {
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ReportsPage() {
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [isExporting, setIsExporting] = useState(false);
  const gridRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLastUpdated(new Date());
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!gridRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-report-card]",
        { y: 24, opacity: 0, scale: 0.98 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.55,
          stagger: 0.1,
          ease: "power3.out",
        }
      );
    }, gridRef);

    return () => ctx.revert();
  }, []);

  const updatedLabel = useMemo(
    () => formatUpdatedTime(lastUpdated),
    [lastUpdated]
  );

  const handleGenerateAllReports = async () => {
    setIsExporting(true);

    try {
      const currentYear = new Date().getFullYear();

      const [
        loanResult,
        collectionResult,
        overdueResult,
        agingResult,
        monthlyResult,
        borrowersResult,
      ] = await Promise.all([
        getLoanReport(),
        getCollectionReport(),
        getOverdueReport(),
        getAgingReport(),
        getMonthlySummaryReport(currentYear),
        getBorrowers(),
      ]);

      if (loanResult.error) throw new Error(loanResult.error);
      if (collectionResult.error) throw new Error(collectionResult.error);
      if (overdueResult.error) throw new Error(overdueResult.error);
      if (agingResult.error) throw new Error(agingResult.error);
      if (monthlyResult.error) throw new Error(monthlyResult.error);
      if (borrowersResult.error) throw new Error(borrowersResult.error);

      const loanRows = loanResult.data ?? [];
      const collectionReport = collectionResult.data ?? {
        payments: [],
        subtotals: [],
        grandTotal: 0,
      };
      const overdueRows = overdueResult.data ?? [];
      const agingRows = agingResult.data ?? [];
      const monthlyRows = monthlyResult.data ?? [];
      const borrowers = borrowersResult.data ?? [];

      const ledgerResults = await Promise.all(
        borrowers.map(async (borrower) => {
          const result = await getBorrowerLedger(borrower.id);
          if (result.error) {
            throw new Error(result.error);
          }
          return result.data;
        })
      );

      const ledgerRows = ledgerResults.flatMap((ledger) => {
        if (!ledger) return [];

        const borrowerName = `${ledger.borrower.first_name} ${ledger.borrower.last_name}`;

        return ledger.loans.flatMap((loan) => {
          let runningPaid = 0;

          if (loan.payments.length === 0) {
            return [
              {
                Borrower: borrowerName,
                "Loan #": loan.loan_number,
                Status: loan.status,
                "Loan Start": loan.start_date ?? "",
                "Payment Date": "",
                Method: "",
                Reference: "",
                Amount: 0,
                "Running Balance": loan.running_balance,
              },
            ];
          }

          return loan.payments.map((payment) => {
            runningPaid += payment.amount;

            return {
              Borrower: borrowerName,
              "Loan #": loan.loan_number,
              Status: loan.status,
              "Loan Start": loan.start_date ?? "",
              "Payment Date": payment.payment_date,
              Method: payment.payment_method.replaceAll("_", " "),
              Reference: payment.reference_number ?? "",
              Amount: payment.amount,
              "Running Balance": Math.max(0, loan.principal_amount - runningPaid),
            };
          });
        });
      });

      exportToExcel(
        loanRows.map((row) => ({
          "Loan #": row.loan_number,
          Borrower: row.borrower_name,
          Principal: row.principal_amount,
          "Interest Rate": `${row.interest_rate}%`,
          Term: `${row.term_months}mo`,
          Status: row.status,
          "Start Date": row.start_date ?? "",
          "End Date": row.end_date ?? "",
          "Total Paid": row.total_paid,
          Outstanding: Math.max(0, row.outstanding),
        })),
        "Loan_Report",
        "Loans"
      );

      exportToExcel(
        collectionReport.payments.map((row) => ({
          Date: row.payment_date,
          Borrower: row.borrower_name,
          "Loan #": row.loan_number,
          "Installment #": row.installment_number ?? "",
          Amount: row.amount,
          Method: row.payment_method.replaceAll("_", " "),
          Reference: row.reference_number ?? "",
        })),
        "Collection_Report",
        "Collections"
      );

      exportToExcel(
        overdueRows.map((row) => ({
          Borrower: row.borrower_name,
          Phone: row.borrower_phone ?? "",
          Address: row.borrower_address ?? "",
          "Loan #": row.loan_number,
          "Original Amount": row.principal_amount,
          "Overdue Amount": row.total_overdue_amount,
          "Days Overdue": row.days_overdue,
          "Last Payment": row.last_payment_date ?? "",
        })),
        "Overdue_Report",
        "Overdue"
      );

      exportToExcel(
        ledgerRows,
        "Borrower_Ledger_Report",
        "Ledger"
      );

      exportToExcel(
        monthlyRows.map((row) => ({
          Month: row.month,
          "New Borrowers": row.newBorrowers,
          "New Loans": row.newLoans,
          Disbursed: row.disbursed,
          Collected: row.collected,
          Outstanding: row.outstanding,
          "Overdue Count": row.overdueCount,
        })),
        `Monthly_Report_${currentYear}`,
        "Monthly Summary"
      );

      setLastUpdated(new Date());
      toast.success("All report exports generated", {
        description: `Downloaded 5 Excel files${agingRows.length > 0 ? " with current overdue aging data included in the overdue export run" : ""}.`,
      });
    } catch (error) {
      toast.error("Failed to generate reports", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Open operational and financial reports, then export the datasets you need.
          </p>
        </div>
      </div>

      <Card className="border-border/70 bg-muted/30">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <span className="font-medium text-foreground">
              Last updated: <span className="text-muted-foreground">{updatedLabel}</span>
            </span>
            <span className="hidden text-muted-foreground sm:inline">|</span>
            <span className="font-medium text-foreground">
              Total Reports: <span className="text-muted-foreground">5</span>
            </span>
          </div>
          <Button
            onClick={handleGenerateAllReports}
            disabled={isExporting}
            className="min-w-[190px]"
          >
            <DownloadIcon className="size-4" />
            {isExporting ? "Generating..." : "Generate All Reports"}
          </Button>
        </CardContent>
      </Card>

      <div ref={gridRef} className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
        {REPORT_CARDS.map((report) => {
          const Icon = report.icon;

          return (
            <Link
              key={report.href}
              href={report.href}
              className="group block"
              data-report-card
            >
              <Card className="h-full border-border/70 transition duration-200 hover:scale-[1.02] hover:border-primary/30 hover:shadow-lg">
                <CardContent className="flex h-full min-h-56 flex-col justify-between p-6">
                  <div className="space-y-5">
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={`inline-flex rounded-2xl p-3 ring-1 ${report.iconClassName}`}
                      >
                        <Icon className="size-6" />
                      </div>
                      <ArrowRightIcon className="size-5 translate-x-[-6px] opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold tracking-tight">
                        {report.title}
                      </h2>
                      <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                        {report.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                    Open report
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
