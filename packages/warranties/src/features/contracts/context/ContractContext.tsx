import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Contract } from '@/features/contracts/types/contract';
import { loadContractsFromDb, upsertContractsInDb } from '@/features/contracts/lib/contractDb';

interface ContractContextType {
  contracts: Contract[];
  loading: boolean;
  error: string | null;
  addContract: (contract: Contract) => void;
  updateContract: (contract: Contract) => void;
  deleteContract: (id: string) => void;
  getContract: (id: string) => Contract | undefined;
}

const ContractContext = createContext<ContractContextType | undefined>(undefined);

export function ContractProvider({ children }: { children: React.ReactNode }) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load from Supabase on mount
  useEffect(() => {
    (async () => {
      try {
        setError(null);
        const dbContracts = await loadContractsFromDb();
        setContracts(dbContracts || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao carregar contratos da base de dados';
        setError(message);
        console.error('Error loading contracts:', err);
        setContracts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = useCallback(async (updated: Contract[]) => {
    try {
      setError(null);
      setContracts(updated);
      await upsertContractsInDb(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao guardar contratos';
      setError(message);
      console.error('Error saving contracts:', err);
      throw err;
    }
  }, []);

  const addContract = useCallback(async (contract: Contract) => {
    return save([...contracts, contract]);
  }, [contracts, save]);

  const updateContract = useCallback(async (contract: Contract) => {
    return save(contracts.map(c => c.id === contract.id ? contract : c));
  }, [contracts, save]);

  const deleteContract = useCallback(async (id: string) => {
    return save(contracts.filter(c => c.id !== id));
  }, [contracts, save]);

  const getContract = useCallback((id: string) => {
    return contracts.find(c => c.id === id);
  }, [contracts]);

  return (
    <ContractContext.Provider value={{ contracts, loading, error, addContract, updateContract, deleteContract, getContract }}>
      {children}
    </ContractContext.Provider>
  );
}

export function useContracts() {
  const context = useContext(ContractContext);
  if (!context) throw new Error('useContracts must be used within ContractProvider');
  return context;
}
