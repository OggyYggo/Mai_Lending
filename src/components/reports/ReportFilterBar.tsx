"use client";

import { useCallback, useEffect, useState } from "react";
import { FilterIcon, XIcon, Loader2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------- Types ----------

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  method?: string;
  borrowerSearch?: string;
  year?: number;
}

interface FilterVisibility {
  showDateRange?: boolean;
  showStatus?: boolean;
  showMethod?: boolean;
  showBorrower?: boolean;
  showYear?: boolean;
}

interface ReportFilterBarProps {
  onFilter: (filters: ReportFilters) => void;
  filters: FilterVisibility;
  isLoading?: boolean;
}

const loanStatuses = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "active", label: "Active" },
  { value: "overdue", label: "Overdue" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
];

const paymentMethods = [
  { value: "all", label: "All Methods" },
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "gcash", label: "GCash" },
  { value: "maya", label: "Maya" },
  { value: "check", label: "Check" },
  { value: "other", label: "Other" },
];

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

const empty: ReportFilters = {
  dateFrom: "",
  dateTo: "",
  status: "all",
  method: "all",
  borrowerSearch: "",
  year: currentYear,
};

// ---------- Component ----------

export function ReportFilterBar({
  onFilter,
  filters: visibility,
  isLoading,
}: ReportFilterBarProps) {
  const [values, setValues] = useState<ReportFilters>({ ...empty });
  const [debouncedBorrower, setDebouncedBorrower] = useState("");

  // Debounce borrower search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedBorrower(values.borrowerSearch ?? "");
    }, 350);
    return () => clearTimeout(t);
  }, [values.borrowerSearch]);

  const set = useCallback(
    (key: keyof ReportFilters, val: string | number | undefined) => {
      setValues((prev) => ({ ...prev, [key]: val }));
    },
    []
  );

  const activeCount = [
    values.dateFrom,
    values.dateTo,
    values.status && values.status !== "all" ? values.status : "",
    values.method && values.method !== "all" ? values.method : "",
    debouncedBorrower,
    values.year !== currentYear ? String(values.year) : "",
  ].filter(Boolean).length;

  const handleApply = () => {
    onFilter({
      ...values,
      borrowerSearch: debouncedBorrower,
    });
  };

  const handleReset = () => {
    setValues({ ...empty });
    setDebouncedBorrower("");
    onFilter({ ...empty });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Date Range */}
          {visibility.showDateRange && (
            <>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input
                  type="date"
                  value={values.dateFrom ?? ""}
                  onChange={(e) => set("dateFrom", e.target.value)}
                  className="w-[150px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input
                  type="date"
                  value={values.dateTo ?? ""}
                  onChange={(e) => set("dateTo", e.target.value)}
                  className="w-[150px]"
                />
              </div>
            </>
          )}

          {/* Status */}
          {visibility.showStatus && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select
                value={values.status ?? "all"}
                onValueChange={(v) => set("status", v ?? "all")}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {loanStatuses.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Payment Method */}
          {visibility.showMethod && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Method</Label>
              <Select
                value={values.method ?? "all"}
                onValueChange={(v) => set("method", v ?? "all")}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Borrower Search */}
          {visibility.showBorrower && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Borrower</Label>
              <Input
                placeholder="Search borrower..."
                value={values.borrowerSearch ?? ""}
                onChange={(e) => set("borrowerSearch", e.target.value)}
                className="w-[180px]"
              />
            </div>
          )}

          {/* Year */}
          {visibility.showYear && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Year</Label>
              <Select
                value={String(values.year ?? currentYear)}
                onValueChange={(v) => set("year", v ? Number(v) : currentYear)}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleApply} disabled={isLoading}>
              {isLoading ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <FilterIcon className="size-4" />
              )}
              Apply
              {activeCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 size-5 justify-center rounded-full p-0 text-[10px]"
                >
                  {activeCount}
                </Badge>
              )}
            </Button>

            {activeCount > 0 && (
              <Button size="sm" variant="ghost" onClick={handleReset}>
                <XIcon className="size-4" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Loading skeleton ----------

export function ReportTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-10 animate-pulse rounded-md bg-muted/60"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}
