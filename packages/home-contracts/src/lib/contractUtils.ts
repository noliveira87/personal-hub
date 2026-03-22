import { Contract } from '@/types/contract';
import { differenceInDays, parseISO } from 'date-fns';

export function getDaysUntilExpiry(contract: Contract): number {
  return differenceInDays(parseISO(contract.endDate), new Date());
}

export function getMonthlyEquivalent(contract: Contract): number {
  switch (contract.billingFrequency) {
    case 'monthly': return contract.price;
    case 'quarterly': return contract.price / 3;
    case 'yearly': return contract.price / 12;
    case 'one-time': return 0;
  }
}

export function getAnnualEquivalent(contract: Contract): number {
  switch (contract.billingFrequency) {
    case 'monthly': return contract.price * 12;
    case 'quarterly': return contract.price * 4;
    case 'yearly': return contract.price;
    case 'one-time': return contract.price;
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
