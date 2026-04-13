export type CashbackCategory =
  | 'groceries'
  | 'tech'
  | 'travel'
  | 'car'
  | 'dining'
  | 'shopping'
  | 'entertainment'
  | 'transport'
  | 'health'
  | 'other';

export interface CashbackEntry {
  id: string;
  source: string;
  amount: number;
  points?: number;
  dateReceived: string;
}

export interface CashbackPurchase {
  id: string;
  merchant: string;
  category: CashbackCategory;
  date: string;
  amount: number;
  notes?: string;
  isReferral?: boolean;
  isUnibanco?: boolean;
  createdAt?: string;
  cashbackEntries: CashbackEntry[];
}

export const CASHBACK_CATEGORIES: Array<{ value: CashbackCategory; label: string }> = [
  { value: 'groceries', label: 'Supermercado' },
  { value: 'tech', label: 'Tecnologia' },
  { value: 'travel', label: 'Viagens' },
  { value: 'car', label: 'Carro' },
  { value: 'dining', label: 'Restauracao' },
  { value: 'shopping', label: 'Compras' },
  { value: 'entertainment', label: 'Lazer' },
  { value: 'transport', label: 'Transporte' },
  { value: 'health', label: 'Saude' },
  { value: 'other', label: 'Outros' },
];

export const CASHBACK_SOURCES = [
  'Unibanco',
  'Bybit',
  'Revolut',
  'LetyShops',
  'Cartao de Credito',
  'iGraal',
  'Rakuten',
  'TopCashback',
  'ShopBack',
  'Referral',
  'Outro',
];

export function getCategoryLabel(category: CashbackCategory): string {
  return CASHBACK_CATEGORIES.find((item) => item.value === category)?.label ?? 'Outros';
}

export function getTotalCashback(purchase: CashbackPurchase): number {
  return purchase.cashbackEntries.reduce((sum, entry) => sum + entry.amount, 0);
}

export function getCashbackPercent(purchase: CashbackPurchase): number {
  if (purchase.amount <= 0) return 0;
  return (getTotalCashback(purchase) / purchase.amount) * 100;
}