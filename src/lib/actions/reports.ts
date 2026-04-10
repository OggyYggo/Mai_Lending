"use server";

import { createClient } from "@/lib/supabase/server";

// ---------- Types ----------

export interface LoanReportRow {
  id: string;
  loan_number: string;
  status: string;
  principal_amount: number;
  interest_rate: number;
  interest_type: string;
  term_months: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  borrower_name: string;
  borrower_id: string;
  total_paid: number;
  outstanding: number;
}

export interface CollectionReportRow {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  borrower_name: string;
  loan_number: string;
  installment_number: number | null;
}

export interface CollectionReport {
  payments: CollectionReportRow[];
  subtotals: { method: string; total: number; count: number }[];
  grandTotal: number;
}

export interface OverdueReportRow {
  id: string;
  loan_number: string;
  borrower_name: string;
  borrower_phone: string | null;
  borrower_address: string | null;
  principal_amount: number;
  days_overdue: number;
  total_overdue_amount: number;
  last_payment_date: string | null;
}

export interface BorrowerLedgerLoan {
  id: string;
  loan_number: string;
  status: string;
  principal_amount: number;
  interest_rate: number;
  term_months: number;
  start_date: string | null;
  payments: {
    id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    reference_number: string | null;
  }[];
  total_paid: number;
  running_balance: number;
}

export interface BorrowerLedger {
  borrower: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    status: string;
  };
  loans: BorrowerLedgerLoan[];
  totalDisbursed: number;
  totalPaid: number;
  totalOutstanding: number;
}

export interface MonthlySummaryRow {
  month: string;
  newLoans: number;
  newBorrowers: number;
  disbursed: number;
  collected: number;
  outstanding: number;
  overdueCount: number;
}

export interface AgingBucket {
  bucket: "1-30 days" | "31-60 days" | "61-90 days" | "90+ days";
  count: number;
  totalAmount: number;
  loans: {
    id: string;
    loan_number: string;
    borrower_name: string;
    principal_amount: number;
    overdue_amount: number;
    days_overdue: number;
  }[];
}

// ---------- getLoanReport ----------

