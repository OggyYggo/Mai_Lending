"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import {
  FileSpreadsheetIcon,
  FileTextIcon,
  UsersIcon,
  BanknoteIcon,
  CreditCardIcon,
  ClockIcon,
} from "lucide-react";

import { getLoanReport } from "@/lib/actions/reports";
import type { LoanReportRow } from "@/lib/actions/reports";
import { exportToExcel, exportToPDF, formatCurrency } from "@/lib/export-utils";
import { animateCountUp } from "@/lib/gsap-utils";

import {
  ReportFilterBar,
  ReportTableSkeleton,
  type ReportFilters,
} from "@/components/reports/ReportFilterBar";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Progress,
  ProgressTrack,
  ProgressIndicator,
} from "@/components/ui/progress";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

// ---------- helpers ----------

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400" },
  approved: { label: "Approved", className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400" },
  active: { label: "Active", className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400" },
  overdue: { label: "Overdue", className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400" },
  completed: { label: "Completed", className: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400" },
  rejected: { label: "Rejected", className: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400" },
};

// ---------- columns ----------

function ProgressCell({ row }: { row: LoanReportRow }) {
  const pct =
    row.principal_amount > 0
      ? Math.min(100, Math.round((row.total_paid / row.principal_amount) * 100))
      : 0;

  const colorClass =
    pct >= 80
      ? "[&_[data-slot=progress-indicator]]:bg-green-500"
      : pct >= 40
        ? "[&_[data-slot=progress-indicator]]:bg-amber-500"
        : "[&_[data-slot=progress-indicator]]:bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <Progress value={pct} className={`w-20 ${colorClass}`}>
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      </Progress>
      <span className="text-xs text-muted-foreground">{pct}%</span>
    </div>
  );
}

const columns: ColumnDef<LoanReportRow>[] = [
  {
    accessorKey: "loan_number",
    header: "Loan #",
    cell: ({ row }) => (
      <Link
        href={`/loans/${row.original.id}`}
        className="font-medium hover:underline"
      >
        {row.original.loan_number}
      </Link>
    ),
  },
  {
    accessorKey: "borrower_name",
    header: "Borrower",
  },
  {
    accessorKey: "principal_amount",
    header: "Principal",
    cell: ({ row }) => formatCurrency(row.original.principal_amount),
  },
  {
    accessorKey: "interest_rate",
    header: "Rate",
    cell: ({ row }) => `${row.original.interest_rate}%`,
  },
  {
    accessorKey: "term_months",
    header: "Term",
    cell: ({ row }) => `${row.original.term_months}mo`,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const cfg = statusConfig[row.original.status] ?? statusConfig.pending;
      return (
        <Badge variant="outline" className={cfg.className}>
          {cfg.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: "start_date",
    header: "Start",
    cell: ({ row }) => fmtDate(row.original.start_date),
  },
  {
    accessorKey: "end_date",
    header: "End",
    cell: ({ row }) => fmtDate(row.original.end_date),
  },
  {
    accessorKey: "total_paid",
    header: "Paid",
    cell: ({ row }) => (
      <span className="text-green-600">{formatCurrency(row.original.total_paid)}</span>
    ),
  },
  {
    accessorKey: "outstanding",
    header: "Outstanding",
    cell: ({ row }) => (
      <span className={row.original.outstanding > 0 ? "text-red-600 font-medium" : "text-green-600"}>
        {formatCurrency(Math.max(0, row.original.outstanding))}
      </span>
    ),
  },
  {
    id: "progress",
    header: "Progress",
    cell: ({ row }) => <ProgressCell row={row.original} />,
  },
];

// ---------- KPI Card ----------

interface KPIProps {
  title: string;
  icon: React.ElementType;
  color: string;
}

function MiniKPI({
  title,
  icon: Icon,
  color,
  valueRef,
}: KPIProps & { valueRef: (el: HTMLSpanElement | null) => void }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-full p-2 ${color}`}>
          <Icon className="size-4" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-lg font-bold">
            <span ref={valueRef}>0</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Page ----------

export default function LoanReportPage() {
  const [data, setData] = useState<LoanReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const totalLoansRef = useRef<HTMLSpanElement | null>(null);
  const totalPrincipalRef = useRef<HTMLSpanElement | null>(null);
  const totalCollectedRef = useRef<HTMLSpanElement | null>(null);
  const totalOutstandingRef = useRef<HTMLSpanElement | null>(null);

  const animateKPIs = useCallback((rows: LoanReportRow[]) => {
    const totalPrincipal = rows.reduce((s, r) => s + r.principal_amount, 0);
    const totalCollected = rows.reduce((s, r) => s + r.total_paid, 0);
    const totalOutstanding = rows.reduce(
      (s, r) => s + Math.max(0, r.outstanding),
      0
    );

    if (totalLoansRef.current)
      animateCountUp(totalLoansRef.current, rows.length, 1.2);
    if (totalPrincipalRef.current)
      animateCountUp(totalPrincipalRef.current, totalPrincipal, 1.4, "₱");
    if (totalCollectedRef.current)
      animateCountUp(totalCollectedRef.current, totalCollected, 1.4, "₱");
    if (totalOutstandingRef.current)
      animateCountUp(
        totalOutstandingRef.current,
        totalOutstanding,
        1.4,
        "₱"
      );
  }, []);

  const fetchData = useCallback(
    async (filters?: ReportFilters) => {
      setLoading(true);
      const { data: result } = await getLoanReport({
        status: filters?.status,
        dateFrom: filters?.dateFrom || undefined,
        dateTo: filters?.dateTo || undefined,
      });
      const rows = result ?? [];
      setData(rows);
      setLoading(false);
      animateKPIs(rows);
    },
    [animateKPIs]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilter = (filters: ReportFilters) => {
    fetchData(filters);
  };

  const handleExportExcel = () => {
    exportToExcel(
      data.map((r) => ({
        "Loan #": r.loan_number,
        Borrower: r.borrower_name,
        Principal: r.principal_amount,
        "Interest Rate": `${r.interest_rate}%`,
        Term: `${r.term_months}mo`,
        Status: r.status,
        "Start Date": r.start_date ?? "",
        "End Date": r.end_date ?? "",
        "Total Paid": r.total_paid,
        Outstanding: Math.max(0, r.outstanding),
      })),
      "Loan_Report",
      "Loans"
    );
  };

  const handleExportPDF = () => {
    exportToPDF({
      title: "Loan Report",
      subtitle: `${data.length} loans`,
      columns: [
        { header: "Loan #", dataKey: "loan_number" },
        { header: "Borrower", dataKey: "borrower_name" },
        { header: "Principal", dataKey: "principal_amount" },
        { header: "Rate", dataKey: "interest_rate" },
        { header: "Term", dataKey: "term_months" },
        { header: "Status", dataKey: "status" },
        { header: "Total Paid", dataKey: "total_paid" },
        { header: "Outstanding", dataKey: "outstanding" },
      ],
      data: data.map((r) => ({
        ...r,
        interest_rate: `${r.interest_rate}%`,
        term_months: `${r.term_months}mo`,
        outstanding: Math.max(0, r.outstanding),
      })),
      filename: "Loan_Report",
      totalsRow: {
        principal_amount: data.reduce((s, r) => s + r.principal_amount, 0),
        total_paid: data.reduce((s, r) => s + r.total_paid, 0),
        outstanding: data.reduce(
          (s, r) => s + Math.max(0, r.outstanding),
          0
        ),
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Loan Report</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of all loans with payment progress.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportExcel}
            disabled={data.length === 0}
          >
            <FileSpreadsheetIcon className="size-4" />
            Export Excel
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportPDF}
            disabled={data.length === 0}
          >
            <FileTextIcon className="size-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniKPI
          title="Total Loans"
          icon={UsersIcon}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
          valueRef={(el) => {
            totalLoansRef.current = el;
          }}
        />
        <MiniKPI
          title="Total Principal"
          icon={BanknoteIcon}
          color="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
          valueRef={(el) => {
            totalPrincipalRef.current = el;
          }}
        />
        <MiniKPI
          title="Total Collected"
          icon={CreditCardIcon}
          color="bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400"
          valueRef={(el) => {
            totalCollectedRef.current = el;
          }}
        />
        <MiniKPI
          title="Total Outstanding"
          icon={ClockIcon}
          color="bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
          valueRef={(el) => {
            totalOutstandingRef.current = el;
          }}
        />
      </div>

      {/* Filters */}
      <ReportFilterBar
        onFilter={handleFilter}
        filters={{
          showDateRange: true,
          showStatus: true,
          showBorrower: true,
        }}
        isLoading={loading}
      />

      {/* Table */}
      {loading ? <ReportTableSkeleton /> : <DataTable columns={columns} data={data} />}
    </div>
  );
}
