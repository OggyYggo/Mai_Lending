"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { toast } from "sonner";

import { deletePayment } from "@/lib/actions/payments";
import type { PaymentWithDetails } from "@/types/payment";

import { DataTable } from "@/components/ui/data-table";
import { paymentColumns } from "./columns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SearchIcon, Trash2Icon, Loader2Icon } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);

const methods = [
  { value: "all", label: "All Methods" },
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "gcash", label: "GCash" },
  { value: "maya", label: "Maya" },
  { value: "check", label: "Check" },
  { value: "other", label: "Other" },
] as const;

function DeletePaymentCell({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    const { error } = await deletePayment(paymentId);
    if (error) {
      toast.error("Failed to delete payment", { description: error });
    } else {
      toast.success("Payment deleted and schedule reversed");
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button size="icon-sm" variant="ghost" className="text-destructive" />}>
        <Trash2Icon className="size-4" />
        <span className="sr-only">Delete</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Payment</AlertDialogTitle>
          <AlertDialogDescription>
            This will delete the payment and reverse the schedule update. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && <Loader2Icon className="size-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function PaymentsTable({ payments }: { payments: PaymentWithDetails[] }) {
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const tableRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (methodFilter !== "all" && p.payment_method !== methodFilter) return false;

      if (dateFrom && p.payment_date < dateFrom) return false;
      if (dateTo && p.payment_date > dateTo) return false;

      if (search) {
        const q = search.toLowerCase();
        const name = `${p.borrower.first_name} ${p.borrower.last_name}`.toLowerCase();
        const loanNum = p.loan.loan_number.toLowerCase();
        if (!name.includes(q) && !loanNum.includes(q)) return false;
      }

      return true;
    });
  }, [payments, search, methodFilter, dateFrom, dateTo]);

  const totalAmount = filtered.reduce((s, p) => s + Number(p.amount), 0);

  // Append actions column
  const columnsWithActions: ColumnDef<PaymentWithDetails>[] = useMemo(
    () => [
      ...paymentColumns,
      {
        id: "actions",
        header: "",
        cell: ({ row }) => <DeletePaymentCell paymentId={row.original.id} />,
      },
    ],
    []
  );

  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-row='borrower']",
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.3,
          stagger: 0.04,
          ease: "power2.out",
          delay: 0.1,
        }
      );
    }, el);
    return () => ctx.revert();
  }, [filtered]);

  return (
    <div ref={tableRef} className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="relative max-w-xs flex-1">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search borrower or loan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[150px]"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[150px]"
            />
          </div>

          <Select value={methodFilter} onValueChange={(v) => setMethodFilter(v ?? "all")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {methods.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(search || dateFrom || dateTo || methodFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setDateFrom("");
                setDateTo("");
                setMethodFilter("all");
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap items-center gap-4 rounded-md border bg-muted/50 px-4 py-3 text-sm">
        <span>
          Total Payments:{" "}
          <strong>{filtered.length}</strong>
        </span>
        <span className="text-muted-foreground">|</span>
        <span>
          Total Amount:{" "}
          <strong className="text-green-600">{fmt(totalAmount)}</strong>
        </span>
      </div>

      {/* Table */}
      <DataTable columns={columnsWithActions} data={filtered} />
    </div>
  );
}
