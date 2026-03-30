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
  | 'other';

export type ContractType = 'mortgage' | 'insurance' | 'utility' | 'telecom' | 'subscription' | 'maintenance' | 'other';
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
  daysBefore: number;
  enabled: boolean;
  telegramEnabled: boolean;
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
  'maintenance': '🔧',
  'security-alarm': '🔒',
  'other': '📋',
};

export const TYPE_LABELS: Record<ContractType, string> = {
  mortgage: 'Mortgage',
  insurance: 'Insurance',
  utility: 'Utility',
  telecom: 'Telecom',
  subscription: 'Subscription',
  maintenance: 'Maintenance',
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
