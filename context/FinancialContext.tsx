

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Account, AccountType, FinancialContextType, FinancialState, Transaction, Currency, ReportTemplate, JournalTemplate, JournalLineTemplate, CustomGroup } from '../types';

const INITIAL_LEDGER: Account[] = [
  // Assets
  { id: '1', code: '1010', name: 'Cash at Bank', type: AccountType.ASSET, debit: 150000, credit: 0, category: 'Current Assets', note: 'Main operating account at Chase Bank.' },
  { id: '2', code: '1020', name: 'Accounts Receivable', type: AccountType.ASSET, debit: 45000, credit: 0, category: 'Current Assets' },
  { id: '3', code: '1030', name: 'Inventory', type: AccountType.ASSET, debit: 25000, credit: 0, category: 'Current Assets', note: 'Valued at lower of cost or market using FIFO.' },
  { id: '4', code: '1200', name: 'Office Equipment', type: AccountType.ASSET, debit: 12000, credit: 0, category: 'Non-Current Assets', note: 'Depreciated over 5 years straight-line.' },
  
  // Liabilities
  { id: '5', code: '2010', name: 'Accounts Payable', type: AccountType.LIABILITY, debit: 0, credit: 35000, category: 'Current Liabilities' },
  { id: '6', code: '2020', name: 'Sales Tax Payable', type: AccountType.LIABILITY, debit: 0, credit: 5000, category: 'Current Liabilities' },
  { id: '7', code: '2100', name: 'Bank Loan (Long Term)', type: AccountType.LIABILITY, debit: 0, credit: 100000, category: 'Non-Current Liabilities', note: '5-year term loan @ 5% interest.' },

  // Equity
  { id: '8', code: '3010', name: 'Owner\'s Capital', type: AccountType.EQUITY, debit: 0, credit: 80000, category: 'Equity' },
  { id: '9', code: '3020', name: 'Retained Earnings', type: AccountType.EQUITY, debit: 0, credit: 12000, category: 'Equity' },

  // Revenue
  { id: '10', code: '4010', name: 'Sales Revenue', type: AccountType.REVENUE, debit: 0, credit: 250000, category: 'Revenue' },
  { id: '11', code: '4020', name: 'Service Revenue', type: AccountType.REVENUE, debit: 0, credit: 50000, category: 'Revenue' },

  // Expenses
  { id: '12', code: '5010', name: 'Cost of Goods Sold', type: AccountType.EXPENSE, debit: 110000, credit: 0, category: 'Cost of Sales' },
  { id: '13', code: '5100', name: 'Rent Expense', type: AccountType.EXPENSE, debit: 24000, credit: 0, category: 'Operating Expenses' },
  { id: '14', code: '5110', name: 'Wages Expense', type: AccountType.EXPENSE, debit: 140000, credit: 0, category: 'Operating Expenses' },
  { id: '15', code: '5120', name: 'Utilities Expense', type: AccountType.EXPENSE, debit: 6000, credit: 0, category: 'Operating Expenses' },
  { id: '16', code: '5130', name: 'Marketing Expense', type: AccountType.EXPENSE, debit: 20000, credit: 0, category: 'Operating Expenses' },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  // Sample transactions for "Cash at Bank" (id: 1) to enable reconciliation demo
  { id: 't1', accountId: '1', date: '2024-03-01', description: 'Opening Balance', amount: 100000 },
  { id: 't2', accountId: '1', date: '2024-03-05', description: 'Client Payment #1042', amount: 15000 },
  { id: 't3', accountId: '1', date: '2024-03-10', description: 'Rent Payment - March', amount: -2000 },
  { id: 't4', accountId: '1', date: '2024-03-15', description: 'Utility Bill Payment', amount: -450.50 },
  { id: 't5', accountId: '1', date: '2024-03-20', description: 'Client Payment #1043', amount: 37450.50 },
];

