import { Transaction, MonthData } from './types';

const STORAGE_KEY = 'finflow-transactions';

/**
 * Parse a YYYY-MM-DD date string as LOCAL time (not UTC).
 * Using new Date('YYYY-MM-DD') parses as UTC midnight, which in UTC+1
 * rolls back to the previous day and breaks month/year comparisons.
 */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function loadTransactions(): Transaction[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveTransactions(transactions: Transaction[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

export function addTransaction(tx: Omit<Transaction, 'id'>): Transaction {
  const transactions = loadTransactions();
  const newTx: Transaction = { ...tx, id: crypto.randomUUID() };
  transactions.push(newTx);
  saveTransactions(transactions);
  return newTx;
}

export function updateTransaction(id: string, updates: Partial<Transaction>) {
  const transactions = loadTransactions();
  const idx = transactions.findIndex((t) => t.id === id);
  if (idx !== -1) {
    transactions[idx] = { ...transactions[idx], ...updates };
    saveTransactions(transactions);
  }
  return transactions;
}

export function deleteTransaction(id: string) {
  const transactions = loadTransactions().filter((t) => t.id !== id);
  saveTransactions(transactions);
  return transactions;
}

export function getMonthTransactions(year: number, month: number): Transaction[] {
  return loadTransactions().filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

export function getMonthData(year: number, month: number): MonthData {
  const txs = getMonthTransactions(year, month);
  const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expenses;
  const savingsRate = income > 0 ? (balance / income) * 100 : 0;
  return { month, year, income, expenses, balance, savingsRate };
}

export function getYearData(year: number): MonthData[] {
  return Array.from({ length: 12 }, (_, i) => getMonthData(year, i));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
}
