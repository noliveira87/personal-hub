import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Contract } from '@/features/contracts/types/contract';
import { loadContractsFromDb, upsertContractsInDb, deleteContractFromDb } from '@/features/contracts/lib/contractDb';

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

  const saveToDb = useCallback(async (updated: Contract[]) => {
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
    return saveToDb([...contracts, contract]);
  }, [contracts, saveToDb]);

  const updateContract = useCallback(async (contract: Contract) => {
    return saveToDb(contracts.map(c => c.id === contract.id ? contract : c));
  }, [contracts, saveToDb]);

  const deleteContract = useCallback(async (id: string) => {
    const previousContracts = contracts;
    try {
      setError(null);
      // Remove imediatamente do estado local (otimista)
      setContracts(prev => prev.filter(c => c.id !== id));
      // Delete da BD
      await deleteContractFromDb(id);
    } catch (err) {
      // Revert ao estado anterior se falhar
      setContracts(previousContracts);
      const message = err instanceof Error ? err.message : 'Erro ao eliminar contrato';
      setError(message);
      console.error('Error deleting contract:', err);
      throw err;
    }
  }, [contracts]);

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
