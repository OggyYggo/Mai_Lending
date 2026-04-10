import { BorrowerForm } from "../borrower-form";

export default function NewBorrowerPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Add Borrower</h1>
        <p className="mt-1 text-muted-foreground">
          Create a new borrower profile.
        </p>
      </div>
      <BorrowerForm mode="create" />
    </div>
  );
}
