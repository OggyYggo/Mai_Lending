import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// ---------- Currency & Date Formatting ----------

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
}

export function formatReportDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ---------- Excel Export ----------

const CURRENCY_KEYS = [
  "amount",
  "principal_amount",
  "total_paid",
  "outstanding",
  "overdue_amount",
  "total_overdue_amount",
  "disbursed",
  "collected",
  "running_balance",
  "totalAmount",
  "grandTotal",
];

function isCurrencyKey(key: string): boolean {
  return CURRENCY_KEYS.some(
    (k) => key === k || key.toLowerCase().includes(k.toLowerCase())
  );
}

export function exportToExcel(
  data: Record<string, unknown>[],
  filename: string,
  sheetName = "Report"
) {
  if (data.length === 0) return;

  // Format currency columns
  const formatted = data.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (isCurrencyKey(key) && typeof value === "number") {
        out[key] = formatCurrency(value);
      } else {
        out[key] = value;
      }
    }
    return out;
  });

  const worksheet = XLSX.utils.json_to_sheet(formatted);

  // Auto-size columns
  const headers = Object.keys(formatted[0]);
  const colWidths = headers.map((h) => {
    const headerLen = h.length;
    const maxDataLen = formatted.reduce((max, row) => {
      const val = String(row[h] ?? "");
      return Math.max(max, val.length);
    }, 0);
    return { wch: Math.min(Math.max(headerLen, maxDataLen) + 2, 40) };
  });
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// ---------- PDF Export ----------

interface PDFExportConfig {
  title: string;
  subtitle?: string;
  columns: { header: string; dataKey: string }[];
  data: Record<string, unknown>[];
  filename: string;
  totalsRow?: Record<string, number>;
}

export function exportToPDF(config: PDFExportConfig) {
  const { title, subtitle, columns, data, filename, totalsRow } = config;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Company header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Lending Management System", pageWidth / 2, 15, {
    align: "center",
  });

  // Report title
  doc.setFontSize(12);
  doc.text(title, pageWidth / 2, 23, { align: "center" });

  // Subtitle
  let yPos = 28;
  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, pageWidth / 2, yPos, { align: "center" });
    yPos += 5;
  }

  // Generated date
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text(
    `Generated: ${formatReportDate(new Date())} at ${new Date().toLocaleTimeString("en-PH")}`,
    pageWidth / 2,
    yPos,
    { align: "center" }
  );
  yPos += 6;

  // Format data for the table
  const tableData = data.map((row) => {
    const out: Record<string, unknown> = {};
    for (const col of columns) {
      const val = row[col.dataKey];
      if (isCurrencyKey(col.dataKey) && typeof val === "number") {
        out[col.dataKey] = formatCurrency(val);
      } else {
        out[col.dataKey] = val ?? "—";
      }
    }
    return out;
  });

  // Build body rows
  const body = tableData.map((row) =>
    columns.map((col) => String(row[col.dataKey] ?? ""))
  );

  // Totals row
  if (totalsRow) {
    const totalsArr = columns.map((col) => {
      const val = totalsRow[col.dataKey];
      if (val !== undefined) {
        return isCurrencyKey(col.dataKey)
          ? formatCurrency(val)
          : String(val);
      }
      return "";
    });
    totalsArr[0] = totalsArr[0] || "TOTALS";
    body.push(totalsArr);
  }

  autoTable(doc, {
    startY: yPos,
    head: [columns.map((c) => c.header)],
    body,
    theme: "grid",
    headStyles: {
      fillColor: [30, 30, 30],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    didParseCell(hookData) {
      // Bold totals row
      if (
        totalsRow &&
        hookData.section === "body" &&
        hookData.row.index === body.length - 1
      ) {
        hookData.cell.styles.fontStyle = "bold";
        hookData.cell.styles.fillColor = [220, 220, 220];
      }
    },
    margin: { left: 10, right: 10 },
  });

  doc.save(`${filename}.pdf`);
}
