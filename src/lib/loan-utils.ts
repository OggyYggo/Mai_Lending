export function generateLoanNumber(sequence: number): string {
  const year = new Date().getFullYear();
  const padded = String(sequence).padStart(3, "0");
  return `LN-${year}-${padded}`;
}

export interface AmortizationParams {
  principal: number;
  interestRate: number;
  termMonths: number;
  interestType: "flat" | "diminishing";
  startDate: Date;
  paymentFrequency: "weekly" | "bi-weekly" | "monthly";
}

export interface Installment {
  installmentNumber: number;
  dueDate: Date;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
}

function addPeriod(
  date: Date,
  frequency: AmortizationParams["paymentFrequency"]
): Date {
  const d = new Date(date);
  switch (frequency) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "bi-weekly":
      d.setDate(d.getDate() + 14);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
  }
  return d;
}

function getTotalInstallments(
  termMonths: number,
  frequency: AmortizationParams["paymentFrequency"]
): number {
  switch (frequency) {
    case "weekly":
      return Math.round(termMonths * (52 / 12));
    case "bi-weekly":
      return Math.round(termMonths * (26 / 12));
    case "monthly":
      return termMonths;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateAmortization(
  params: AmortizationParams
): Installment[] {
  const {
    principal,
    interestRate,
    termMonths,
    interestType,
    startDate,
    paymentFrequency,
  } = params;

  const totalInstallments = getTotalInstallments(termMonths, paymentFrequency);
  const installments: Installment[] = [];
  let dueDate = new Date(startDate);

  if (interestType === "flat") {
    const totalInterest = (principal * interestRate * termMonths) / 100;
    const principalPerPeriod = round2(principal / totalInstallments);
    const interestPerPeriod = round2(totalInterest / totalInstallments);

    let remainingPrincipal = principal;

    for (let i = 1; i <= totalInstallments; i++) {
      dueDate = addPeriod(dueDate, paymentFrequency);

      const isLast = i === totalInstallments;
      const pAmount = isLast ? round2(remainingPrincipal) : principalPerPeriod;
      remainingPrincipal -= pAmount;

      installments.push({
        installmentNumber: i,
        dueDate: new Date(dueDate),
        principalAmount: pAmount,
        interestAmount: interestPerPeriod,
        totalAmount: round2(pAmount + interestPerPeriod),
      });
    }
  } else {
    // Diminishing balance
    const periodsPerYear =
      paymentFrequency === "weekly"
        ? 52
        : paymentFrequency === "bi-weekly"
          ? 26
          : 12;
    const periodicRate = interestRate / 100 / periodsPerYear;
    const principalPerPeriod = round2(principal / totalInstallments);

    let remainingBalance = principal;

    for (let i = 1; i <= totalInstallments; i++) {
      dueDate = addPeriod(dueDate, paymentFrequency);

      const interestAmount = round2(remainingBalance * periodicRate);
      const isLast = i === totalInstallments;
      const pAmount = isLast ? round2(remainingBalance) : principalPerPeriod;

      installments.push({
        installmentNumber: i,
        dueDate: new Date(dueDate),
        principalAmount: pAmount,
        interestAmount,
        totalAmount: round2(pAmount + interestAmount),
      });

      remainingBalance -= pAmount;
    }
  }

  return installments;
}

export interface LoanSummary {
  totalInterest: number;
  totalPayable: number;
  monthlyPayment: number;
}

export function calculateLoanSummary(
  principal: number,
  interestRate: number,
  termMonths: number,
  interestType: "flat" | "diminishing"
): LoanSummary {
  if (interestType === "flat") {
    const totalInterest = round2(
      (principal * interestRate * termMonths) / 100
    );
    const totalPayable = round2(principal + totalInterest);
    const monthlyPayment = round2(totalPayable / termMonths);
    return { totalInterest, totalPayable, monthlyPayment };
  }

  // Diminishing: use standard amortization formula
  const monthlyRate = interestRate / 100 / 12;

  if (monthlyRate === 0) {
    const monthlyPayment = round2(principal / termMonths);
    return {
      totalInterest: 0,
      totalPayable: principal,
      monthlyPayment,
    };
  }

  const monthlyPayment = round2(
    principal *
      (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
      (Math.pow(1 + monthlyRate, termMonths) - 1)
  );
  const totalPayable = round2(monthlyPayment * termMonths);
  const totalInterest = round2(totalPayable - principal);

  return { totalInterest, totalPayable, monthlyPayment };
}
