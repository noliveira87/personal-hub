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

  console.log('usePriceHistoryMap render - contractIds:', contractIds);

  useEffect(() => {
    console.log('usePriceHistoryMap useEffect - contractIds:', contractIds);
    
    if (!contractIds.length) {
      console.log('No contract IDs provided, skipping load');
      return;
    }

    const loadPrices = async () => {
      console.log('loadPrices starting for:', contractIds);
      setLoading(true);
      setError(null);
      try {
        console.log('Fetching from supabase - contract_price_history table');
        const query = supabase
          .from('contract_price_history')
          .select('id, contract_id, price, currency, date')
          .in('contract_id', contractIds);

        console.log('Query created:', query);
        const { data, error: err } = await query;

        console.log('Supabase response - error:', err, 'data:', data);

        if (err) {
          console.error('Supabase error:', err);
          setError(err.message);
          return;
        }

        if (!data || data.length === 0) {
          console.log('No price history data returned from Supabase');
          setPriceMap(new Map());
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
        console.error('Exception in usePriceHistoryMap:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadPrices();
  }, [contractIds.join(',')]);

  return { priceMap, loading, error };
}
