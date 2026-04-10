"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PaymentWithDetails, PaymentSummary } from "@/types/payment";

interface PaymentFilters {
  loanId?: string;
  borrowerId?: string;
  dateFrom?: string;
  dateTo?: string;
  method?: string;
}

export async function getPayments(filters?: PaymentFilters) {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("payments")
      .select(
        "*, borrower:borrowers!inner(first_name, last_name), loan:loans!inner(loan_number)"
      )
      .order("payment_date", { ascending: false });

    if (filters?.loanId) {
      query = query.eq("loan_id", filters.loanId);
    }
    if (filters?.borrowerId) {
      query = query.eq("borrower_id", filters.borrowerId);
    }
    if (filters?.dateFrom) {
      query = query.gte("payment_date", filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte("payment_date", filters.dateTo);
    }
    if (filters?.method && filters.method !== "all") {
      query = query.eq("payment_method", filters.method);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { data: data as PaymentWithDetails[], error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function getPaymentsByLoan(loanId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("payments")
      .select(
        "*, borrower:borrowers!inner(first_name, last_name), loan:loans!inner(loan_number), schedule:loan_schedules(installment_number, due_date, total_amount)"
      )
      .eq("loan_id", loanId)
      .order("payment_date", { ascending: false });

    if (error) throw error;

    return { data: data ?? [], error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

interface RecordPaymentInput {
  loan_id: string;
  loan_schedule_id: string;
  borrower_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string | null;
  notes?: string | null;
}

export async function recordPayment(data: RecordPaymentInput) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Insert payment record
    const { data: payment, error: insertError } = await supabase
      .from("payments")
      .insert({
        loan_id: data.loan_id,
        loan_schedule_id: data.loan_schedule_id,
        borrower_id: data.borrower_id,
        amount: data.amount,
        payment_date: data.payment_date,
        payment_method: data.payment_method,
        reference_number: data.reference_number ?? null,
        notes: data.notes ?? null,
        recorded_by: user?.id ?? null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Call process_payment() to update schedule & loan status
    const { error: rpcError } = await supabase.rpc("process_payment", {
      p_loan_id: data.loan_id,
      p_loan_schedule_id: data.loan_schedule_id,
      p_amount: data.amount,
      p_payment_date: data.payment_date,
      p_payment_method: data.payment_method,
      p_reference_number: data.reference_number ?? null,
      p_notes: data.notes ?? null,
      p_borrower_id: data.borrower_id,
    });

    if (rpcError) throw rpcError;

    revalidatePath("/payments");
    revalidatePath(`/loans/${data.loan_id}`);
    revalidatePath("/loans");
    revalidatePath("/dashboard");

    return { data: payment, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function deletePayment(id: string) {
  try {
    const supabase = await createClient();

    // Fetch payment to get schedule and amount details
    const { data: payment, error: fetchError } = await supabase
      .from("payments")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    // Reverse the schedule update
    if (payment.loan_schedule_id) {
      const { data: schedule, error: schedFetchError } = await supabase
        .from("loan_schedules")
        .select("paid_amount, total_amount")
        .eq("id", payment.loan_schedule_id)
        .single();

      if (schedFetchError) throw schedFetchError;

      const newPaid = Math.max(0, Number(schedule.paid_amount) - Number(payment.amount));
      let newStatus: string;
      if (newPaid <= 0) {
        // Check if overdue
        const today = new Date().toISOString().split("T")[0];
        const { data: sched } = await supabase
          .from("loan_schedules")
          .select("due_date")
          .eq("id", payment.loan_schedule_id)
          .single();
        newStatus = sched && sched.due_date < today ? "overdue" : "pending";
      } else if (newPaid >= Number(schedule.total_amount)) {
        newStatus = "paid";
      } else {
        newStatus = "partial";
      }

      const { error: schedUpdateError } = await supabase
        .from("loan_schedules")
        .update({
          paid_amount: newPaid,
          status: newStatus,
          paid_at: newStatus === "paid" ? new Date().toISOString() : null,
        })
        .eq("id", payment.loan_schedule_id);

      if (schedUpdateError) throw schedUpdateError;

      // If loan was completed, revert to active
      const { data: loan } = await supabase
        .from("loans")
        .select("status")
        .eq("id", payment.loan_id)
        .single();

      if (loan?.status === "completed") {
        await supabase
          .from("loans")
          .update({ status: "active" })
          .eq("id", payment.loan_id);
      }
    }

    // Delete the payment
    const { error: deleteError } = await supabase
      .from("payments")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    revalidatePath("/payments");
    revalidatePath(`/loans/${payment.loan_id}`);
    revalidatePath("/loans");
    revalidatePath("/dashboard");

    return { data: { id }, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function getPaymentSummary(dateFrom?: string, dateTo?: string) {
  try {
    const supabase = await createClient();

    // Total collected
    let paymentsQuery = supabase.from("payments").select("amount");
    if (dateFrom) paymentsQuery = paymentsQuery.gte("payment_date", dateFrom);
    if (dateTo) paymentsQuery = paymentsQuery.lte("payment_date", dateTo);
    const { data: payments, error: pError } = await paymentsQuery;
    if (pError) throw pError;

    const totalCollected = (payments ?? []).reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );

    // Pending schedules (status = pending)
    const { data: pendingSchedules, error: pendError } = await supabase
      .from("loan_schedules")
      .select("total_amount, paid_amount")
      .eq("status", "pending");
    if (pendError) throw pendError;

    const totalPending = (pendingSchedules ?? []).reduce(
      (sum, s) => sum + (Number(s.total_amount) - Number(s.paid_amount)),
      0
    );

    // Overdue schedules
    const { data: overdueSchedules, error: overdueError } = await supabase
      .from("loan_schedules")
      .select("total_amount, paid_amount")
      .eq("status", "overdue");
    if (overdueError) throw overdueError;

    const totalOverdue = (overdueSchedules ?? []).reduce(
      (sum, s) => sum + (Number(s.total_amount) - Number(s.paid_amount)),
      0
    );

    // Collection rate
    const totalExpected = totalCollected + totalPending + totalOverdue;
    const collectionRate =
      totalExpected > 0
        ? Math.round((totalCollected / totalExpected) * 10000) / 100
        : 0;

    const summary: PaymentSummary = {
      totalCollected,
      totalPending,
      totalOverdue,
      collectionRate,
    };

    return { data: summary, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}
