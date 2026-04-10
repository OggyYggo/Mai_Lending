import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLoanById } from "@/lib/actions/loans";
import { LoanDetail } from "./loan-detail";

export default async function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: loan, error } = await getLoanById(id);

  if (error || !loan) {
    notFound();
  }

  // Fetch payments for this loan (ordered by date asc for running balance calc)
  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, payment_date, payment_method, reference_number, notes, created_at")
    .eq("loan_id", id)
    .order("payment_date", { ascending: true });

  return <LoanDetail loan={loan} payments={payments ?? []} />;
}
