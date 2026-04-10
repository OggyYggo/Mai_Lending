import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const today = new Date().toISOString().split("T")[0];

    // 1. Mark overdue schedules
    const { error: schedError, count: schedCount } = await supabase
      .from("loan_schedules")
      .update({ status: "overdue" })
      .eq("status", "pending")
      .lt("due_date", today);

    if (schedError) throw schedError;

    // 2. Mark active loans with overdue schedules
    const { data: overdueSchedules, error: fetchError } = await supabase
      .from("loan_schedules")
      .select("loan_id")
      .eq("status", "overdue");

    if (fetchError) throw fetchError;

    const overdueLoanIds = [
      ...new Set(overdueSchedules?.map((s) => s.loan_id) ?? []),
    ];

    let loansMarkedOverdue = 0;
    if (overdueLoanIds.length > 0) {
      const { count } = await supabase
        .from("loans")
        .update({ status: "overdue" })
        .eq("status", "active")
        .in("id", overdueLoanIds);
      loansMarkedOverdue = count ?? 0;
    }

    // 3. Complete loans where all schedules are paid
    const { data: overdueLoanRows, error: olError } = await supabase
      .from("loans")
      .select("id")
      .eq("status", "overdue");

    if (olError) throw olError;

    let loansCompleted = 0;
    for (const loan of overdueLoanRows ?? []) {
      const { data: unpaid } = await supabase
        .from("loan_schedules")
        .select("id")
        .eq("loan_id", loan.id)
        .neq("status", "paid")
        .limit(1);

      if (!unpaid || unpaid.length === 0) {
        await supabase
          .from("loans")
          .update({ status: "completed" })
          .eq("id", loan.id);
        loansCompleted++;
      }
    }

    return NextResponse.json({
      success: true,
      schedulesMarkedOverdue: schedCount ?? 0,
      loansMarkedOverdue,
      loansCompleted,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
