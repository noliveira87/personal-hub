import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Contract } from '@/features/contracts/types/contract';
import { sampleContracts } from '@/features/contracts/data/sampleContracts';
import { loadContractsFromDb, upsertContractsInDb } from '@/features/contracts/lib/contractDb';
import { isSupabaseConfigured } from '@/lib/supabase';

interface ContractContextType {
  contracts: Contract[];
  addContract: (contract: Contract) => void;
  updateContract: (contract: Contract) => void;
  deleteContract: (id: string) => void;
  getContract: (id: string) => Contract | undefined;
}

const ContractContext = createContext<ContractContextType | undefined>(undefined);
const CONTRACTS_STORAGE_KEY = 'contracts.v1';

export function ContractProvider({ children }: { children: React.ReactNode }) {
  const [contracts, setContracts] = useState<Contract[]>(() => {
    // If Supabase is configured, start empty and load from DB in useEffect
    if (isSupabaseConfigured) return [];
    // Otherwise, load from localStorage or use samples
    const saved = localStorage.getItem(CONTRACTS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : sampleContracts;
  });

  // Load from Supabase on mount if configured
  useEffect(() => {
    if (isSupabaseConfigured) {
      (async () => {
        const dbContracts = await loadContractsFromDb();
        if (dbContracts && dbContracts.length > 0) {
          // Supabase has data - use it
          setContracts(dbContracts);
          localStorage.setItem(CONTRACTS_STORAGE_KEY, JSON.stringify(dbContracts));
        } else {
          // Supabase is empty, try localStorage
          const saved = localStorage.getItem(CONTRACTS_STORAGE_KEY);
          if (saved) {
            try {
              const local = JSON.parse(saved);
              setContracts(local);
              // Seed Supabase with local data
              if (local.length > 0) {
                await upsertContractsInDb(local);
              }
            } catch (e) {
              console.error('Error parsing local contracts:', e);
              setContracts([]);
            }
          } else {
            // No local data either, use empty (no samples)
            setContracts([]);
          }
        }
      })();
    }
  }, []);

  const save = useCallback((updated: Contract[]) => {
    setContracts(updated);
    localStorage.setItem(CONTRACTS_STORAGE_KEY, JSON.stringify(updated));
    if (isSupabaseConfigured) {
      upsertContractsInDb(updated).catch(err => console.error('Failed to save to Supabase:', err));
    }
  }, []);

  const addContract = useCallback((contract: Contract) => {
    save([...contracts, contract]);
  }, [contracts, save]);

  const updateContract = useCallback((contract: Contract) => {
    save(contracts.map(c => c.id === contract.id ? contract : c));
  }, [contracts, save]);

  const deleteContract = useCallback((id: string) => {
    save(contracts.filter(c => c.id !== id));
  }, [contracts, save]);

  const getContract = useCallback((id: string) => {
    return contracts.find(c => c.id === id);
  }, [contracts]);

  return (
    <ContractContext.Provider value={{ contracts, addContract, updateContract, deleteContract, getContract }}>
      {children}
    </ContractContext.Provider>
  );
}

export function useContracts() {
  const context = useContext(ContractContext);
  if (!context) throw new Error('useContracts must be used within ContractProvider');
  return context;
}
