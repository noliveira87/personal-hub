export type TransactionType = 'income' | 'expense';

export type ExpenseCategory =
  | 'mortgage'
  | 'electricity'
  | 'water'
  | 'internet'
  | 'car'
  | 'gym'
  | 'socialSecurity'
  | 'other';

export interface Transaction {
  id: string;
  name: string;
  type: TransactionType;
  category?: ExpenseCategory;
  notes?: string;
  amount: number;
  date: string; // YYYY-MM-DD
  recurring: boolean;
  contractId?: string; // Link to contract manager when this expense is a contract payment
  isContractExpense?: boolean; // Flag to indicate this expense is linked to a contract
}

export interface MonthData {
  month: number;
  year: number;
  income: number;
  expenses: number;
  balance: number;
  savingsRate: number;
}

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; icon: string }[] = [
  { value: 'mortgage', label: 'Mortgage', icon: '🏠' },
  { value: 'electricity', label: 'Electricity', icon: '💡' },
  { value: 'water', label: 'Water', icon: '💧' },
  { value: 'internet', label: 'Internet', icon: '🌐' },
  { value: 'car', label: 'Car', icon: '🚗' },
  { value: 'gym', label: 'Gym', icon: '💪' },
  { value: 'socialSecurity', label: 'Social Security', icon: '🧾' },
  { value: 'other', label: 'Other', icon: '🏆' },
];

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
