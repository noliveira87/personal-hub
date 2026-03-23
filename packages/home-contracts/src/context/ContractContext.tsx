import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Contract } from '@/types/contract';
import * as contractsDB from '@/lib/contracts';

interface ContractContextType {
  contracts: Contract[];
  loading: boolean;
  error: string | null;
  addContract: (contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Contract>;
  updateContract: (contract: Contract) => Promise<Contract>;
  deleteContract: (id: string) => Promise<void>;
  getContract: (id: string) => Contract | undefined;
  refresh: () => Promise<void>;
}

const ContractContext = createContext<ContractContextType | undefined>(undefined);

export function ContractProvider({ children }: { children: React.ReactNode }) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await contractsDB.loadContracts();
      setContracts(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load contracts';
      setError(message);
      console.error('Error loading contracts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addContract = useCallback(async (contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newContract = await contractsDB.createContract(contract);
      setContracts(prev => [newContract, ...prev]);
      return newContract;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create contract';
      setError(message);
      throw err;
    }
  }, []);

  const updateContract = useCallback(async (contract: Contract) => {
    try {
      const updated = await contractsDB.updateContract(contract);
      setContracts(prev => prev.map(c => c.id === contract.id ? updated : c));
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update contract';
      setError(message);
      throw err;
    }
  }, []);

  const deleteContract = useCallback(async (id: string) => {
    try {
      await contractsDB.deleteContract(id);
      setContracts(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete contract';
      setError(message);
      throw err;
    }
  }, []);

  const getContract = useCallback((id: string) => {
    return contracts.find(c => c.id === id);
  }, [contracts]);

  return (
    <ContractContext.Provider value={{ contracts, loading, error, addContract, updateContract, deleteContract, getContract, refresh }}>
      {children}
    </ContractContext.Provider>
  );
}

export function useContracts() {
  const context = useContext(ContractContext);
  if (!context) throw new Error('useContracts must be used within ContractProvider');
  return context;
}
