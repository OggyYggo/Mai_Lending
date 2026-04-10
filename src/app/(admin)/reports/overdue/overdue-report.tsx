"use client";

import Link from "next/link";
import {
  AlertTriangleIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  ExternalLinkIcon,
  BellIcon,
} from "lucide-react";
import { toast } from "sonner";

import type { OverdueReportRow, AgingBucket } from "@/lib/actions/reports";
import { exportToExcel, exportToPDF, formatCurrency } from "@/lib/export-utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";

import type { ColumnDef } from "@tanstack/react-table";

// ---------- helpers ----------

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

function getRowClass(days: number) {
  if (days > 90) return "bg-red-100 dark:bg-red-950/30";
  if (days > 60) return "bg-orange-50 dark:bg-orange-950/20";
  if (days > 30) return "bg-amber-50 dark:bg-amber-950/20";
  return "bg-yellow-50 dark:bg-yellow-950/15";
}

function getDaysBadge(days: number) {
  if (days > 90)
    return (
      <Badge variant="destructive" className="text-xs">
        {days}d
      </Badge>
    );
  if (days > 60)
    return (
      <Badge variant="outline" className="border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-400 text-xs">
        {days}d
      </Badge>
    );
  if (days > 30)
    return (
      <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400 text-xs">
        {days}d
      </Badge>
    );
  return (
    <Badge variant="secondary" className="text-xs">
      {days}d
    </Badge>
  );
}

// ---------- columns ----------

const columns: ColumnDef<OverdueReportRow>[] = [
  {
    accessorKey: "borrower_name",
    header: "Borrower",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.borrower_name}</span>
    ),
  },
  {
    accessorKey: "borrower_phone",
    header: "Phone",
    cell: ({ row }) => row.original.borrower_phone || "—",
  },
  {
    accessorKey: "loan_number",
    header: "Loan #",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.loan_number}</span>
    ),
  },
  {
    accessorKey: "principal_amount",
    header: "Original",
    cell: ({ row }) => formatCurrency(row.original.principal_amount),
  },
  {
    accessorKey: "total_overdue_amount",
    header: "Overdue",
    cell: ({ row }) => (
      <span className="font-semibold text-red-600">
        {formatCurrency(row.original.total_overdue_amount)}
      </span>
    ),
  },
  {
    accessorKey: "days_overdue",
    header: "Days Overdue",
    cell: ({ row }) => getDaysBadge(row.original.days_overdue),
  },
  {
    accessorKey: "last_payment_date",
    header: "Last Payment",
    cell: ({ row }) => fmtDate(row.original.last_payment_date),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          render={<Link href={`/loans/${row.original.id}`} />}
        >
          <ExternalLinkIcon className="size-3" />
          View
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-muted-foreground"
          onClick={() => toast.info("Reminder feature coming soon", { description: "Configure in Settings → Notifications" })}
        >
          <BellIcon className="size-3" />
        </Button>
      </div>
    ),
  },
];

// ---------- Aging card ----------

const agingConfig: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  "1-30 days": {
    label: "1–30 Days",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
  },
  "31-60 days": {
    label: "31–60 Days",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    text: "text-orange-700 dark:text-orange-400",
    border: "border-orange-200 dark:border-orange-800",
  },
  "61-90 days": {
    label: "61–90 Days",
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
  },
  "90+ days": {
    label: "90+ Days",
    bg: "bg-red-100 dark:bg-red-950/50",
    text: "text-red-800 dark:text-red-300",
    border: "border-red-300 dark:border-red-700",
  },
};

// ---------- Component ----------

interface OverdueReportProps {
  overdueData: OverdueReportRow[];
  agingData: AgingBucket[];
}

export function OverdueReport({ overdueData, agingData }: OverdueReportProps) {
  const totalOverdue = overdueData.reduce(
    (s, r) => s + r.total_overdue_amount,
    0
  );

  const handleExportExcel = () => {
    exportToExcel(
      overdueData.map((r) => ({
        Borrower: r.borrower_name,
        Phone: r.borrower_phone ?? "",
        Address: r.borrower_address ?? "",
        "Loan #": r.loan_number,
        "Original Amount": r.principal_amount,
        "Overdue Amount": r.total_overdue_amount,
        "Days Overdue": r.days_overdue,
        "Last Payment": r.last_payment_date ?? "None",
      })),
      "Overdue_Report",
      "Overdue"
    );
  };

  const handleExportPDF = () => {
    exportToPDF({
      title: "Overdue Report",
      subtitle: `${overdueData.length} overdue loans totaling ${formatCurrency(totalOverdue)}`,
      columns: [
        { header: "Borrower", dataKey: "borrower_name" },
        { header: "Phone", dataKey: "borrower_phone" },
        { header: "Loan #", dataKey: "loan_number" },
        { header: "Original", dataKey: "principal_amount" },
        { header: "Overdue", dataKey: "total_overdue_amount" },
        { header: "Days", dataKey: "days_overdue" },
        { header: "Last Payment", dataKey: "last_payment_date" },
      ],
      data: overdueData.map((r) => ({
        ...r,
        borrower_phone: r.borrower_phone ?? "—",
        last_payment_date: r.last_payment_date ?? "None",
      })),
      filename: "Overdue_Report",
      totalsRow: {
        total_overdue_amount: totalOverdue,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Overdue Report</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Current overdue loans with aging analysis.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportExcel}
            disabled={overdueData.length === 0}
          >
            <FileSpreadsheetIcon className="size-4" />
            Export Excel
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportPDF}
            disabled={overdueData.length === 0}
          >
            <FileTextIcon className="size-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Alert banner */}
      {overdueData.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
          <AlertTriangleIcon className="size-5 shrink-0 text-red-600 dark:text-red-400" />
          <p className="text-sm font-medium text-red-800 dark:text-red-300">
            {overdueData.length} borrower{overdueData.length !== 1 ? "s" : ""}{" "}
            {overdueData.length !== 1 ? "have" : "has"} overdue loans totaling{" "}
            <span className="font-bold">{formatCurrency(totalOverdue)}</span>
          </p>
        </div>
      )}

      {/* Aging Buckets */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {agingData.map((bucket) => {
          const cfg = agingConfig[bucket.bucket];
          return (
            <Card key={bucket.bucket} className={`${cfg.border} ${cfg.bg}`}>
              <CardContent className="p-4">
                <p className={`text-xs font-medium ${cfg.text}`}>
                  {cfg.label}
                </p>
                <p className={`mt-1 text-2xl font-bold ${cfg.text}`}>
                  {bucket.count}
                </p>
                <p className={`text-sm font-semibold ${cfg.text}`}>
                  {formatCurrency(bucket.totalAmount)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Table */}
      {overdueData.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/40">
              <AlertTriangleIcon className="size-6 text-green-600" />
            </div>
            <p className="text-sm text-muted-foreground">
              No overdue loans — all borrowers are current!
            </p>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={overdueData}
          rowClassName={(row: OverdueReportRow) => getRowClass(row.days_overdue)}
        />
      )}
    </div>
  );
}
