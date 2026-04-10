"use client";

import { type ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { PaymentWithDetails, PaymentMethod } from "@/types/payment";

const methodConfig: Record<PaymentMethod, { label: string; className: string }> = {
  cash: { label: "Cash", className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400" },
  bank_transfer: { label: "Bank Transfer", className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400" },
  gcash: { label: "GCash", className: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400" },
  maya: { label: "Maya", className: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400" },
  check: { label: "Check", className: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400" },
  other: { label: "Other", className: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400" },
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export const paymentColumns: ColumnDef<PaymentWithDetails>[] = [
  {
    accessorKey: "payment_date",
    header: "Date",
    cell: ({ row }) => fmtDate(row.original.payment_date),
  },
  {
    id: "borrower_name",
    header: "Borrower",
    accessorFn: (row) =>
      `${row.borrower.first_name} ${row.borrower.last_name}`,
    cell: ({ row }) => {
      const b = row.original.borrower;
      return (
        <Link
          href={`/borrowers/${row.original.borrower_id}`}
          className="hover:underline"
        >
          {b.first_name} {b.last_name}
        </Link>
      );
    },
  },
  {
    id: "loan_number",
    header: "Loan",
    accessorFn: (row) => row.loan.loan_number,
    cell: ({ row }) => (
      <Link
        href={`/loans/${row.original.loan_id}`}
        className="font-medium hover:underline"
      >
        {row.original.loan.loan_number}
      </Link>
    ),
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => (
      <span className="font-semibold">
        {fmt(Number(row.original.amount))}
      </span>
    ),
  },
  {
    accessorKey: "payment_method",
    header: "Method",
    cell: ({ row }) => {
      const method = row.original.payment_method as PaymentMethod;
      const config = methodConfig[method] ?? methodConfig.other;
      return (
        <Badge variant="outline" className={config.className}>
          {config.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: "reference_number",
    header: "Reference",
    cell: ({ row }) => row.original.reference_number || "—",
  },
];
