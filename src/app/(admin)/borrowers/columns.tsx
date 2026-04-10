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
import { MoreHorizontalIcon, EyeIcon, PencilIcon, Trash2Icon } from "lucide-react";
import type { Borrower, BorrowerStatus } from "@/types/borrower";

const statusVariant: Record<BorrowerStatus, "default" | "secondary" | "destructive"> = {
  active: "default",
  inactive: "secondary",
  blacklisted: "destructive",
};

export const borrowerColumns: ColumnDef<Borrower>[] = [
  {
    id: "full_name",
    header: "Full Name",
    accessorFn: (row) => `${row.first_name} ${row.last_name}`,
    cell: ({ row }) => (
      <Link
        href={`/borrowers/${row.original.id}`}
        className="font-medium hover:underline"
      >
        {row.original.first_name} {row.original.last_name}
      </Link>
    ),
    filterFn: (row, _columnId, filterValue: string) => {
      const fullName =
        `${row.original.first_name} ${row.original.last_name}`.toLowerCase();
      const phone = row.original.phone?.toLowerCase() ?? "";
      const search = filterValue.toLowerCase();
      return fullName.includes(search) || phone.includes(search);
    },
  },
  {
    accessorKey: "phone",
    header: "Phone",
  },
  {
    accessorKey: "id_type",
    header: "ID Type",
    cell: ({ row }) => row.original.id_type ?? "—",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge variant={statusVariant[status]} className="capitalize">
          {status}
        </Badge>
      );
    },
    filterFn: (row, _columnId, filterValue: string) => {
      if (!filterValue || filterValue === "all") return true;
      return row.original.status === filterValue;
    },
  },
  {
    accessorKey: "monthly_income",
    header: "Monthly Income",
    cell: ({ row }) => {
      const income = row.original.monthly_income;
      if (income == null) return "—";
      return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
      }).format(income);
    },
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    cell: ({ row }) =>
      new Date(row.original.created_at).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const borrower = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
            <MoreHorizontalIcon className="size-4" />
            <span className="sr-only">Actions</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={`/borrowers/${borrower.id}`} />}>
              <EyeIcon className="size-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href={`/borrowers/${borrower.id}/edit`} />}>
              <PencilIcon className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2Icon className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
