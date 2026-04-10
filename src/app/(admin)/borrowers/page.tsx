import { getBorrowers } from "@/lib/actions/borrowers";
import { BorrowersTable } from "./borrowers-table";

export default async function BorrowersPage() {
  const { data: borrowers, error } = await getBorrowers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Borrowers</h1>
        <p className="mt-1 text-muted-foreground">
          Manage borrower records and profiles.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load borrowers: {error}
        </div>
      ) : (
        <BorrowersTable borrowers={borrowers ?? []} />
      )}
    </div>
  );
}
