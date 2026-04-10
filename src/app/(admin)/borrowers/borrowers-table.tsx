"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import Link from "next/link";
import { DataTable } from "@/components/ui/data-table";
import { borrowerColumns } from "./columns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusIcon, SearchIcon } from "lucide-react";
import type { Borrower } from "@/types/borrower";

export function BorrowersTable({ borrowers }: { borrowers: Borrower[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const tableRef = useRef<HTMLDivElement>(null);

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
  }, [borrowers, search, statusFilter]);

  const filtered = borrowers.filter((b) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;

    if (search) {
      const q = search.toLowerCase();
      const fullName = `${b.first_name} ${b.last_name}`.toLowerCase();
      const phone = b.phone?.toLowerCase() ?? "";
      if (!fullName.includes(q) && !phone.includes(q)) return false;
    }

    return true;
  });

  return (
    <div ref={tableRef} className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="blacklisted">Blacklisted</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button render={<Link href="/borrowers/new" />}>
          <PlusIcon className="size-4" />
          Add Borrower
        </Button>
      </div>

      <DataTable columns={borrowerColumns} data={filtered} />

      <p className="text-sm text-muted-foreground">
        {filtered.length} borrower{filtered.length !== 1 ? "s" : ""} found
      </p>
    </div>
  );
}
