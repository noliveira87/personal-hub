export type ContractCategory =
  | 'mortgage'
  | 'home-insurance'
  | 'apartment-insurance'
  | 'gas'
  | 'electricity'
  | 'internet'
  | 'mobile'
  | 'water'
  | 'tv-streaming'
  | 'software'
  | 'maintenance'
  | 'security-alarm'
  | 'car'
  | 'other';

export type ContractType = 'mortgage' | 'insurance' | 'utility' | 'telecom' | 'subscription' | 'maintenance' | 'car' | 'other';
export type HousingUsage = 'primary-residence' | 'secondary-home';
export type RenewalType = 'manual' | 'auto-renew' | 'no-renewal';
export type BillingFrequency = 'monthly' | 'quarterly' | 'yearly' | 'one-time';
export type ContractStatus = 'active' | 'pending-cancellation' | 'expired' | 'archived';

export interface MortgageDetails {
  principalAmount: number | null;
  totalTermYears: number | null;
  totalTermMonths: number | null;
  fixedRateYears: number | null;
  fixedRateMonths: number | null;
  variableRateYears: number | null;
  variableRateMonths: number | null;
  tanFixed: number | null;
  tanVariable: number | null;
  spread: number | null;
  taeg: number | null;
}

export interface AlertSetting {
  kind: 'days-before' | 'specific-date';
  daysBefore: number;
  specificDate: string | null;
  reason: string | null;
  enabled: boolean;
  telegramEnabled: boolean;
}

export function normalizeAlertSetting(value: unknown): AlertSetting {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const kind = raw.kind === 'specific-date' || typeof raw.specificDate === 'string'
    ? 'specific-date'
    : 'days-before';

  const rawDaysBefore = Number(raw.daysBefore);
  const daysBefore = Number.isFinite(rawDaysBefore) && rawDaysBefore > 0 ? Math.floor(rawDaysBefore) : 30;

  const specificDate = typeof raw.specificDate === 'string' && raw.specificDate.trim()
    ? raw.specificDate
    : null;

  const reason = typeof raw.reason === 'string' && raw.reason.trim()
    ? raw.reason.trim()
    : null;

  return {
    kind,
    daysBefore,
    specificDate: kind === 'specific-date' ? specificDate : null,
    reason,
    enabled: raw.enabled !== false,
    telegramEnabled: raw.telegramEnabled === true,
  };
}

export interface Contract {
  id: string;
  name: string;
  category: ContractCategory;
  provider: string;
  type: ContractType;
  housingUsage: HousingUsage | null;
  mortgageDetails: MortgageDetails | null;
  startDate: string;
  endDate: string | null;
  noEndDate: boolean;
  renewalType: RenewalType;
  billingFrequency: BillingFrequency;
  price: number;
  currency: string;
  notes: string | null;
  status: ContractStatus;
  alerts: AlertSetting[];
  telegramAlertEnabled: boolean;
  documentLinks: string[] | null;
  priceHistoryEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PriceHistory {
  id: string;
  contractId: string;
  price: number;
  currency: string;
  date: string;
  notes: string | null;
  createdAt: string;
}

export const CATEGORY_LABELS: Record<ContractCategory, string> = {
  'mortgage': 'Mortgage',
  'home-insurance': 'Home Insurance',
  'apartment-insurance': 'Apartment Insurance',
  'gas': 'Gas',
  'electricity': 'Electricity',
  'internet': 'Internet',
  'mobile': 'Mobile',
  'water': 'Water',
  'tv-streaming': 'TV / Streaming',
  'software': 'Software',
  'maintenance': 'Maintenance',
  'security-alarm': 'Security / Alarm',
  'car': 'Carro',
  'other': 'Other',
};

export const CATEGORY_ICONS: Record<ContractCategory, string> = {
  'mortgage': '🏦',
  'home-insurance': '🏠',
  'apartment-insurance': '🏢',
  'gas': '🔥',
  'electricity': '⚡',
  'internet': '🌐',
  'mobile': '📱',
  'water': '💧',
  'tv-streaming': '📺',
  'software': '💻',
  'maintenance': '🛠️',
  'security-alarm': '🚨',
  'car': '🚗',
  'other': '❓',
};

export const TYPE_LABELS: Record<ContractType, string> = {
  mortgage: 'Mortgage',
  insurance: 'Insurance',
  utility: 'Utility',
  telecom: 'Telecom',
  subscription: 'Subscription',
  maintenance: 'Maintenance',
  car: 'Car',
  other: 'Other',
};

export const HOUSING_USAGE_LABELS: Record<HousingUsage, string> = {
  'primary-residence': 'Habitação Própria Permanente',
  'secondary-home': 'Habitação secundária',
};

export const STATUS_LABELS: Record<ContractStatus, string> = {
  active: 'Active',
  'pending-cancellation': 'Pending Cancellation',
  expired: 'Expired',
  archived: 'Archived',
};

export const BILLING_LABELS: Record<BillingFrequency, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  'one-time': 'One-time',
};

export const RENEWAL_LABELS: Record<RenewalType, string> = {
  manual: 'Manual',
  'auto-renew': 'Auto-renew',
  'no-renewal': 'No Renewal',
};
