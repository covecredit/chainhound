import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Case, Note } from '../types/case';
import { useStorage } from './useStorage';

export function useCaseManager() {
  const { getFromStorage, setInStorage } = useStorage();
  const STORAGE_KEY = 'chainhound-cases';
  const ACTIVE_CASE_KEY = 'chainhound-active-case';
  
  const [cases, setCases] = useState<Case[]>([]);
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  
  // Load cases from storage
  useEffect(() => {
    loadCases();
    loadActiveCase();
  }, []);
  
  const loadCases = () => {
    const storedCases = getFromStorage<Record<string, Case>>(STORAGE_KEY, {});
    setCases(Object.values(storedCases));
  };
  
  const loadActiveCase = () => {
    const activeCaseId = getFromStorage<string>(ACTIVE_CASE_KEY, '');
    if (activeCaseId) {
      const storedCases = getFromStorage<Record<string, Case>>(STORAGE_KEY, {});
      const foundCase = storedCases[activeCaseId];
      if (foundCase) {
        setActiveCase(foundCase);
      }
    }
  };
  
  const saveCases = (updatedCases: Case[]) => {
    const casesMap = updatedCases.reduce((acc, caseItem) => {
      acc[caseItem.id] = caseItem;
      return acc;
    }, {} as Record<string, Case>);
    
    setInStorage(STORAGE_KEY, casesMap);
    setCases(updatedCases);
  };
  
  const saveActiveCase = (caseItem: Case | null) => {
    if (caseItem) {
      setInStorage(ACTIVE_CASE_KEY, caseItem.id);
    } else {
      setInStorage(ACTIVE_CASE_KEY, '');
    }
    setActiveCase(caseItem);
  };
  
  const createCase = (name: string, description: string = '') => {
    const newCase: Case = {
      id: uuidv4(),
      name,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      addresses: [],
      contracts: [],
      transactions: [],
      notes: [],
      tags: []
    };
    
    const updatedCases = [...cases, newCase];
    saveCases(updatedCases);
    saveActiveCase(newCase);
    return newCase;
  };
  
  const updateCase = (updatedCase: Case) => {
    updatedCase.updatedAt = Date.now();
    const updatedCases = cases.map(c => 
      c.id === updatedCase.id ? updatedCase : c
    );
    saveCases(updatedCases);
    
    if (activeCase && activeCase.id === updatedCase.id) {
      saveActiveCase(updatedCase);
    }
  };
  
  const deleteCase = (caseId: string) => {
    const updatedCases = cases.filter(c => c.id !== caseId);
    saveCases(updatedCases);
    
    if (activeCase && activeCase.id === caseId) {
      saveActiveCase(updatedCases.length > 0 ? updatedCases[0] : null);
    }
  };
  
  const setActive = (caseId: string) => {
    const caseToActivate = cases.find(c => c.id === caseId) || null;
    saveActiveCase(caseToActivate);
  };
  
  const addNote = (content: string) => {
    if (!activeCase) return null;
    
    const newNote: Note = {
      id: uuidv4(),
      content,
      timestamp: Date.now()
    };
    
    const updatedCase = {
      ...activeCase,
      notes: [...activeCase.notes, newNote],
      updatedAt: Date.now()
    };
    
    updateCase(updatedCase);
    return newNote;
  };
  
  const updateNote = (noteId: string, content: string) => {
    if (!activeCase) return;
    
    const updatedNotes = activeCase.notes.map(note => 
      note.id === noteId ? { ...note, content } : note
    );
    
    const updatedCase = {
      ...activeCase,
      notes: updatedNotes,
      updatedAt: Date.now()
    };
    
    updateCase(updatedCase);
  };
  
  const deleteNote = (noteId: string) => {
    if (!activeCase) return;
    
    const updatedNotes = activeCase.notes.filter(note => note.id !== noteId);
    
    const updatedCase = {
      ...activeCase,
      notes: updatedNotes,
      updatedAt: Date.now()
    };
    
    updateCase(updatedCase);
  };
  
  const addAddress = (address: string) => {
    if (!activeCase) return;
    
    // Don't add if already exists
    if (activeCase.addresses.includes(address)) return;
    
    const updatedCase = {
      ...activeCase,
      addresses: [...activeCase.addresses, address],
      updatedAt: Date.now()
    };
    
    updateCase(updatedCase);
  };
  
  const addContract = (contract: string) => {
    if (!activeCase) return;
    
    // Don't add if already exists
    if (activeCase.contracts.includes(contract)) return;
    
    const updatedCase = {
      ...activeCase,
      contracts: [...activeCase.contracts, contract],
      updatedAt: Date.now()
    };
    
    updateCase(updatedCase);
  };
  
  const addTransaction = (transaction: string) => {
    if (!activeCase) return;
    
    // Don't add if already exists
    if (activeCase.transactions.includes(transaction)) return;
    
    const updatedCase = {
      ...activeCase,
      transactions: [...activeCase.transactions, transaction],
      updatedAt: Date.now()
    };
    
    updateCase(updatedCase);
  };
  
  const addTag = (tag: string) => {
    if (!activeCase) return;
    
    // Don't add if already exists
    if (activeCase.tags.includes(tag)) return;
    
    const updatedCase = {
      ...activeCase,
      tags: [...activeCase.tags, tag],
      updatedAt: Date.now()
    };
    
    updateCase(updatedCase);
  };
  
  const removeAddress = (address: string) => {
    if (!activeCase) return;
    
    const updatedCase = {
      ...activeCase,
      addresses: activeCase.addresses.filter(a => a !== address),
      updatedAt: Date.now()
    };
    
    updateCase(updatedCase);
  };
  
  const removeContract = (contract: string) => {
    if (!activeCase) return;
    
    const updatedCase = {
      ...activeCase,
      contracts: activeCase.contracts.filter(c => c !== contract),
      updatedAt: Date.now()
    };
    
    updateCase(updatedCase);
  };
  
  const removeTransaction = (transaction: string) => {
    if (!activeCase) return;
    
    const updatedCase = {
      ...activeCase,
      transactions: activeCase.transactions.filter(t => t !== transaction),
      updatedAt: Date.now()
    };
    
    updateCase(updatedCase);
  };
  
  const removeTag = (tag: string) => {
    if (!activeCase) return;
    
    const updatedCase = {
      ...activeCase,
      tags: activeCase.tags.filter(t => t !== tag),
      updatedAt: Date.now()
    };
    
    updateCase(updatedCase);
  };
  
  const exportCase = (caseId: string) => {
    const caseToExport = cases.find(c => c.id === caseId) || activeCase;
    if (!caseToExport) return null;
    
    const exportData = JSON.stringify(caseToExport, null, 2);
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `chainhound-case-${caseToExport.name.replace(/\s+/g, '-')}-${timestamp}.json`;
    
    return { data: exportData, filename };
  };
  
  const importCase = (caseData: string) => {
    try {
      const importedCase = JSON.parse(caseData) as Case;
      
      // Validate required fields
      if (!importedCase.id || !importedCase.name || !importedCase.createdAt) {
        throw new Error('Invalid case data format');
      }
      
      // Check if case already exists
      const existingCase = cases.find(c => c.id === importedCase.id);
      if (existingCase) {
        // Update existing case
        const updatedCases = cases.map(c => 
          c.id === importedCase.id ? { ...importedCase, updatedAt: Date.now() } : c
        );
        saveCases(updatedCases);
      } else {
        // Add new case
        const updatedCases = [...cases, { ...importedCase, updatedAt: Date.now() }];
        saveCases(updatedCases);
      }
      
      return true;
    } catch (error) {
      console.error('Error importing case:', error);
      return false;
    }
  };
  
  return {
    cases,
    activeCase,
    createCase,
    updateCase,
    deleteCase,
    setActive,
    addNote,
    updateNote,
    deleteNote,
    addAddress,
    addContract,
    addTransaction,
    addTag,
    removeAddress,
    removeContract,
    removeTransaction,
    removeTag,
    exportCase,
    importCase
  };
}