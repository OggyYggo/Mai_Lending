"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { CheckCircleIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UpcomingDue } from "@/lib/actions/dashboard";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

function getRowClass(due: UpcomingDue) {
  const today = new Date().toISOString().split("T")[0];
  if (due.status === "overdue") return "bg-red-50 dark:bg-red-950/20";
  if (due.due_date === today) return "bg-amber-50 dark:bg-amber-950/20";
  return "";
}

function getDaysBadge(due: UpcomingDue) {
  const today = new Date();
  const dueDate = new Date(due.due_date);
  const diff = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (due.status === "overdue") {
    const overdue = -diff;
    return (
      <Badge variant="destructive" className="text-xs">
        {overdue} day{overdue !== 1 ? "s" : ""} overdue
      </Badge>
    );
  }
  if (diff === 0) {
    return <Badge variant="secondary" className="text-xs">Due today</Badge>;
  }
  if (diff <= 3) {
    return (
      <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400">
        Due in {diff} day{diff !== 1 ? "s" : ""}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs">
      Due in {diff} day{diff !== 1 ? "s" : ""}
    </Badge>
  );
}

function getStatusBadge(status: string) {
  switch (status) {
    case "overdue":
      return (
        <Badge variant="destructive" className="text-xs">
          Overdue
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="secondary" className="text-xs">
          Pending
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs">
          {status}
        </Badge>
      );
  }
}

interface UpcomingDuesProps {
  dues: UpcomingDue[];
}

export function UpcomingDues({ dues }: UpcomingDuesProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!listRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-due-row]",
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          stagger: 0.06,
          ease: "power3.out",
        }
      );
    }, listRef);
    return () => ctx.revert();
  }, [dues]);

  if (dues.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Upcoming Dues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircleIcon className="size-8 text-green-600" />
            <p className="text-sm text-muted-foreground">
              No upcoming dues in the next 7 days
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Upcoming Dues</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={listRef}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Borrower</TableHead>
                <TableHead>Loan #</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dues.map((due) => (
                <TableRow
                  key={due.id}
                  data-due-row
                  className={getRowClass(due)}
                >
                  <TableCell className="font-medium">
                    {due.borrower_name}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {due.loan_number}
                  </TableCell>
                  <TableCell>{fmtDate(due.due_date)}</TableCell>
                  <TableCell className="font-semibold">
                    {fmt(due.total_amount - due.paid_amount)}
                  </TableCell>
                  <TableCell>{getStatusBadge(due.status)}</TableCell>
                  <TableCell>{getDaysBadge(due)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
