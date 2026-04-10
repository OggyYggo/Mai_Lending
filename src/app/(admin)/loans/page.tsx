import { getLoans, checkAndUpdateOverdueLoans } from "@/lib/actions/loans";
import { LoansTable } from "./loans-table";

export default async function LoansPage() {
  // Fallback: check for overdue loans on every page load
  await checkAndUpdateOverdueLoans();

  const { data: loans, error } = await getLoans();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Loans</h1>
        <p className="mt-1 text-muted-foreground">
          Manage loan applications and active loans.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load loans: {error}
        </div>
      ) : (
        <LoansTable loans={loans ?? []} />
      )}
    </div>
  );
}
