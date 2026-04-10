"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  UsersIcon,
  FileTextIcon,
  CreditCardIcon,
  AlertTriangleIcon,
  TrendingUpIcon,
  ClockIcon,
  TargetIcon,
  HourglassIcon,
  RefreshCwIcon,
  Loader2Icon,
} from "lucide-react";

import { checkAndUpdateOverdueLoans } from "@/lib/actions/loans";
import { animatePageEntrance } from "@/lib/gsap-utils";
import type {
  DashboardStats,
  MonthlyCollection,
  LoanStatusBreakdown,
  RecentActivity as RecentActivityType,
  UpcomingDue,
  OverdueLoan,
} from "@/lib/actions/dashboard";

import { Button } from "@/components/ui/button";
import { KPICard } from "@/components/dashboard/KPICard";
import { MonthlyCollectionsChart } from "@/components/dashboard/MonthlyCollectionsChart";
import { LoanStatusChart } from "@/components/dashboard/LoanStatusChart";
import { CollectionRateChart } from "@/components/dashboard/CollectionRateChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { UpcomingDues } from "@/components/dashboard/UpcomingDues";
import { OverdueAlert } from "@/components/dashboard/OverdueAlert";

interface DashboardShellProps {
  stats: DashboardStats;
  monthly: MonthlyCollection[];
  statusBreakdown: LoanStatusBreakdown[];
  activities: RecentActivityType[];
  upcomingDues: UpcomingDue[];
  overdueLoans: OverdueLoan[];
}

const today = new Date().toLocaleDateString("en-PH", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function DashboardShell({
  stats,
  monthly,
  statusBreakdown,
  activities,
  upcomingDues,
  overdueLoans,
}: DashboardShellProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const tl = animatePageEntrance("#dashboard-container");
    return () => { tl.kill(); };
  }, []);

  const handleOverdueCheck = async () => {
    setChecking(true);
    const { error } = await checkAndUpdateOverdueLoans();
    if (error) {
      toast.error("Overdue check failed", { description: error });
    } else {
      toast.success("Overdue check completed");
      router.refresh();
    }
    setChecking(false);
  };

  return (
    <div id="dashboard-container" ref={containerRef} className="space-y-6">
      {/* 1. Header */}
      <div data-animate="header" className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">{today}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOverdueCheck}
          disabled={checking}
        >
          {checking ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <RefreshCwIcon className="size-4" />
          )}
          {checking ? "Checking..." : "Run Overdue Check"}
        </Button>
      </div>

      {/* 2. Overdue Alert */}
      {overdueLoans.length > 0 && (
        <div data-animate="header">
          <OverdueAlert overdueLoans={overdueLoans} />
        </div>
      )}

      {/* 3. KPI Row 1 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div data-animate="kpi">
          <KPICard
            title="Total Borrowers"
            value={stats.totalBorrowers}
            icon={UsersIcon}
            color="blue"
            description={`${stats.activeBorrowers} active`}
          />
        </div>
        <div data-animate="kpi">
          <KPICard
            title="Active Loans"
            value={stats.activeLoans}
            icon={FileTextIcon}
            color="green"
            description={`${stats.totalLoans} total`}
          />
        </div>
        <div data-animate="kpi">
          <KPICard
            title="Total Collected"
            value={stats.totalCollected}
            prefix="₱"
            icon={CreditCardIcon}
            color="purple"
          />
        </div>
        <div data-animate="kpi">
          <KPICard
            title="Overdue Loans"
            value={stats.overdueLoans}
            icon={AlertTriangleIcon}
            color="red"
            description={stats.overdueLoans > 0 ? "Needs attention" : "All clear"}
          />
        </div>
      </div>

      {/* 4. KPI Row 2 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div data-animate="kpi">
          <KPICard
            title="Total Disbursed"
            value={stats.totalDisbursed}
            prefix="₱"
            icon={TrendingUpIcon}
            color="blue"
          />
        </div>
        <div data-animate="kpi">
          <KPICard
            title="Outstanding Balance"
            value={stats.totalOutstanding}
            prefix="₱"
            icon={ClockIcon}
            color="amber"
          />
        </div>
        <div data-animate="kpi">
          <KPICard
            title="Collection Rate"
            value={stats.collectionRate}
            suffix="%"
            icon={TargetIcon}
            color="green"
          />
        </div>
        <div data-animate="kpi">
          <KPICard
            title="Pending Approvals"
            value={stats.pendingLoans}
            icon={HourglassIcon}
            color="amber"
            description="Awaiting review"
          />
        </div>
      </div>

      {/* 5. Charts Row */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div data-animate="chart" className="lg:col-span-3">
          <MonthlyCollectionsChart data={monthly} />
        </div>
        <div data-animate="chart" className="lg:col-span-2">
          <LoanStatusChart data={statusBreakdown} />
        </div>
      </div>

      {/* 6. Bottom Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div data-animate="table">
          <RecentActivity activities={activities} />
        </div>
        <div data-animate="table">
          <UpcomingDues dues={upcomingDues} />
        </div>
      </div>

      {/* 7. Collection Rate Chart */}
      <div data-animate="chart">
        <CollectionRateChart rate={stats.collectionRate} />
      </div>
    </div>
  );
}
