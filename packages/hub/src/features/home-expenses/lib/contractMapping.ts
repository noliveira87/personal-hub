import { Contract, ContractCategory, PriceHistory } from '@/features/contracts/types/contract';
import { Transaction, ExpenseCategory } from './types';

function extractYearMonth(value: string): { year: number; month: number } | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  return { year, month };
}

/**
 * Maps contract categories to expense categories
 */
export function mapContractCategoryToExpenseCategory(
  contractCategory: ContractCategory
): ExpenseCategory | null {
  const mapping: Record<ContractCategory, ExpenseCategory | null> = {
    'home-insurance': 'mortgage', // Insurance goes with housing/mortgage
    'apartment-insurance': 'mortgage', // Apartment insurance -> housing
    'gas': 'electricity', // Gas is a utility like electricity
    'electricity': 'electricity',
    'internet': 'internet',
    'mobile': 'internet', // Mobile as telecom/internet
    'water': 'water',
    'tv-streaming': 'other', // Entertainment
    'software': 'other', // Software subscriptions
    'maintenance': 'other', // General maintenance
    'security-alarm': 'other', // Security services
    'other': 'other',
  };

  return mapping[contractCategory];
}

/**
 * Filters active monthly contracts and converts them to transactions for a given month
 */
export function getMonthlyContractTransactions(
  contracts: Contract[],
  allPriceHistory: PriceHistory[],
  year: number,
  month: number
): Transaction[] {
  // Never generate entries for future months
  const today = new Date();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  if (monthStart > today) return [];

  return contracts
    .filter(contract => {
      // Only include active contracts
      if (contract.status !== 'active') return false;

      // If there is explicit price history for this month, always include regardless of
      // start/end date — the user intentionally recorded a bill for this month.
      const hasPriceHistory = allPriceHistory.some(h => {
        if (h.contractId !== contract.id) return false;
        const ym = extractYearMonth(h.date);
        return ym !== null && ym.year === year && ym.month === month;
      });
      if (hasPriceHistory) return true;

      const startDate = new Date(contract.startDate);
      const endDate = contract.endDate ? new Date(contract.endDate) : null;

      // If a contract starts during the month, it should still be included for that month.
      if (!isNaN(startDate.getTime()) && startDate > monthEnd) return false;
      if (endDate && !isNaN(endDate.getTime()) && endDate < monthStart) return false;
      return true;
    })
    .flatMap(contract => {
      const expenseCategory = mapContractCategoryToExpenseCategory(contract.category);

      // Pick price only from entries in the SAME month/year (no carry-forward).
      // If there is no entry for that month, fallback to contract current price.
      const monthlyHistory = allPriceHistory
        .filter(h => h.contractId === contract.id)
        .filter(h => {
          const ym = extractYearMonth(h.date);
          if (!ym) return false;
          return ym.year === year && ym.month === month;
        })
        .sort((a, b) => b.date.localeCompare(a.date));

      const isMonthly = contract.billingFrequency === 'monthly';
      if (!isMonthly && monthlyHistory.length === 0) return [];

      const price = monthlyHistory.length > 0 ? monthlyHistory[0].price : contract.price;
      if (!Number.isFinite(price) || price <= 0) return [];

      const startDate = new Date(contract.startDate);
      const transactionDate = !isNaN(startDate.getTime()) && startDate > monthStart ? startDate : monthStart;

      // Format date in local time to avoid UTC offset shifting the day
      const pad = (n: number) => String(n).padStart(2, '0');
      const dateStr = `${transactionDate.getFullYear()}-${pad(transactionDate.getMonth() + 1)}-${pad(transactionDate.getDate())}`;

      return [{
        id: `contract-${contract.id}-${year}-${month}`,
        name: `${contract.name} (${contract.provider})`,
        type: 'expense' as const,
        category: expenseCategory || undefined,
        amount: price,
        date: dateStr,
        recurring: true,
        contractId: contract.id,
        isContractExpense: true,
      }];
    });
}

/**
 * Checks if a transaction is derived from a contract
 */
export function isContractTransaction(transaction: Transaction): boolean {
  return (transaction as any).isContractExpense === true;
}
