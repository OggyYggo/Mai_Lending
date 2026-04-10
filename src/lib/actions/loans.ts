"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calculateAmortization } from "@/lib/loan-utils";
import type {
  Loan,
  LoanWithBorrower,
  LoanSchedule,
} from "@/types/loan";

interface LoanFilters {
  status?: string;
  borrowerId?: string;
  search?: string;
}

export async function getLoans(filters?: LoanFilters) {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("loans")
      .select("*, borrower:borrowers!inner(first_name, last_name, phone)")
      .order("created_at", { ascending: false });

    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    if (filters?.borrowerId) {
      query = query.eq("borrower_id", filters.borrowerId);
    }

    if (filters?.search) {
      query = query.or(
        `loan_number.ilike.%${filters.search}%,borrowers.first_name.ilike.%${filters.search}%,borrowers.last_name.ilike.%${filters.search}%`,
        { referencedTable: undefined }
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    return { data: data as LoanWithBorrower[], error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function getLoanById(id: string) {
  try {
    const supabase = await createClient();

    const { data: loan, error: loanError } = await supabase
      .from("loans")
      .select("*, borrower:borrowers!inner(first_name, last_name, phone)")
      .eq("id", id)
      .single();

    if (loanError) throw loanError;

    const { data: schedules, error: schedError } = await supabase
      .from("loan_schedules")
      .select("*")
      .eq("loan_id", id)
      .order("installment_number", { ascending: true });

    if (schedError) throw schedError;

    return {
      data: {
        ...(loan as LoanWithBorrower),
        schedules: (schedules ?? []) as LoanSchedule[],
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

interface CreateLoanInput {
  borrower_id: string;
  principal_amount: number;
  interest_rate: number;
  interest_type: "flat" | "diminishing";
  term_months: number;
  payment_frequency: "weekly" | "bi-weekly" | "monthly";
  purpose?: string | null;
  start_date: string;
  notes?: string | null;
}

export async function createLoan(data: CreateLoanInput) {
  try {
    const supabase = await createClient();

    // Generate loan number from sequence
    const seqResult = await supabase.rpc("nextval_loan_number").maybeSingle();

    let loanNumber: string;

    if (seqResult.error || seqResult.data == null) {
      // Fallback: use timestamp-based number
      const year = new Date().getFullYear();
      const ts = Date.now().toString().slice(-4);
      loanNumber = `LN-${year}-${ts}`;
    } else {
      const year = new Date().getFullYear();
      loanNumber = `LN-${year}-${String(seqResult.data).padStart(3, "0")}`;
    }

    // Calculate end date
    const startDate = new Date(data.start_date);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + data.term_months);

    // Insert loan
    const { data: loan, error: loanError } = await supabase
      .from("loans")
      .insert({
        borrower_id: data.borrower_id,
        loan_number: loanNumber,
        principal_amount: data.principal_amount,
        interest_rate: data.interest_rate,
        interest_type: data.interest_type,
        term_months: data.term_months,
        payment_frequency: data.payment_frequency,
        status: "pending",
        purpose: data.purpose ?? null,
        start_date: data.start_date,
        end_date: endDate.toISOString().split("T")[0],
        notes: data.notes ?? null,
      })
      .select()
      .single();

    if (loanError) throw loanError;

    // Generate amortization schedule
    const installments = calculateAmortization({
      principal: data.principal_amount,
      interestRate: data.interest_rate,
      termMonths: data.term_months,
      interestType: data.interest_type,
      startDate,
      paymentFrequency: data.payment_frequency,
    });

    const scheduleRows = installments.map((inst) => ({
      loan_id: loan.id,
      installment_number: inst.installmentNumber,
      due_date: inst.dueDate.toISOString().split("T")[0],
      principal_amount: inst.principalAmount,
      interest_amount: inst.interestAmount,
      total_amount: inst.totalAmount,
      paid_amount: 0,
      status: "pending",
    }));

    const { error: schedError } = await supabase
      .from("loan_schedules")
      .insert(scheduleRows);

    if (schedError) throw schedError;

    revalidatePath("/loans");
    return { data: loan as Loan, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function approveLoan(id: string, startDate: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Fetch loan to get term
    const { data: existing, error: fetchError } = await supabase
      .from("loans")
      .select("term_months, payment_frequency, principal_amount, interest_rate, interest_type")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    const start = new Date(startDate);
    const endDate = new Date(start);
    endDate.setMonth(endDate.getMonth() + existing.term_months);

    // Update loan
    const { data: loan, error: loanError } = await supabase
      .from("loans")
      .update({
        status: "approved",
        approved_by: user?.id ?? null,
        approved_at: new Date().toISOString(),
        start_date: startDate,
        end_date: endDate.toISOString().split("T")[0],
      })
      .eq("id", id)
      .select()
      .single();

    if (loanError) throw loanError;

    // Recalculate schedule due dates from new start date
    const installments = calculateAmortization({
      principal: existing.principal_amount,
      interestRate: existing.interest_rate,
      termMonths: existing.term_months,
      interestType: existing.interest_type,
      startDate: start,
      paymentFrequency: existing.payment_frequency,
    });

    // Delete old schedules and insert new ones
    await supabase.from("loan_schedules").delete().eq("loan_id", id);

    const scheduleRows = installments.map((inst) => ({
      loan_id: id,
      installment_number: inst.installmentNumber,
      due_date: inst.dueDate.toISOString().split("T")[0],
      principal_amount: inst.principalAmount,
      interest_amount: inst.interestAmount,
      total_amount: inst.totalAmount,
      paid_amount: 0,
      status: "pending",
    }));

    const { error: schedError } = await supabase
      .from("loan_schedules")
      .insert(scheduleRows);

    if (schedError) throw schedError;

    revalidatePath("/loans");
    revalidatePath(`/loans/${id}`);
    return { data: loan as Loan, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function rejectLoan(id: string, reason: string) {
  try {
    const supabase = await createClient();

    const { data: loan, error } = await supabase
      .from("loans")
      .update({
        status: "rejected",
        rejection_reason: reason,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/loans");
    revalidatePath(`/loans/${id}`);
    return { data: loan as Loan, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function activateLoan(id: string) {
  try {
    const supabase = await createClient();

    const { data: loan, error } = await supabase
      .from("loans")
      .update({ status: "active" })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/loans");
    revalidatePath(`/loans/${id}`);
    return { data: loan as Loan, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function checkAndUpdateOverdueLoans() {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split("T")[0];

    // Update overdue schedules
    const { error: schedError } = await supabase
      .from("loan_schedules")
      .update({ status: "overdue" })
      .eq("status", "pending")
      .lt("due_date", today);

    if (schedError) throw schedError;

    // Find active loans that have overdue schedules
    const { data: overdueSchedules, error: fetchError } = await supabase
      .from("loan_schedules")
      .select("loan_id")
      .eq("status", "overdue");

    if (fetchError) throw fetchError;

    const loanIds = [...new Set(overdueSchedules?.map((s) => s.loan_id) ?? [])];

    if (loanIds.length > 0) {
      const { error: loanError } = await supabase
        .from("loans")
        .update({ status: "overdue" })
        .eq("status", "active")
        .in("id", loanIds);

      if (loanError) throw loanError;
    }

    revalidatePath("/loans");
    return { data: { updatedLoans: loanIds.length }, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}
