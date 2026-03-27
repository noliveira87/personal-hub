export type InvestmentCategory = "short-term" | "long-term";
export type InvestmentType = "cash" | "aforro" | "etf" | "crypto" | "p2p" | "ppr";
export type InvestmentMovementKind = "contribution" | "withdrawal" | "cashback" | "adjustment";
export type PortfolioEarningKind = "cashback" | "survey" | "crypto_cashback" | "social_media";

export interface InvestmentMovement {
  id: string;
  date: string;
  kind: InvestmentMovementKind;
  amount: number;
  units?: number; // crypto units bought/sold, if applicable
  note?: string;
}

export interface Investment {
  id: string;
  name: string;
  category: InvestmentCategory;
  type: InvestmentType;
  investedAmount: number;
  currentValue: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioEarning {
  id: string;
  title: string;
  provider?: string;
  kind: PortfolioEarningKind;
  date: string;
  amountEur: number;
  cryptoAsset?: "BTC" | "ETH";
  cryptoUnits?: number | null;
  spotEurAtEarned?: number | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentSummary {
  totalInvested: number;
  totalCurrentValue: number;
  totalProfitLoss: number;
  percentageReturn: number;
}

export interface MonthlySnapshot {
  month: string;
  totalInvested: number;
  totalCurrentValue: number;
  totalProfitLoss: number;
  overallReturnPct: number;
  monthlyInflow: number;
  monthlyPerformance: number;
  monthlyReturnPct: number;
  updatedAt: string;
}

export const PREDEFINED_INVESTMENTS: { name: string; category: InvestmentCategory; type: InvestmentType }[] = [
  { name: "Trading 212", category: "short-term", type: "cash" },
  { name: "Revolut", category: "short-term", type: "cash" },
  { name: "Aforro", category: "long-term", type: "aforro" },
  { name: "ETFs", category: "long-term", type: "etf" },
  { name: "PPR", category: "long-term", type: "ppr" },
  { name: "Crypto", category: "long-term", type: "crypto" },
  { name: "P2P", category: "long-term", type: "p2p" },
];

export function calculateProfitLoss(investment: Investment) {
  const profitLoss = investment.currentValue - investment.investedAmount;
  const percentage = investment.investedAmount > 0
    ? (profitLoss / investment.investedAmount) * 100
    : 0;
  return { profitLoss, percentage };
}

export function calculateSummary(investments: Investment[]): InvestmentSummary {
  const totalInvested = investments.reduce((sum, i) => sum + i.investedAmount, 0);
  const totalCurrentValue = investments.reduce((sum, i) => sum + i.currentValue, 0);
  const totalProfitLoss = totalCurrentValue - totalInvested;
  const percentageReturn = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;
  return { totalInvested, totalCurrentValue, totalProfitLoss, percentageReturn };
}

export function calculateInvestedFromMovements(movements: InvestmentMovement[]) {
  return movements.reduce((total, movement) => {
    switch (movement.kind) {
      case "contribution":
      case "adjustment":
        return total + movement.amount;
      case "withdrawal":
        return total - movement.amount;
      case "cashback":
      default:
        return total;
    }
  }, 0);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatPercentage(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, 1);
  return new Intl.DateTimeFormat("pt-PT", { month: "short", year: "numeric" }).format(date);
}
