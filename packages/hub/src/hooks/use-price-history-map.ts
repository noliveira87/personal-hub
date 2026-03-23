import { useState, useEffect } from 'react';
import { PriceHistory } from '@/types/contract';
import { supabase } from '@/lib/supabase';

export interface LatestPrice {
  price: number;
  date: string;
  currency: string;
}

export function usePriceHistoryMap(contractIds: string[]) {
  const [priceMap, setPriceMap] = useState<Map<string, LatestPrice>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contractIds.length) return;

    const loadPrices = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from('contract_price_history')
          .select('id, contract_id, price, currency, date')
          .in('contract_id', contractIds);

        if (err) {
          console.error('Error loading price history:', err);
          setError(err.message);
          return;
        }

        // Build map with latest price for each contract
        const latestMap = new Map<string, LatestPrice>();

        (data || []).forEach((entry: any) => {
          const existing = latestMap.get(entry.contract_id);
          
          // Compare dates and keep the most recent
          if (!existing || new Date(entry.date) > new Date(existing.date)) {
            latestMap.set(entry.contract_id, {
              price: entry.price,
              date: entry.date,
              currency: entry.currency,
            });
          }
        });

        setPriceMap(latestMap);
      } catch (err) {
        console.error('Error in usePriceHistoryMap:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadPrices();
  }, [contractIds.join(',')]);;;

  return { priceMap, loading, error };
}
