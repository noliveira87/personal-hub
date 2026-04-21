export type PurchaseCosts = {
  reserveEra: number;
  signalCpcv: number;
  escrituraAmount: number;
  bankCheque: number;
  taxesAndStamp: number;
  houseReady: number;
  leroyMerlin: number;
  ikea: number;
};

export type PropertyAddress = {
  street: string;
  postalCode: string;
  city: string;
};

export type DealValueEntry = {
  id: string;
  label: string;
  amount: number;
  date: string;
};

export type PropertySaleStatus = 'on-market' | 'sold' | 'hpp';

export type PropertyDealPayload = {
  address: PropertyAddress;
  purchasePrice: number;
  mortgageRequestedAmount: number;
  costs: PurchaseCosts;
  purchaseExtraEntries: DealValueEntry[];
  includeReserveInOwnInvestment: boolean;
  saleStatus: PropertySaleStatus;
  simulatedOfferPrice: number;
  salePrice: number;
  commissionRate: number;
  commissionVatRate: number;
  condoExpenses: number;
  saleExtraEntries: DealValueEntry[];
  purchaseDates: {
    reserveEra: string;
    proposalApproval: string;
    cpcvSignature: string;
    escritura: string;
  };
  saleDates: {
    signalDate: string;
    escrituraDate: string;
  };
  saleSignalAmount: number;
  mortgageOutstandingAmount: number;
};

export type PropertyDeal = {
  id: string;
  title: string;
  payload: PropertyDealPayload;
  createdAt?: string;
  updatedAt?: string;
};

export const DEFAULT_PROPERTY_DEAL_PAYLOAD: PropertyDealPayload = {
  address: { street: '', postalCode: '', city: '' },
  purchasePrice: 0,
  mortgageRequestedAmount: 0,
  costs: {
    reserveEra: 0,
    signalCpcv: 0,
    escrituraAmount: 0,
    bankCheque: 0,
    taxesAndStamp: 0,
    houseReady: 0,
    leroyMerlin: 0,
    ikea: 0,
  },
  purchaseExtraEntries: [],
  includeReserveInOwnInvestment: false,
  saleStatus: 'on-market',
  simulatedOfferPrice: 0,
  salePrice: 0,
  commissionRate: 0,
  commissionVatRate: 0,
  condoExpenses: 0,
  saleExtraEntries: [],
  purchaseDates: {
    reserveEra: '',
    proposalApproval: '',
    cpcvSignature: '',
    escritura: '',
  },
  saleDates: {
    signalDate: '',
    escrituraDate: '',
  },
  saleSignalAmount: 0,
  mortgageOutstandingAmount: 0,
};
