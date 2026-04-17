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

export type PropertyDealPayload = {
  address: PropertyAddress;
  purchasePrice: number;
  costs: PurchaseCosts;
  purchaseExtraEntries: DealValueEntry[];
  includeReserveInOwnInvestment: boolean;
  saleStatus: 'not-sold' | 'sold';
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
  saleStatus: 'not-sold',
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
};
