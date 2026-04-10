"use server";

import { createClient } from "@/lib/supabase/server";

// ---------- Types ----------

export interface DashboardStats {
  totalBorrowers: number;
  activeBorrowers: number;
  totalLoans: number;
  activeLoans: number;
  pendingLoans: number;
  overdueLoans: number;
  totalDisbursed: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  totalOverdueAmount: number;
}

export interface MonthlyCollection {
  month: string;
  collected: number;
  target: number;
}

export interface LoanStatusBreakdown {
  status: string;
  count: number;
  amount: number;
}

export interface RecentActivity {
  type: "borrower" | "loan" | "payment";
  description: string;
  amount?: number;
  date: string;
  id: string;
}

export interface UpcomingDue {
  id: string;
  loan_id: string;
  installment_number: number;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  status: string;
  borrower_name: string;
  loan_number: string;
}

export interface OverdueLoan {
  id: string;
  loan_number: string;
  borrower_name: string;
  principal_amount: number;
  overdue_amount: number;
  days_overdue: number;
  status: string;
}

// ---------- getDashboardStats ----------

export async function getDashboardStats() {
  try {
    const supabase = await createClient();

    // Borrowers
    const { count: totalBorrowers } = await supabase
      .from("borrowers")
      .select("*", { count: "exact", head: true });

    const { count: activeBorrowers } = await supabase
      .from("borrowers")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    // Loans
    const { count: totalLoans } = await supabase
      .from("loans")
      .select("*", { count: "exact", head: true });

    const { count: activeLoans } = await supabase
      .from("loans")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    const { count: pendingLoans } = await supabase
      .from("loans")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: overdueLoans } = await supabase
      .from("loans")
      .select("*", { count: "exact", head: true })
      .eq("status", "overdue");

    // Disbursed = sum of principal for active/completed/overdue loans
    const { data: disbursedRows } = await supabase
      .from("loans")
      .select("principal_amount")
      .in("status", ["active", "completed", "overdue"]);

    const totalDisbursed = (disbursedRows ?? []).reduce(
      (s, r) => s + Number(r.principal_amount),
      0
    );

    // Collected
    const { data: paymentRows } = await supabase
      .from("payments")
      .select("amount");

    const totalCollected = (paymentRows ?? []).reduce(
      (s, r) => s + Number(r.amount),
      0
    );

    // Outstanding from schedules
    const { data: scheduleRows } = await supabase
      .from("loan_schedules")
      .select("total_amount, paid_amount")
      .in("status", ["pending", "overdue", "partial"]);

    const totalOutstanding = (scheduleRows ?? []).reduce(
      (s, r) => s + (Number(r.total_amount) - Number(r.paid_amount)),
      0
    );

    // Overdue amount
    const { data: overdueSchedules } = await supabase
      .from("loan_schedules")
      .select("total_amount, paid_amount")
      .eq("status", "overdue");

    const totalOverdueAmount = (overdueSchedules ?? []).reduce(
      (s, r) => s + (Number(r.total_amount) - Number(r.paid_amount)),
      0
    );

    const totalExpected = totalCollected + totalOutstanding;
    const collectionRate =
      totalExpected > 0
        ? Math.round((totalCollected / totalExpected) * 10000) / 100
        : 0;

    const stats: DashboardStats = {
      totalBorrowers: totalBorrowers ?? 0,
      activeBorrowers: activeBorrowers ?? 0,
      totalLoans: totalLoans ?? 0,
      activeLoans: activeLoans ?? 0,
      pendingLoans: pendingLoans ?? 0,
      overdueLoans: overdueLoans ?? 0,
      totalDisbursed,
      totalCollected,
      totalOutstanding,
      collectionRate,
      totalOverdueAmount,
    };

    return { data: stats, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

// ---------- getMonthlyCollections ----------

const monthNames = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export async function getMonthlyCollections(year?: number) {
  try {
    const supabase = await createClient();
    const yr = year ?? new Date().getFullYear();

    const startDate = `${yr}-01-01`;
    const endDate = `${yr}-12-31`;

    const { data: payments } = await supabase
      .from("payments")
      .select("amount, payment_date")
      .gte("payment_date", startDate)
      .lte("payment_date", endDate);

    // Group by month
    const monthlyMap = new Map<number, number>();
    for (const p of payments ?? []) {
      const m = new Date(p.payment_date).getMonth();
      monthlyMap.set(m, (monthlyMap.get(m) ?? 0) + Number(p.amount));
    }

    // Target from schedules due this year
    const { data: schedules } = await supabase
      .from("loan_schedules")
      .select("total_amount, due_date")
      .gte("due_date", startDate)
      .lte("due_date", endDate);

    const targetMap = new Map<number, number>();
    for (const s of schedules ?? []) {
      const m = new Date(s.due_date).getMonth();
      targetMap.set(m, (targetMap.get(m) ?? 0) + Number(s.total_amount));
    }

    const result: MonthlyCollection[] = monthNames.map((name, i) => ({
      month: name,
      collected: monthlyMap.get(i) ?? 0,
      target: targetMap.get(i) ?? 0,
    }));

    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

// ---------- getLoanStatusBreakdown ----------

export async function getLoanStatusBreakdown() {
  try {
    const supabase = await createClient();

    const { data: loans } = await supabase
      .from("loans")
      .select("status, principal_amount");

    const map = new Map<string, { count: number; amount: number }>();
    for (const loan of loans ?? []) {
      const entry = map.get(loan.status) ?? { count: 0, amount: 0 };
      entry.count++;
      entry.amount += Number(loan.principal_amount);
      map.set(loan.status, entry);
    }

    const result: LoanStatusBreakdown[] = Array.from(map.entries()).map(
      ([status, { count, amount }]) => ({ status, count, amount })
    );

    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

// ---------- getRecentActivities ----------

export async function getRecentActivities(limit = 10) {
  try {
    const supabase = await createClient();
    const activities: RecentActivity[] = [];

    // Recent borrowers
    const { data: borrowers } = await supabase
      .from("borrowers")
      .select("id, first_name, last_name, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    for (const b of borrowers ?? []) {
      activities.push({
        type: "borrower",
        description: `New borrower: ${b.first_name} ${b.last_name}`,
        date: b.created_at,
        id: b.id,
      });
    }

    // Recent loans
    const { data: loans } = await supabase
      .from("loans")
      .select(
        "id, loan_number, status, principal_amount, created_at, approved_at"
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    for (const l of loans ?? []) {
      if (l.status === "approved" && l.approved_at) {
        activities.push({
          type: "loan",
          description: `Loan ${l.loan_number} approved`,
          amount: Number(l.principal_amount),
          date: l.approved_at,
          id: l.id,
        });
      }
      if (l.status === "rejected") {
        activities.push({
          type: "loan",
          description: `Loan ${l.loan_number} rejected`,
          date: l.created_at,
          id: l.id,
        });
      }
      activities.push({
        type: "loan",
        description: `Loan ${l.loan_number} created`,
        amount: Number(l.principal_amount),
        date: l.created_at,
        id: l.id,
      });
    }

    // Recent payments
    const { data: payments } = await supabase
      .from("payments")
      .select(
        "id, amount, created_at, loan:loans!inner(loan_number)"
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    for (const p of payments ?? []) {
      const loanNum = (p.loan as unknown as { loan_number: string })
        .loan_number;
      activities.push({
        type: "payment",
        description: `Payment received for ${loanNum}`,
        amount: Number(p.amount),
        date: p.created_at,
        id: p.id,
      });
    }

    // Sort by date desc and limit
    activities.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return { data: activities.slice(0, limit), error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

// ---------- getUpcomingDues ----------

export async function getUpcomingDues(days = 7) {
  try {
    const supabase = await createClient();

    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);

    const todayStr = today.toISOString().split("T")[0];
    const futureStr = futureDate.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("loan_schedules")
      .select(
        "id, loan_id, installment_number, due_date, total_amount, paid_amount, status, loan:loans!inner(loan_number, borrower:borrowers!inner(first_name, last_name))"
      )
      .in("status", ["pending", "overdue"])
      .gte("due_date", todayStr)
      .lte("due_date", futureStr)
      .order("due_date", { ascending: true });

    if (error) throw error;

    const result: UpcomingDue[] = (data ?? []).map((row) => {
      const loan = row.loan as unknown as {
        loan_number: string;
        borrower: { first_name: string; last_name: string };
      };
      return {
        id: row.id,
        loan_id: row.loan_id,
        installment_number: row.installment_number,
        due_date: row.due_date,
        total_amount: Number(row.total_amount),
        paid_amount: Number(row.paid_amount),
        status: row.status,
        borrower_name: `${loan.borrower.first_name} ${loan.borrower.last_name}`,
        loan_number: loan.loan_number,
      };
    });

    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

// ---------- getOverdueLoans ----------

export async function getOverdueLoans() {
  try {
    const supabase = await createClient();

    const { data: loans, error } = await supabase
      .from("loans")
      .select(
        "id, loan_number, principal_amount, status, borrower:borrowers!inner(first_name, last_name)"
      )
      .eq("status", "overdue");

    if (error) throw error;

    const today = new Date();
    const result: OverdueLoan[] = [];

    for (const loan of loans ?? []) {
      const borrower = loan.borrower as unknown as {
        first_name: string;
        last_name: string;
      };

      // Get overdue schedules for this loan
      const { data: overdueScheds } = await supabase
        .from("loan_schedules")
        .select("due_date, total_amount, paid_amount")
        .eq("loan_id", loan.id)
        .eq("status", "overdue")
        .order("due_date", { ascending: true });

      const overdueAmount = (overdueScheds ?? []).reduce(
        (s, r) => s + (Number(r.total_amount) - Number(r.paid_amount)),
        0
      );

      const earliestDue = overdueScheds?.[0]?.due_date;
      const daysOverdue = earliestDue
        ? Math.floor(
            (today.getTime() - new Date(earliestDue).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0;

      result.push({
        id: loan.id,
        loan_number: loan.loan_number,
        borrower_name: `${borrower.first_name} ${borrower.last_name}`,
        principal_amount: Number(loan.principal_amount),
        overdue_amount: overdueAmount,
        days_overdue: daysOverdue,
        status: loan.status,
      });
    }

    // Sort by days overdue desc
    result.sort((a, b) => b.days_overdue - a.days_overdue);

    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}
