import { getPayments } from "@/lib/actions/payments";
import { PaymentsTable } from "./payments-table";

export default async function PaymentsPage() {
  const { data: payments, error } = await getPayments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payments</h1>
        <p className="mt-1 text-muted-foreground">
          Track and manage payment transactions.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load payments: {error}
        </div>
      ) : (
        <PaymentsTable payments={payments ?? []} />
      )}
    </div>
  );
}
