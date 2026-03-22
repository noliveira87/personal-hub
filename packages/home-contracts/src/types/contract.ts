export type ContractCategory =
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

export type ContractType = 'insurance' | 'utility' | 'telecom' | 'subscription' | 'maintenance' | 'other';
export type RenewalType = 'manual' | 'auto-renew' | 'no-renewal';
export type BillingFrequency = 'monthly' | 'quarterly' | 'yearly' | 'one-time';
export type ContractStatus = 'active' | 'pending-cancellation' | 'expired' | 'archived';

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
  startDate: string;
  endDate: string;
  renewalType: RenewalType;
  billingFrequency: BillingFrequency;
  price: number;
  currency: string;
  notes: string;
  status: ContractStatus;
  alerts: AlertSetting[];
  telegramAlertEnabled: boolean;
  documentLinks: string[];
  createdAt: string;
  updatedAt: string;
}

export const CATEGORY_LABELS: Record<ContractCategory, string> = {
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
  insurance: 'Insurance',
  utility: 'Utility',
  telecom: 'Telecom',
  subscription: 'Subscription',
  maintenance: 'Maintenance',
  other: 'Other',
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
