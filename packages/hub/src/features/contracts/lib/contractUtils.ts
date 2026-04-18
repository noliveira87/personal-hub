import { Contract, ContractStatus } from '@/features/contracts/types/contract';
import { formatHiddenAmount, isHideAmountsEnabled } from '@/lib/moneyPrivacy';
import { differenceInDays, parseISO } from 'date-fns';

export function getDaysUntilExpiry(contract: Contract): number {
  if (!contract.endDate) return Infinity;
  return differenceInDays(parseISO(contract.endDate), new Date());
}

export function getDisplayContractStatus(contract: Pick<Contract, 'status' | 'endDate'>): ContractStatus {
  if (!contract.endDate) return contract.status;

  const daysLeft = differenceInDays(parseISO(contract.endDate), new Date());
  return daysLeft <= 0 && contract.status === 'active' ? 'expired' : contract.status;
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

export function getCurrentMonthCost(contract: Contract, referenceDate: Date = new Date(), price?: number): number {
  const contractPrice = price ?? contract.price;

  if (contractPrice <= 0) return 0;

  const startDate = parseISO(contract.startDate);
  if (Number.isNaN(startDate.getTime())) return 0;

  const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const monthEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);

  if (startDate > monthEnd) return 0;

  if (contract.endDate) {
    const endDate = parseISO(contract.endDate);
    if (!Number.isNaN(endDate.getTime()) && endDate < monthStart) {
      return 0;
    }
  }

  const monthsSinceStart =
    (referenceDate.getFullYear() - startDate.getFullYear()) * 12 +
    (referenceDate.getMonth() - startDate.getMonth());

  if (monthsSinceStart < 0) return 0;

  switch (contract.billingFrequency) {
    case 'monthly':
      return contractPrice;
    case 'quarterly':
      return monthsSinceStart % 3 === 0 ? contractPrice : 0;
    case 'yearly':
      return referenceDate.getMonth() === startDate.getMonth() ? contractPrice : 0;
    case 'one-time':
      return referenceDate.getMonth() === startDate.getMonth() && referenceDate.getFullYear() === startDate.getFullYear()
        ? contractPrice
        : 0;
  }
}

export function getUrgencyLevel(daysLeft: number): 'critical' | 'warning' | 'soon' | 'normal' {
  if (daysLeft <= 7) return 'critical';
  if (daysLeft <= 15) return 'warning';
  if (daysLeft <= 30) return 'soon';
  return 'normal';
}

export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  if (isHideAmountsEnabled()) {
    return formatHiddenAmount(currency);
  }

  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
