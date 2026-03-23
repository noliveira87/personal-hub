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
    console.log('usePriceHistoryMap called with contractIds:', contractIds);
    
    if (!contractIds.length) {
      console.log('No contract IDs provided, skipping load');
      return;
    }

    const loadPrices = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('Fetching price history for contracts:', contractIds);
        const { data, error: err } = await supabase
          .from('contract_price_history')
          .select('id, contract_id, price, currency, date')
          .in('contract_id', contractIds);

        if (err) {
          console.error('Error loading price history:', err);
          setError(err.message);
          return;
        }

        console.log('Raw data from Supabase:', data);

        // Sort by date DESC to ensure latest prices come first
        const sortedData = (data || []).sort((a: any, b: any) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        console.log('Sorted price history data:', sortedData);

        // Build map with latest price for each contract
        const latestMap = new Map<string, LatestPrice>();
        const seenContracts = new Set<string>();

        sortedData.forEach((entry: any) => {
          // Since data is sorted by date DESC, first entry for each contract is the latest
          if (!seenContracts.has(entry.contract_id)) {
            const latestEntry: LatestPrice = {
              price: entry.price,
              date: entry.date,
              currency: entry.currency,
            };
            console.log(`Setting price for contract ${entry.contract_id}:`, latestEntry);
            latestMap.set(entry.contract_id, latestEntry);
            seenContracts.add(entry.contract_id);
          }
        });

        console.log('Final price map:', latestMap);
        setPriceMap(latestMap);
      } catch (err) {
        console.error('Error in usePriceHistoryMap:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadPrices();
  }, [contractIds.join(',')]);

  return { priceMap, loading, error };
}
