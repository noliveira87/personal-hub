import { useState, useEffect, useRef } from 'react';
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
  const prevDependencyRef = useRef<string>('');

  // Use contractIds directly in dependency array with proper dep tracking
  const idDependency = contractIds.join(',');

  useEffect(() => {
    const hasChanged = idDependency !== prevDependencyRef.current;
    
    if (!hasChanged) {
      return;
    }

    prevDependencyRef.current = idDependency;
    
    if (!contractIds || contractIds.length === 0) {
      setPriceMap(new Map());
      return;
    }

    const loadPrices = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from('contract_price_history')
          .select('id, contract_id, price, currency, date')
          .in('contract_id', contractIds);

        if (err) {
          console.error('Supabase error:', err);
          setError(err.message);
          return;
        }

        if (!data || data.length === 0) {
          setPriceMap(new Map());
          return;
        }

        // Sort by date DESC to ensure latest prices come first
        const sortedData = (data || []).sort((a: any, b: any) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

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
            latestMap.set(entry.contract_id, latestEntry);
            seenContracts.add(entry.contract_id);
          }
        });

        setPriceMap(latestMap);
      } catch (err) {
        console.error('Exception in usePriceHistoryMap:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadPrices();
  }, [idDependency]);

  return { priceMap, loading, error };
}
