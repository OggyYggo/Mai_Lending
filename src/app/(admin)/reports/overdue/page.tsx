import { getOverdueReport, getAgingReport } from "@/lib/actions/reports";
import { OverdueReport } from "./overdue-report";

export default async function OverdueReportPage() {
  const [overdueResult, agingResult] = await Promise.all([
    getOverdueReport(),
    getAgingReport(),
  ]);

  return (
    <OverdueReport
      overdueData={overdueResult.data ?? []}
      agingData={
        agingResult.data ?? [
          { bucket: "1-30 days", count: 0, totalAmount: 0, loans: [] },
          { bucket: "31-60 days", count: 0, totalAmount: 0, loans: [] },
          { bucket: "61-90 days", count: 0, totalAmount: 0, loans: [] },
          { bucket: "90+ days", count: 0, totalAmount: 0, loans: [] },
        ]
      }
    />
  );
}
