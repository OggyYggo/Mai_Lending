"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  FileSpreadsheetIcon,
  FileTextIcon,
  HashIcon,
  BanknoteIcon,
  CalculatorIcon,
  TrendingUpIcon,
} from "lucide-react";

import {
  getCollectionReport,
  type CollectionReport,
  type CollectionReportRow,
} from "@/lib/actions/reports";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

const methodConfig: Record<string, { label: string; color: string; badgeClass: string }> = {
  cash: { label: "Cash", color: "#22c55e", badgeClass: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400" },
  bank_transfer: { label: "Bank Transfer", color: "#3b82f6", badgeClass: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400" },
  gcash: { label: "GCash", color: "#0ea5e9", badgeClass: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400" },
  maya: { label: "Maya", color: "#10b981", badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400" },
  check: { label: "Check", color: "#f59e0b", badgeClass: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400" },
  other: { label: "Other", color: "#9ca3af", badgeClass: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400" },
};

// ---------- columns ----------

const columns: ColumnDef<CollectionReportRow>[] = [
  {
    accessorKey: "payment_date",
    header: "Date",
    cell: ({ row }) => fmtDate(row.original.payment_date),
  },
  {
    accessorKey: "borrower_name",
    header: "Borrower",
  },
  {
    accessorKey: "loan_number",
    header: "Loan #",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.loan_number}</span>
    ),
  },
  {
    accessorKey: "installment_number",
    header: "Inst. #",
    cell: ({ row }) =>
      row.original.installment_number
        ? `#${row.original.installment_number}`
        : "—",
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => (
      <span className="font-semibold">{formatCurrency(row.original.amount)}</span>
    ),
  },
  {
    accessorKey: "payment_method",
    header: "Method",
    cell: ({ row }) => {
      const mc = methodConfig[row.original.payment_method] ?? methodConfig.other;
      return (
        <Badge variant="outline" className={mc.badgeClass}>
          {mc.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: "reference_number",
    header: "Reference",
    cell: ({ row }) => row.original.reference_number || "—",
  },
  {
    accessorKey: "created_at",
    header: "Recorded",
    cell: ({ row }) => fmtDate(row.original.created_at),
  },
];

// ---------- Tooltip ----------

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { value: number; payload: { method: string } }[];
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0];
  const mc = methodConfig[d.payload.method] ?? methodConfig.other;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="font-medium">{mc.label}</p>
      <p className="font-semibold">{formatCurrency(d.value)}</p>
    </div>
  );
}

// ---------- Mini KPI ----------

function MiniKPI({
  title,
  icon: Icon,
  color,
  valueRef,
}: {
  title: string;
  icon: React.ElementType;
  color: string;
  valueRef: (el: HTMLSpanElement | null) => void;
}) {
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

export default function CollectionReportPage() {
  const [report, setReport] = useState<CollectionReport | null>(null);
  const [loading, setLoading] = useState(true);

  const countRef = useRef<HTMLSpanElement | null>(null);
  const totalRef = useRef<HTMLSpanElement | null>(null);
  const avgRef = useRef<HTMLSpanElement | null>(null);
  const topMethodRef = useRef<HTMLSpanElement | null>(null);

  const animateKPIs = useCallback((r: CollectionReport) => {
    if (countRef.current)
      animateCountUp(countRef.current, r.payments.length, 1.2);
    if (totalRef.current)
      animateCountUp(totalRef.current, r.grandTotal, 1.4, "₱");
    if (avgRef.current) {
      const avg =
        r.payments.length > 0 ? r.grandTotal / r.payments.length : 0;
      animateCountUp(avgRef.current, avg, 1.4, "₱");
    }
    if (topMethodRef.current) {
      const top = [...r.subtotals].sort((a, b) => b.total - a.total)[0];
      topMethodRef.current.textContent = top
        ? (methodConfig[top.method]?.label ?? top.method)
        : "—";
    }
  }, []);

  const fetchData = useCallback(
    async (filters?: ReportFilters) => {
      setLoading(true);
      const { data } = await getCollectionReport({
        dateFrom: filters?.dateFrom || undefined,
        dateTo: filters?.dateTo || undefined,
        method: filters?.method,
      });
      const r = data ?? { payments: [], subtotals: [], grandTotal: 0 };
      setReport(r);
      setLoading(false);
      animateKPIs(r);
    },
    [animateKPIs]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const barData = (report?.subtotals ?? []).map((s) => ({
    method: s.method,
    label: methodConfig[s.method]?.label ?? s.method,
    total: s.total,
    count: s.count,
  }));

  const handleExportExcel = () => {
    if (!report) return;
    exportToExcel(
      report.payments.map((p) => ({
        Date: p.payment_date,
        Borrower: p.borrower_name,
        "Loan #": p.loan_number,
        "Installment #": p.installment_number ?? "",
        Amount: p.amount,
        Method: methodConfig[p.payment_method]?.label ?? p.payment_method,
        Reference: p.reference_number ?? "",
      })),
      "Collection_Report",
      "Collections"
    );
  };

  const handleExportPDF = () => {
    if (!report) return;
    exportToPDF({
      title: "Collection Report",
      subtitle: `${report.payments.length} payments totaling ${formatCurrency(report.grandTotal)}`,
      columns: [
        { header: "Date", dataKey: "payment_date" },
        { header: "Borrower", dataKey: "borrower_name" },
        { header: "Loan #", dataKey: "loan_number" },
        { header: "Inst. #", dataKey: "installment_number" },
        { header: "Amount", dataKey: "amount" },
        { header: "Method", dataKey: "method_label" },
        { header: "Reference", dataKey: "reference_number" },
      ],
      data: report.payments.map((p) => ({
        ...p,
        method_label: methodConfig[p.payment_method]?.label ?? p.payment_method,
        installment_number: p.installment_number ?? "—",
        reference_number: p.reference_number ?? "—",
      })),
      filename: "Collection_Report",
      totalsRow: {
        amount: report.grandTotal,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Collection Report</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Payment collections breakdown and analysis.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportExcel}
            disabled={!report || report.payments.length === 0}
          >
            <FileSpreadsheetIcon className="size-4" />
            Export Excel
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportPDF}
            disabled={!report || report.payments.length === 0}
          >
            <FileTextIcon className="size-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniKPI
          title="Total Collections"
          icon={HashIcon}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
          valueRef={(el) => { countRef.current = el; }}
        />
        <MiniKPI
          title="Total Amount"
          icon={BanknoteIcon}
          color="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
          valueRef={(el) => { totalRef.current = el; }}
        />
        <MiniKPI
          title="Average Payment"
          icon={CalculatorIcon}
          color="bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400"
          valueRef={(el) => { avgRef.current = el; }}
        />
        <MiniKPI
          title="Most Used Method"
          icon={TrendingUpIcon}
          color="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
          valueRef={(el) => { topMethodRef.current = el; }}
        />
      </div>

      {/* Filters */}
      <ReportFilterBar
        onFilter={(f) => fetchData(f)}
        filters={{
          showDateRange: true,
          showMethod: true,
          showBorrower: true,
        }}
        isLoading={loading}
      />

      {/* Method Breakdown Chart */}
      {barData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Collections by Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    className="stroke-muted"
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                    }
                    className="text-muted-foreground"
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                    width={100}
                    className="text-muted-foreground"
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={22}>
                    {barData.map((entry) => (
                      <Cell
                        key={entry.method}
                        fill={methodConfig[entry.method]?.color ?? "#9ca3af"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {loading ? (
        <ReportTableSkeleton />
      ) : (
        <>
          <DataTable columns={columns} data={report?.payments ?? []} />
          {report && report.payments.length > 0 && (
            <div className="flex items-center justify-end gap-2 rounded-md border bg-muted/50 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-bold text-green-600">
                {formatCurrency(report.grandTotal)}
              </span>
              <span className="text-muted-foreground">
                across {report.payments.length} payment
                {report.payments.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
