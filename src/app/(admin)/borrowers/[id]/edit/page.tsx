import { notFound } from "next/navigation";
import { getBorrowerById } from "@/lib/actions/borrowers";
import { BorrowerForm } from "../../borrower-form";

export default async function EditBorrowerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: borrower, error } = await getBorrowerById(id);

  if (error || !borrower) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Borrower</h1>
        <p className="mt-1 text-muted-foreground">
          Update {borrower.first_name} {borrower.last_name}&apos;s profile.
        </p>
      </div>
      <BorrowerForm mode="edit" borrower={borrower} />
    </div>
  );
}
