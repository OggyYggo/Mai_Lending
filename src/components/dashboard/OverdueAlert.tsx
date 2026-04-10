"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { AlertTriangleIcon, ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OverdueLoan } from "@/lib/actions/dashboard";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);

interface OverdueAlertProps {
  overdueLoans: OverdueLoan[];
}

export function OverdueAlert({ overdueLoans }: OverdueAlertProps) {
  const alertRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!alertRef.current || overdueLoans.length === 0) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        alertRef.current,
        { x: -20, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, ease: "power3.out" }
      );
    }, alertRef);
    return () => ctx.revert();
  }, [overdueLoans.length]);

  if (overdueLoans.length === 0) return null;

  const totalOverdue = overdueLoans.reduce((s, l) => s + l.overdue_amount, 0);

  return (
    <div
      ref={alertRef}
      className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30"
    >
      <div className="flex items-start gap-3">
        <AlertTriangleIcon className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400" />
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              {overdueLoans.length} loan{overdueLoans.length !== 1 ? "s" : ""}{" "}
              {overdueLoans.length !== 1 ? "are" : "is"} overdue totaling{" "}
              <span className="font-bold">{fmt(totalOverdue)}</span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-red-700 dark:text-red-400"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? "Collapse" : "Details"}
                <ChevronDownIcon
                  className={`ml-1 size-3.5 transition-transform duration-200 ${
                    expanded ? "rotate-180" : ""
                  }`}
                />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs"
                render={<Link href="/loans?status=overdue" />}
              >
                View All Overdue
              </Button>
            </div>
          </div>

          {expanded && (
            <div className="space-y-2 border-t border-red-200 pt-3 dark:border-red-800">
              {overdueLoans.map((loan) => (
                <div
                  key={loan.id}
                  className="flex items-center justify-between rounded-md bg-white/60 px-3 py-2 text-sm dark:bg-red-950/20"
                >
                  <div>
                    <Link
                      href={`/loans/${loan.id}`}
                      className="font-medium text-red-800 hover:underline dark:text-red-300"
                    >
                      {loan.borrower_name}
                    </Link>
                    <span className="ml-2 text-xs text-red-600/80 dark:text-red-400/80">
                      {loan.loan_number}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <span className="text-xs text-red-600 dark:text-red-400">
                      {loan.days_overdue} day{loan.days_overdue !== 1 ? "s" : ""}
                    </span>
                    <span className="font-semibold text-red-800 dark:text-red-300">
                      {fmt(loan.overdue_amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