const INITIAL_CURRENCIES: Currency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1.0 },
  { code: 'EUR', name: 'Euro', symbol: '€', rate: 1.09 },
  { code: 'GBP', name: 'British Pound', symbol: '£', rate: 1.27 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', rate: 0.74 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', rate: 0.66 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', rate: 0.0068 },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', rate: 0.14 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', rate: 0.012 },
];

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const FinancialProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<FinancialState>({
    ledger: INITIAL_LEDGER,
    transactions: INITIAL_TRANSACTIONS,
    period: 'March 2024',
    companyName: 'Acme Corp.',
    currencySign: '$',
    baseCurrency: 'USD',
    currencies: INITIAL_CURRENCIES,
    templates: [],
    journalTemplates: [],
    journalLineTemplates: [],
    customGroups: []
  });

  const updateAccountBalance = (id: string, debit: number, credit: number) => {
    setState(prev => ({
      ...prev,
      ledger: prev.ledger.map(acc => 
        acc.id === id ? { ...acc, debit, credit } : acc
      )
    }));
  };

  const importLedger = (newLedger: Account[], newTransactions?: Transaction[]) => {
    setState(prev => ({
      ...prev,
      ledger: newLedger,
      transactions: newTransactions || [] 
    }));
  };

  const updateCompanyName = (name: string) => {
    setState(prev => ({
      ...prev,
      companyName: name
    }));
  };

  const updateCurrencySign = (sign: string) => {
    // Legacy support: updates the symbol of the current base currency locally in list
    // and the global display sign
    setState(prev => ({
      ...prev,
      currencySign: sign,
      currencies: prev.currencies.map(c => c.code === prev.baseCurrency ? { ...c, symbol: sign } : c)
    }));
  };

  const updateBaseCurrency = (code: string) => {
    const selected = state.currencies.find(c => c.code === code);
    if (!selected) return;

    // Note: Changing base currency implies FUTURE transactions use this base.
    // Existing ledger amounts are NOT automatically converted in this simplified model 
    // to prevent accidental data destruction.
    setState(prev => ({
      ...prev,
      baseCurrency: code,
      currencySign: selected.symbol
    }));
  };

  const updateExchangeRate = (code: string, rate: number) => {
    setState(prev => ({
      ...prev,
      currencies: prev.currencies.map(c => c.code === code ? { ...c, rate } : c)
    }));
  };

  const addCurrency = (currency: Currency) => {
    setState(prev => {
      if (prev.currencies.some(c => c.code === currency.code)) return prev;
      return {
        ...prev,
        currencies: [...prev.currencies, currency]
      };
    });
  };

  const updatePeriod = (date: string) => {
    setState(prev => ({
      ...prev,
      period: date
    }));
  };

  const updateAccountNote = (id: string, note: string) => {
    setState(prev => ({
      ...prev,
      ledger: prev.ledger.map(acc => 
        acc.id === id ? { ...acc, note } : acc
      )
    }));
  };

  const updateAccountDetails = (id: string, updates: Partial<Account>) => {
    setState(prev => ({
      ...prev,
      ledger: prev.ledger.map(acc => 
        acc.id === id ? { ...acc, ...updates } : acc
      )
    }));
  };

  const addTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const transactionId = `manual-${Date.now()}`;
    
    // Currency Conversion Logic
    // Input Amount is in originalCurrency
    // Ledger Amount must be in baseCurrency
    let finalAmount = newTx.amount;
    let exchangeRate = newTx.exchangeRate || 1.0;

    // If original currency is provided and differs from base, ensure conversion
    if (newTx.originalCurrency && newTx.originalCurrency !== state.baseCurrency) {
       // If exchange rate wasn't explicitly provided, look it up
       if (!newTx.exchangeRate) {
         const currency = state.currencies.find(c => c.code === newTx.originalCurrency);
         exchangeRate = currency ? currency.rate : 1.0;
       }
       
       // Calculate Base Amount: 
       // Case: Rate is defined as "1 Unit of Foreign = X Base"
       // Amount (Base) = Amount (Foreign) * Rate
       finalAmount = newTx.originalAmount ? newTx.originalAmount * exchangeRate : newTx.amount * exchangeRate;
    }

    const transaction: Transaction = { 
      ...newTx, 
      id: transactionId,
      amount: finalAmount, // Store converted amount for ledger math
      exchangeRate
    };
    
    setState(prev => {
      // 1. Add Transaction
      const updatedTransactions = [...prev.transactions, transaction];
      
      // 2. Update Account Balance
      const updatedLedger = prev.ledger.map(acc => {
        if (acc.id === transaction.accountId) {
          let newDebit = acc.debit;
          let newCredit = acc.credit;

          if (transaction.amount > 0) newDebit += transaction.amount;
          else newCredit += Math.abs(transaction.amount);

          return { ...acc, debit: newDebit, credit: newCredit };
        }
        return acc;
      });

      return {
        ...prev,
        ledger: updatedLedger,
        transactions: updatedTransactions
      };
    });
  };

  const editTransaction = (id: string, updates: Partial<Transaction>) => {
    setState(prev => {
      const oldTx = prev.transactions.find(t => t.id === id);
      if (!oldTx) return prev;

      // Simple edit: assumes amount update is already in base currency 
      // or that advanced currency edit is handled by passing converted amount in 'updates'
      const newAmount = updates.amount !== undefined ? updates.amount : oldTx.amount;
      
      const updatedLedger = prev.ledger.map(acc => {
        if (acc.id === oldTx.accountId) {
           let newDebit = acc.debit;
           let newCredit = acc.credit;

           // Remove old effect
           if (oldTx.amount > 0) newDebit -= oldTx.amount;
           else newCredit -= Math.abs(oldTx.amount);

           // Add new effect
           if (newAmount > 0) newDebit += newAmount;
           else newCredit += Math.abs(newAmount);

           return { ...acc, debit: newDebit, credit: newCredit };
        }
        return acc;
      });

      const updatedTransactions = prev.transactions.map(t => 
        t.id === id ? { ...t, ...updates } : t
      );

      return {
        ...prev,
        ledger: updatedLedger,
        transactions: updatedTransactions
      };
    });
  };

  const deleteTransaction = (id: string) => {
    setState(prev => {
      const tx = prev.transactions.find(t => t.id === id);
      if (!tx) return prev;

      const updatedLedger = prev.ledger.map(acc => {
        if (acc.id === tx.accountId) {
          let newDebit = acc.debit;
          let newCredit = acc.credit;

          if (tx.amount > 0) newDebit -= tx.amount;
          else newCredit -= Math.abs(tx.amount);

          return { ...acc, debit: newDebit, credit: newCredit };
        }
        return acc;
      });

      return {
        ...prev,
        ledger: updatedLedger,
        transactions: prev.transactions.filter(t => t.id !== id)
      };
    });
  };

  const addTemplate = (template: ReportTemplate) => {
    setState(prev => ({
      ...prev,
      templates: [...prev.templates, template]
    }));
  };

  const deleteTemplate = (id: string) => {
    setState(prev => ({
      ...prev,
      templates: prev.templates.filter(t => t.id !== id)
    }));
  };

  const addJournalTemplate = (template: JournalTemplate) => {
    setState(prev => ({
      ...prev,
      journalTemplates: [...prev.journalTemplates, template]
    }));
  };

  const deleteJournalTemplate = (id: string) => {
    setState(prev => ({
      ...prev,
      journalTemplates: prev.journalTemplates.filter(t => t.id !== id)
    }));
  };

  const addJournalLineTemplate = (template: JournalLineTemplate) => {
    setState(prev => ({
      ...prev,
      journalLineTemplates: [...prev.journalLineTemplates, template]
    }));
  };

  const deleteJournalLineTemplate = (id: string) => {
    setState(prev => ({
      ...prev,
      journalLineTemplates: prev.journalLineTemplates.filter(t => t.id !== id)
    }));
  };

  // Custom Group Methods
  const addCustomGroup = (name: string) => {
    const newGroup: CustomGroup = { id: `group-${Date.now()}`, name };
    setState(prev => ({
      ...prev,
      customGroups: [...prev.customGroups, newGroup]
    }));
  };

  const updateCustomGroup = (id: string, name: string) => {
    setState(prev => ({
      ...prev,
      customGroups: prev.customGroups.map(g => g.id === id ? { ...g, name } : g)
    }));
  };

  const deleteCustomGroup = (id: string) => {
    setState(prev => ({
      ...prev,
      customGroups: prev.customGroups.filter(g => g.id !== id),
      // Optional: Remove group assignment from accounts?
      // For now, let's reset account customGroupId if it matches
      ledger: prev.ledger.map(acc => acc.customGroupId === id ? { ...acc, customGroupId: undefined } : acc)
    }));
  };

  const resetData = () => {
    setState({
      ledger: INITIAL_LEDGER,
      transactions: INITIAL_TRANSACTIONS,
      period: 'March 2024',
      companyName: 'Acme Corp.',
      currencySign: '$',
      baseCurrency: 'USD',
      currencies: INITIAL_CURRENCIES,
      templates: [],
      journalTemplates: [],
      journalLineTemplates: [],
      customGroups: []
    });
  };

  return (
    <FinancialContext.Provider value={{ 
      state, 
      updateAccountBalance, 
      resetData, 
      importLedger, 
      updateCompanyName,
      updateCurrencySign,
      updatePeriod,
      updateAccountNote,
      updateAccountDetails,
      addTransaction,
      editTransaction,
      deleteTransaction,
      updateBaseCurrency,
      updateExchangeRate,
      addCurrency,
      addTemplate,
      deleteTemplate,
      addJournalTemplate,
      deleteJournalTemplate,
      addJournalLineTemplate,
      deleteJournalLineTemplate,
      addCustomGroup,
      updateCustomGroup,
      deleteCustomGroup
    }}>
      {children}
    </FinancialContext.Provider>
  );
};

export const useFinancials = () => {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error('useFinancials must be used within a FinancialProvider');
  }
  return context;
};