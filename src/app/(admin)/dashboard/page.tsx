import {
  getDashboardStats,
  getMonthlyCollections,
  getLoanStatusBreakdown,
  getRecentActivities,
  getUpcomingDues,
  getOverdueLoans,
} from "@/lib/actions/dashboard";
import { DashboardShell } from "./dashboard-shell";

export default async function DashboardPage() {
  const [
    statsResult,
    monthlyResult,
    statusResult,
    activitiesResult,
    duesResult,
    overdueResult,
  ] = await Promise.all([
    getDashboardStats(),
    getMonthlyCollections(),
    getLoanStatusBreakdown(),
    getRecentActivities(10),
    getUpcomingDues(7),
    getOverdueLoans(),
  ]);

  const stats = statsResult.data ?? {
    totalBorrowers: 0,
    activeBorrowers: 0,
    totalLoans: 0,
    activeLoans: 0,
    pendingLoans: 0,
    overdueLoans: 0,
    totalDisbursed: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    collectionRate: 0,
    totalOverdueAmount: 0,
  };

  return (
    <DashboardShell
      stats={stats}
      monthly={monthlyResult.data ?? []}
      statusBreakdown={statusResult.data ?? []}
      activities={activitiesResult.data ?? []}
      upcomingDues={duesResult.data ?? []}
      overdueLoans={overdueResult.data ?? []}
    />
  );
}
