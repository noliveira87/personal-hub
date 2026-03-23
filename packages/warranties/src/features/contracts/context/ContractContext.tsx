import React, { createContext, useContext, useState, useCallback } from 'react';
import { Contract } from '@/features/contracts/types/contract';
import { sampleContracts } from '@/features/contracts/data/sampleContracts';

interface ContractContextType {
  contracts: Contract[];
  addContract: (contract: Contract) => void;
  updateContract: (contract: Contract) => void;
  deleteContract: (id: string) => void;
  getContract: (id: string) => Contract | undefined;
}

const ContractContext = createContext<ContractContextType | undefined>(undefined);

export function ContractProvider({ children }: { children: React.ReactNode }) {
  const [contracts, setContracts] = useState<Contract[]>(() => {
    const saved = localStorage.getItem('contracts');
    return saved ? JSON.parse(saved) : sampleContracts;
  });

  const save = useCallback((updated: Contract[]) => {
    setContracts(updated);
    localStorage.setItem('contracts', JSON.stringify(updated));
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
