"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  FileSpreadsheetIcon,
  FileTextIcon,
} from "lucide-react";

import {
  getMonthlySummaryReport,
  type MonthlySummaryRow,
} from "@/lib/actions/reports";
import { exportToExcel, exportToPDF, formatCurrency } from "@/lib/export-utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---------- helpers ----------

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth(); // 0-indexed
const yearOptions = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n);

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; dataKey: string; color: string; name: string }[];
  label?: string;
}) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((e) => (
        <p key={e.dataKey} style={{ color: e.color }}>
          {e.name}:{" "}
          <span className="font-semibold">
            {e.dataKey === "collectionRate"
              ? `${e.value.toFixed(1)}%`
              : formatCurrency(e.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

// ---------- Page ----------

export default function MonthlyReportPage() {
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<MonthlySummaryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const chartsRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async (yr: number) => {
    setLoading(true);
    const { data: result } = await getMonthlySummaryReport(yr);
    setData(result ?? []);
    setLoading(false);

    // Animate charts
    requestAnimationFrame(() => {
      if (!chartsRef.current) return;
      gsap.context(() => {
        gsap.fromTo(
          "[data-chart-card]",
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, stagger: 0.12, ease: "power3.out" }
        );
      }, chartsRef.current);
    });
  }, []);

  useEffect(() => {
    fetchData(year);
  }, [year, fetchData]);

  // Totals
  const totals = data.reduce(
    (acc, r) => ({
      newBorrowers: acc.newBorrowers + r.newBorrowers,
      newLoans: acc.newLoans + r.newLoans,
      disbursed: acc.disbursed + r.disbursed,
      collected: acc.collected + r.collected,
      outstanding: acc.outstanding + r.outstanding,
      overdueCount: acc.overdueCount + r.overdueCount,
    }),
    { newBorrowers: 0, newLoans: 0, disbursed: 0, collected: 0, outstanding: 0, overdueCount: 0 }
  );

  const totalRate =
    totals.collected + totals.outstanding > 0
      ? (totals.collected / (totals.collected + totals.outstanding)) * 100
      : 0;

  // Chart data with collection rate
  const chartData = data.map((r) => {
    const rate =
      r.collected + r.outstanding > 0
        ? (r.collected / (r.collected + r.outstanding)) * 100
        : 0;
    return { ...r, collectionRate: Math.round(rate * 10) / 10 };
  });

  const handleExportExcel = () => {
    exportToExcel(
      data.map((r) => {
        const rate =
          r.collected + r.outstanding > 0
            ? ((r.collected / (r.collected + r.outstanding)) * 100).toFixed(1) + "%"
            : "0%";
        return {
          Month: r.month,
          "New Borrowers": r.newBorrowers,
          "New Loans": r.newLoans,
          Disbursed: r.disbursed,
          Collected: r.collected,
          Outstanding: r.outstanding,
          "Overdue Count": r.overdueCount,
          "Collection Rate": rate,
        };
      }),
      `Monthly_Report_${year}`,
      "Monthly Summary"
    );
  };

  const handleExportPDF = () => {
    exportToPDF({
      title: `Monthly Summary Report — ${year}`,
      subtitle: `Annual overview of lending activity`,
      columns: [
        { header: "Month", dataKey: "month" },
        { header: "Borrowers", dataKey: "newBorrowers" },
        { header: "Loans", dataKey: "newLoans" },
        { header: "Disbursed", dataKey: "disbursed" },
        { header: "Collected", dataKey: "collected" },
        { header: "Outstanding", dataKey: "outstanding" },
        { header: "Overdue", dataKey: "overdueCount" },
        { header: "Rate", dataKey: "collectionRate" },
      ],
      data: chartData.map((r) => ({
        ...r,
        collectionRate: `${r.collectionRate}%`,
      })),
      filename: `Monthly_Report_${year}`,
      totalsRow: {
        newBorrowers: totals.newBorrowers,
        newLoans: totals.newLoans,
        disbursed: totals.disbursed,
        collected: totals.collected,
        outstanding: totals.outstanding,
        overdueCount: totals.overdueCount,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Monthly Summary</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Month-by-month lending performance for {year}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(year)}
            onValueChange={(v) => setYear(v ? Number(v) : currentYear)}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-md bg-muted/60"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-center">Borrowers</TableHead>
                    <TableHead className="text-center">Loans</TableHead>
                    <TableHead className="text-right">Disbursed</TableHead>
                    <TableHead className="text-right">Collected</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-center">Overdue</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, i) => {
                    const rate =
                      row.collected + row.outstanding > 0
                        ? (row.collected / (row.collected + row.outstanding)) *
                          100
                        : 0;
                    const isCurrentMonth =
                      year === currentYear && i === currentMonth;

                    return (
                      <TableRow
                        key={row.month}
                        className={
                          isCurrentMonth
                            ? "bg-blue-50 dark:bg-blue-950/30"
                            : ""
                        }
                      >
                        <TableCell className="font-medium">
                          {row.month}
                          {isCurrentMonth && (
                            <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                              (current)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.newBorrowers}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.newLoans}
                        </TableCell>
                        <TableCell className="text-right">
                          {fmt(row.disbursed)}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {fmt(row.collected)}
                        </TableCell>
                        <TableCell
                          className={`text-right ${
                            row.outstanding > 0
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {fmt(row.outstanding)}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.overdueCount > 0 ? (
                            <span className="font-medium text-red-600">
                              {row.overdueCount}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              rate >= 80
                                ? "text-green-600"
                                : rate >= 60
                                  ? "text-amber-600"
                                  : "text-red-600"
                            }
                          >
                            {rate.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Totals Row */}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-center">
                      {totals.newBorrowers}
                    </TableCell>
                    <TableCell className="text-center">
                      {totals.newLoans}
                    </TableCell>
                    <TableCell className="text-right">
                      {fmt(totals.disbursed)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {fmt(totals.collected)}
                    </TableCell>
                    <TableCell
                      className={`text-right ${
                        totals.outstanding > 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {fmt(totals.outstanding)}
                    </TableCell>
                    <TableCell className="text-center">
                      {totals.overdueCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {totalRate.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      {!loading && data.length > 0 && (
        <div
          ref={chartsRef}
          className="grid gap-4 lg:grid-cols-2"
        >
          {/* Grouped Bar Chart */}
          <Card data-chart-card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Disbursed vs Collected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                      tickFormatter={(v) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                      }
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      formatter={(v) =>
                        v === "disbursed" ? "Disbursed" : "Collected"
                      }
                    />
                    <Bar
                      dataKey="disbursed"
                      name="Disbursed"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                      barSize={16}
                    />
                    <Bar
                      dataKey="collected"
                      name="Collected"
                      fill="#22c55e"
                      radius={[4, 4, 0, 0]}
                      barSize={16}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Collection Rate Line */}
          <Card data-chart-card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Collection Rate Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="collectionRate"
                      name="Collection Rate"
                      stroke="#22c55e"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "#22c55e" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
