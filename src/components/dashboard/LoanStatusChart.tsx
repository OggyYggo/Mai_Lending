"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LoanStatusBreakdown } from "@/lib/actions/dashboard";

const statusColors: Record<string, string> = {
  pending: "#f59e0b",
  approved: "#3b82f6",
  active: "#22c55e",
  overdue: "#ef4444",
  completed: "#3b82f6",
  rejected: "#9ca3af",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  active: "Active",
  overdue: "Overdue",
  completed: "Completed",
  rejected: "Rejected",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: LoanStatusBreakdown }[];
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
      <p className="font-medium capitalize">{statusLabels[d.status] ?? d.status}</p>
      <p>{d.count} loan{d.count !== 1 ? "s" : ""}</p>
      <p className="font-semibold">{fmt(d.amount)}</p>
    </div>
  );
}

interface LoanStatusChartProps {
  data: LoanStatusBreakdown[];
}

export function LoanStatusChart({ data }: LoanStatusChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        chartRef.current,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.4)" }
      );
    }, chartRef);
    return () => ctx.revert();
  }, []);

  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Loan Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={chartRef} className="flex flex-col items-center gap-4">
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {data.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={statusColors[entry.status] ?? "#9ca3af"}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <text
                  x="50%"
                  y="48%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-foreground text-2xl font-bold"
                >
                  {total}
                </text>
                <text
                  x="50%"
                  y="60%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-muted-foreground text-xs"
                >
                  Total Loans
                </text>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="grid w-full grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            {data.map((d) => (
              <div key={d.status} className="flex items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: statusColors[d.status] ?? "#9ca3af" }}
                />
                <span className="text-muted-foreground">
                  {statusLabels[d.status] ?? d.status}
                </span>
                <span className="ml-auto font-medium">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