export async function getLoanReport(filters?: {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  borrowerId?: string;
}) {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("loans")
      .select(
        "id, loan_number, status, principal_amount, interest_rate, interest_type, term_months, start_date, end_date, created_at, borrower_id, borrower:borrowers!inner(first_name, last_name)"
      )
      .order("created_at", { ascending: false });

    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }
    if (filters?.dateFrom) {
      query = query.gte("created_at", filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte("created_at", filters.dateTo + "T23:59:59");
    }
    if (filters?.borrowerId) {
      query = query.eq("borrower_id", filters.borrowerId);
    }

    const { data: loans, error } = await query;
    if (error) throw error;

    const result: LoanReportRow[] = [];

    for (const loan of loans ?? []) {
      const borrower = loan.borrower as unknown as {
        first_name: string;
        last_name: string;
      };

      const { data: payments } = await supabase
        .from("payments")
        .select("amount")
        .eq("loan_id", loan.id);

      const totalPaid = (payments ?? []).reduce(
        (s, p) => s + Number(p.amount),
        0
      );

      result.push({
        id: loan.id,
        loan_number: loan.loan_number,
        status: loan.status,
        principal_amount: Number(loan.principal_amount),
        interest_rate: Number(loan.interest_rate),
        interest_type: loan.interest_type,
        term_months: loan.term_months,
        start_date: loan.start_date,
        end_date: loan.end_date,
        created_at: loan.created_at,
        borrower_id: loan.borrower_id,
        borrower_name: `${borrower.first_name} ${borrower.last_name}`,
        total_paid: totalPaid,
        outstanding: Number(loan.principal_amount) - totalPaid,
      });
    }

    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

// ---------- getCollectionReport ----------

export async function getCollectionReport(filters?: {
  dateFrom?: string;
  dateTo?: string;
  method?: string;
  borrowerId?: string;
}) {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("payments")
      .select(
        "id, amount, payment_date, payment_method, reference_number, notes, created_at, borrower:borrowers!inner(first_name, last_name), loan:loans!inner(loan_number), schedule:loan_schedules(installment_number)"
      )
      .order("payment_date", { ascending: false });

    if (filters?.dateFrom) {
      query = query.gte("payment_date", filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte("payment_date", filters.dateTo);
    }
    if (filters?.method && filters.method !== "all") {
      query = query.eq("payment_method", filters.method);
    }
    if (filters?.borrowerId) {
      query = query.eq("borrower_id", filters.borrowerId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const payments: CollectionReportRow[] = (data ?? []).map((p) => {
      const borrower = p.borrower as unknown as {
        first_name: string;
        last_name: string;
      };
      const loan = p.loan as unknown as { loan_number: string };
      const schedule = p.schedule as unknown as {
        installment_number: number;
      } | null;

      return {
        id: p.id,
        amount: Number(p.amount),
        payment_date: p.payment_date,
        payment_method: p.payment_method,
        reference_number: p.reference_number,
        notes: p.notes,
        created_at: p.created_at,
        borrower_name: `${borrower.first_name} ${borrower.last_name}`,
        loan_number: loan.loan_number,
        installment_number: schedule?.installment_number ?? null,
      };
    });

    // Subtotals per method
    const methodMap = new Map<string, { total: number; count: number }>();
    for (const p of payments) {
      const entry = methodMap.get(p.payment_method) ?? { total: 0, count: 0 };
      entry.total += p.amount;
      entry.count++;
      methodMap.set(p.payment_method, entry);
    }

    const subtotals = Array.from(methodMap.entries()).map(
      ([method, { total, count }]) => ({ method, total, count })
    );

    const grandTotal = payments.reduce((s, p) => s + p.amount, 0);

    const report: CollectionReport = { payments, subtotals, grandTotal };
    return { data: report, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

// ---------- getOverdueReport ----------

export async function getOverdueReport() {
  try {
    const supabase = await createClient();
    const today = new Date();

    const { data: loans, error } = await supabase
      .from("loans")
      .select(
        "id, loan_number, principal_amount, borrower:borrowers!inner(first_name, last_name, phone, address)"
      )
      .eq("status", "overdue");

    if (error) throw error;

    const result: OverdueReportRow[] = [];

    for (const loan of loans ?? []) {
      const borrower = loan.borrower as unknown as {
        first_name: string;
        last_name: string;
        phone: string | null;
        address: string | null;
      };

      // Overdue schedules
      const { data: overdueScheds } = await supabase
        .from("loan_schedules")
        .select("due_date, total_amount, paid_amount")
        .eq("loan_id", loan.id)
        .eq("status", "overdue")
        .order("due_date", { ascending: true });

      const totalOverdue = (overdueScheds ?? []).reduce(
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

      // Last payment
      const { data: lastPayment } = await supabase
        .from("payments")
        .select("payment_date")
        .eq("loan_id", loan.id)
        .order("payment_date", { ascending: false })
        .limit(1);

      result.push({
        id: loan.id,
        loan_number: loan.loan_number,
        borrower_name: `${borrower.first_name} ${borrower.last_name}`,
        borrower_phone: borrower.phone,
        borrower_address: borrower.address,
        principal_amount: Number(loan.principal_amount),
        days_overdue: daysOverdue,
        total_overdue_amount: totalOverdue,
        last_payment_date: lastPayment?.[0]?.payment_date ?? null,
      });
    }

    result.sort((a, b) => b.days_overdue - a.days_overdue);

    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

// ---------- getBorrowerLedger ----------

export async function getBorrowerLedger(borrowerId: string) {
  try {
    const supabase = await createClient();

    // Borrower details
    const { data: borrower, error: bError } = await supabase
      .from("borrowers")
      .select("id, first_name, last_name, phone, email, address, status")
      .eq("id", borrowerId)
      .single();

    if (bError) throw bError;

    // All loans
    const { data: loans, error: lError } = await supabase
      .from("loans")
      .select(
        "id, loan_number, status, principal_amount, interest_rate, term_months, start_date"
      )
      .eq("borrower_id", borrowerId)
      .order("created_at", { ascending: false });

    if (lError) throw lError;

    let totalDisbursed = 0;
    let totalPaid = 0;

    const ledgerLoans: BorrowerLedgerLoan[] = [];

    for (const loan of loans ?? []) {
      const { data: payments } = await supabase
        .from("payments")
        .select("id, amount, payment_date, payment_method, reference_number")
        .eq("loan_id", loan.id)
        .order("payment_date", { ascending: true });

      const loanTotalPaid = (payments ?? []).reduce(
        (s, p) => s + Number(p.amount),
        0
      );

      const principal = Number(loan.principal_amount);
      const isDisbursed = ["active", "completed", "overdue"].includes(
        loan.status
      );

      if (isDisbursed) totalDisbursed += principal;
      totalPaid += loanTotalPaid;

      ledgerLoans.push({
        id: loan.id,
        loan_number: loan.loan_number,
        status: loan.status,
        principal_amount: principal,
        interest_rate: Number(loan.interest_rate),
        term_months: loan.term_months,
        start_date: loan.start_date,
        payments: (payments ?? []).map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          payment_date: p.payment_date,
          payment_method: p.payment_method,
          reference_number: p.reference_number,
        })),
        total_paid: loanTotalPaid,
        running_balance: principal - loanTotalPaid,
      });
    }

    const ledger: BorrowerLedger = {
      borrower,
      loans: ledgerLoans,
      totalDisbursed,
      totalPaid,
      totalOutstanding: totalDisbursed - totalPaid,
    };

    return { data: ledger, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

// ---------- getMonthlySummaryReport ----------

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export async function getMonthlySummaryReport(year: number) {
  try {
    const supabase = await createClient();

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    // Loans created this year
    const { data: loans } = await supabase
      .from("loans")
      .select("principal_amount, status, created_at")
      .gte("created_at", startDate)
      .lte("created_at", endDate + "T23:59:59");

    // Borrowers created this year
    const { data: borrowers } = await supabase
      .from("borrowers")
      .select("created_at")
      .gte("created_at", startDate)
      .lte("created_at", endDate + "T23:59:59");

    // Payments this year
    const { data: payments } = await supabase
      .from("payments")
      .select("amount, payment_date")
      .gte("payment_date", startDate)
      .lte("payment_date", endDate);

    // Schedules for outstanding calc
    const { data: schedules } = await supabase
      .from("loan_schedules")
      .select("total_amount, paid_amount, due_date, status")
      .gte("due_date", startDate)
      .lte("due_date", endDate);

    const result: MonthlySummaryRow[] = monthNames.map((month, i) => {
      const monthLoans = (loans ?? []).filter(
        (l) => new Date(l.created_at).getMonth() === i
      );
      const monthBorrowers = (borrowers ?? []).filter(
        (b) => new Date(b.created_at).getMonth() === i
      );
      const monthPayments = (payments ?? []).filter(
        (p) => new Date(p.payment_date).getMonth() === i
      );
      const monthSchedules = (schedules ?? []).filter(
        (s) => new Date(s.due_date).getMonth() === i
      );

      const disbursed = monthLoans
        .filter((l) =>
          ["active", "completed", "overdue"].includes(l.status)
        )
        .reduce((s, l) => s + Number(l.principal_amount), 0);

      const collected = monthPayments.reduce(
        (s, p) => s + Number(p.amount),
        0
      );

      const outstanding = monthSchedules.reduce(
        (s, sc) => s + (Number(sc.total_amount) - Number(sc.paid_amount)),
        0
      );

      const overdueCount = monthSchedules.filter(
        (sc) => sc.status === "overdue"
      ).length;

      return {
        month,
        newLoans: monthLoans.length,
        newBorrowers: monthBorrowers.length,
        disbursed,
        collected,
        outstanding: Math.max(0, outstanding),
        overdueCount,
      };
    });

    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

// ---------- getAgingReport ----------

export async function getAgingReport() {
  try {
    const supabase = await createClient();
    const today = new Date();

    const { data: loans, error } = await supabase
      .from("loans")
      .select(
        "id, loan_number, principal_amount, borrower:borrowers!inner(first_name, last_name)"
      )
      .eq("status", "overdue");

    if (error) throw error;

    const buckets: AgingBucket[] = [
      { bucket: "1-30 days", count: 0, totalAmount: 0, loans: [] },
      { bucket: "31-60 days", count: 0, totalAmount: 0, loans: [] },
      { bucket: "61-90 days", count: 0, totalAmount: 0, loans: [] },
      { bucket: "90+ days", count: 0, totalAmount: 0, loans: [] },
    ];

    for (const loan of loans ?? []) {
      const borrower = loan.borrower as unknown as {
        first_name: string;
        last_name: string;
      };

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

      const loanEntry = {
        id: loan.id,
        loan_number: loan.loan_number,
        borrower_name: `${borrower.first_name} ${borrower.last_name}`,
        principal_amount: Number(loan.principal_amount),
        overdue_amount: overdueAmount,
        days_overdue: daysOverdue,
      };

      let bucket: AgingBucket;
      if (daysOverdue <= 30) bucket = buckets[0];
      else if (daysOverdue <= 60) bucket = buckets[1];
      else if (daysOverdue <= 90) bucket = buckets[2];
      else bucket = buckets[3];

      bucket.count++;
      bucket.totalAmount += overdueAmount;
      bucket.loans.push(loanEntry);
    }

    // Sort loans within each bucket by days overdue desc
    for (const b of buckets) {
      b.loans.sort((a, b) => b.days_overdue - a.days_overdue);
    }

    return { data: buckets, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}
