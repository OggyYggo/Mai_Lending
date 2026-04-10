"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import Link from "next/link";
import { DataTable } from "@/components/ui/data-table";
import { loanColumns } from "./columns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusIcon, SearchIcon } from "lucide-react";
import type { LoanWithBorrower } from "@/types/loan";

const statusTabs = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "overdue", label: "Overdue" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
] as const;

export function LoansTable({ loans }: { loans: LoanWithBorrower[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const tableRef = useRef<HTMLDivElement>(null);

  const filtered = loans.filter((loan) => {
    if (statusFilter !== "all" && loan.status !== statusFilter) return false;

    if (search) {
      const q = search.toLowerCase();
      const borrowerName =
        `${loan.borrower.first_name} ${loan.borrower.last_name}`.toLowerCase();
      const loanNum = loan.loan_number.toLowerCase();
      if (!borrowerName.includes(q) && !loanNum.includes(q)) return false;
    }

    return true;
  });

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
      {/* Tabs */}
      <Tabs
        value={statusFilter}
        onValueChange={(val) => {
          if (val != null) setStatusFilter(String(val));
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            {statusTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <Button render={<Link href="/loans/new" />}>
            <PlusIcon className="size-4" />
            Create Loan
          </Button>
        </div>
      </Tabs>

      {/* Search */}
      <div className="relative max-w-sm">
        <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by loan number or borrower..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <DataTable columns={loanColumns} data={filtered} />

      <p className="text-sm text-muted-foreground">
        {filtered.length} loan{filtered.length !== 1 ? "s" : ""} found
      </p>
    </div>
  );
}
