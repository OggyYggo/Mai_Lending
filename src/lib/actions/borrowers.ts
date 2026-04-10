"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Borrower, CreateBorrowerInput, UpdateBorrowerInput } from "@/types/borrower";

export async function getBorrowers(search?: string) {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("borrowers")
      .select("*")
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    return { data: data as Borrower[], error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function getBorrowerById(id: string) {
  try {
    const supabase = await createClient();

    const { data: borrower, error: borrowerError } = await supabase
      .from("borrowers")
      .select("*")
      .eq("id", id)
      .single();

    if (borrowerError) throw borrowerError;

    const { data: loans, error: loansError } = await supabase
      .from("loans")
      .select("id, loan_amount")
      .eq("borrower_id", id);

    if (loansError) throw loansError;

    const loanCount = loans?.length ?? 0;
    const totalBorrowed = loans?.reduce(
      (sum, loan) => sum + Number(loan.loan_amount),
      0
    ) ?? 0;

    return {
      data: {
        ...(borrower as Borrower),
        loan_count: loanCount,
        total_borrowed: totalBorrowed,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function createBorrower(data: CreateBorrowerInput) {
  try {
    const supabase = await createClient();

    const { data: borrower, error } = await supabase
      .from("borrowers")
      .insert(data)
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/borrowers");
    return { data: borrower as Borrower, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function updateBorrower(id: string, data: Omit<UpdateBorrowerInput, "id">) {
  try {
    const supabase = await createClient();

    const { data: borrower, error } = await supabase
      .from("borrowers")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/borrowers");
    revalidatePath(`/borrowers/${id}`);
    return { data: borrower as Borrower, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function deleteBorrower(id: string) {
  try {
    const supabase = await createClient();

    const { data: borrower, error } = await supabase
      .from("borrowers")
      .update({ status: "inactive" })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/borrowers");
    return { data: borrower as Borrower, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}
