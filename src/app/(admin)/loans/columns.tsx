"use client";

import { type ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontalIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "lucide-react";
import type { LoanWithBorrower, LoanStatus } from "@/types/loan";

const statusConfig: Record<
  LoanStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
  },
  approved: {
    label: "Approved",
    className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  },
  active: {
    label: "Active",
    className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  },
  overdue: {
    label: "Overdue",
    className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400",
  },
  completed: {
    label: "Completed",
    className: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400",
  },
  rejected: {
    label: "Rejected",
    className: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400",
  },
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);

const formatDate = (date: string | null) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const loanColumns: ColumnDef<LoanWithBorrower>[] = [
  {
    accessorKey: "loan_number",
    header: "Loan Number",
    cell: ({ row }) => (
      <Link
        href={`/loans/${row.original.id}`}
        className="font-medium hover:underline"
      >
        {row.original.loan_number}
      </Link>
    ),
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
    accessorKey: "principal_amount",
    header: "Principal",
    cell: ({ row }) => formatCurrency(Number(row.original.principal_amount)),
  },
  {
    accessorKey: "interest_rate",
    header: "Rate",
    cell: ({ row }) => `${row.original.interest_rate}%`,
  },
  {
    accessorKey: "term_months",
    header: "Term",
    cell: ({ row }) => `${row.original.term_months}mo`,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      const config = statusConfig[status];
      return (
        <Badge variant="outline" className={config.className}>
          {config.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: "start_date",
    header: "Start Date",
    cell: ({ row }) => formatDate(row.original.start_date),
  },
  {
    accessorKey: "end_date",
    header: "Due Date",
    cell: ({ row }) => formatDate(row.original.end_date),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const loan = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
            <MoreHorizontalIcon className="size-4" />
            <span className="sr-only">Actions</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={`/loans/${loan.id}`} />}>
              <EyeIcon className="size-4" />
              View
            </DropdownMenuItem>
            {loan.status === "pending" && (
              <>
                <DropdownMenuItem render={<Link href={`/loans/${loan.id}?action=approve`} />}>
                  <CheckCircleIcon className="size-4" />
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" render={<Link href={`/loans/${loan.id}?action=reject`} />}>
                  <XCircleIcon className="size-4" />
                  Reject
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
