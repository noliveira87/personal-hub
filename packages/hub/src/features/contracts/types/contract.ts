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
  | 'card-credit'
  | 'card-debit'
  | 'gym'
  | 'other';

export type ContractType = 'mortgage' | 'insurance' | 'utility' | 'telecom' | 'subscription' | 'maintenance' | 'car' | 'card' | 'other';
export type HousingUsage = 'primary-residence' | 'secondary-home';
export type RenewalType = 'manual' | 'auto-renew' | 'no-renewal';
export type BillingFrequency = 'monthly' | 'quarterly' | 'yearly' | 'one-time';
export type ContractStatus = 'active' | 'pending-cancellation' | 'expired' | 'archived';
export type ContractPaymentType = 'direct-debit' | 'bank-transfer' | 'card' | 'entity-reference' | 'mbway' | 'cash' | 'other';
export type DirectDebitTiming = 'start' | 'end';

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
  const parseBooleanLike = (input: unknown, defaultValue: boolean): boolean => {
    if (typeof input === 'boolean') return input;
    if (typeof input === 'string') {
      const normalized = input.trim().toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
    }
    return defaultValue;
  };

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
    enabled: parseBooleanLike(raw.enabled, true),
    // Legacy alerts may not have telegramEnabled; default to true to avoid silently dropping them.
    telegramEnabled: parseBooleanLike(raw.telegramEnabled, true),
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
  paymentType: ContractPaymentType | null;
  paymentSource: string | null;
  directDebitTiming: DirectDebitTiming | null;
  price: number;
  currency: string;
  notes: string | null;
  status: ContractStatus;
  alerts: AlertSetting[];
  telegramAlertEnabled: boolean;
  showInChecklist?: boolean;
  documentLinks: string[] | null;
  priceHistoryEnabled: boolean;
  defaultMonthlyValue: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContractQuote {
  id: string;
  contractId: string | null;
  title: string;
  provider: string | null;
  description: string | null;
  price: number | null;
  currency: string;
  date: string | null;
  pdfUrl: string | null;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  paymentTerms: string | null;
  alertDate: string | null;
  alertEnabled: boolean;
  telegramAlertEnabled: boolean;
  alertSentAt: string | null;
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
  'card-credit': 'Credit Card',
  'card-debit': 'Debit Card',
  'gym': 'Gym',
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
  'card-credit': '💳',
  'card-debit': '🏧',
  'gym': '💪',
  'other': '❓',
};

export function getContractCategoryIcon(category: ContractCategory, type?: ContractType): string {
  if (type === 'card' && category === 'other') {
    return '💳';
  }

  return CATEGORY_ICONS[category];
}

export const TYPE_LABELS: Record<ContractType, string> = {
  mortgage: 'Mortgage',
  insurance: 'Insurance',
  utility: 'Utility',
  telecom: 'Telecom',
  subscription: 'Subscription',
  maintenance: 'Maintenance',
  car: 'Car',
  card: 'Card',
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

export const PAYMENT_TYPE_LABELS: Record<ContractPaymentType, string> = {
  'direct-debit': 'Direct Debit',
  'bank-transfer': 'Bank Transfer',
  'card': 'Card',
  'entity-reference': 'Entity & Reference',
  'mbway': 'MB Way',
  'cash': 'Cash',
  'other': 'Other',
};

export const RENEWAL_LABELS: Record<RenewalType, string> = {
  manual: 'Manual',
  'auto-renew': 'Auto-renew',
  'no-renewal': 'No Renewal',
};
