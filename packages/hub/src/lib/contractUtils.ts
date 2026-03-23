import { Contract } from '@/types/contract';
import { differenceInDays, parseISO } from 'date-fns';

export function getDaysUntilExpiry(contract: Contract): number {
  if (!contract.endDate) return Infinity;
  return differenceInDays(parseISO(contract.endDate), new Date());
}

export function getMonthlyEquivalent(contract: Contract, price?: number): number {
  const contractPrice = price ?? contract.price;
  switch (contract.billingFrequency) {
    case 'monthly': return contractPrice;
    case 'quarterly': return contractPrice / 3;
    case 'yearly': return contractPrice / 12;
    case 'one-time': return 0;
  }
}

export function getAnnualEquivalent(contract: Contract, price?: number): number {
  const contractPrice = price ?? contract.price;
  switch (contract.billingFrequency) {
    case 'monthly': return contractPrice * 12;
    case 'quarterly': return contractPrice * 4;
    case 'yearly': return contractPrice;
    case 'one-time': return contractPrice;
  }
}

export function getUrgencyLevel(daysLeft: number): 'critical' | 'warning' | 'soon' | 'normal' {
  if (daysLeft <= 7) return 'critical';
  if (daysLeft <= 15) return 'warning';
  if (daysLeft <= 30) return 'soon';
  return 'normal';
}

export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
