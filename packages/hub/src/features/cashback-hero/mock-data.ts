import { CashbackPurchase } from '@/features/cashback-hero/types';

export const cashbackSeedPurchases: CashbackPurchase[] = [
  {
    id: 'cb-seed-1',
    merchant: 'Amazon',
    category: 'tech',
    date: '2026-04-08',
    amount: 249.99,
    notes: 'Headphones',
    cashbackEntries: [
      { id: 'cb-seed-e1', source: 'Revolut', amount: 5, dateReceived: '2026-04-09' },
      { id: 'cb-seed-e2', source: 'LetyShops', amount: 12.5, dateReceived: '2026-04-10' },
    ],
  },
  {
    id: 'cb-seed-2',
    merchant: 'Carrefour',
    category: 'groceries',
    date: '2026-04-07',
    amount: 87.32,
    cashbackEntries: [
      { id: 'cb-seed-e3', source: 'Cartao de Credito', amount: 1.75, dateReceived: '2026-04-08' },
    ],
  },
  {
    id: 'cb-seed-3',
    merchant: 'Booking.com',
    category: 'travel',
    date: '2026-03-05',
    amount: 456,
    cashbackEntries: [
      { id: 'cb-seed-e4', source: 'iGraal', amount: 22.8, dateReceived: '2026-03-07' },
    ],
  },
];