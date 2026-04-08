import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export interface LatestPrice {
  price: number;
  date: string;
  currency?: string;
}

interface PriceHistoryMapRow {
  contract_id: string | null;
  amount: number;
  date: string;
  category: string | null;
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
          .from('home_expenses_transactions')
          .select('id, contract_id, category, amount, date, created_at')
          .eq('type', 'expense')
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
        const rows = (data ?? []) as PriceHistoryMapRow[];
        const sortedData = rows.sort((a, b) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        // For car contracts, only carRenting should drive the contract card price.
        // Car charging entries (category "car") must not replace renting base price.
        const latestAnyByContract = new Map<string, LatestPrice>();
        const latestCarRentingByContract = new Map<string, LatestPrice>();
        const carCategoryContracts = new Set<string>();

        sortedData.forEach((entry) => {
          if (!entry.contract_id) {
            return;
          }

          if (!latestAnyByContract.has(entry.contract_id)) {
            latestAnyByContract.set(entry.contract_id, {
              price: Number(entry.amount),
              date: entry.date,
            });
          }

          if (entry.category === 'car' || entry.category === 'carRenting') {
            carCategoryContracts.add(entry.contract_id);
          }

          if (entry.category === 'carRenting' && !latestCarRentingByContract.has(entry.contract_id)) {
            latestCarRentingByContract.set(entry.contract_id, {
              price: Number(entry.amount),
              date: entry.date,
            });
          }
        });

        const latestMap = new Map<string, LatestPrice>();

        latestAnyByContract.forEach((latestAny, contractId) => {
          if (carCategoryContracts.has(contractId)) {
            const rentingOnly = latestCarRentingByContract.get(contractId);
            if (rentingOnly) {
              latestMap.set(contractId, rentingOnly);
            }
            return;
          }

          latestMap.set(contractId, latestAny);
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
