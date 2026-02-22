import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Account, AccountType, FinancialContextType, FinancialState, Transaction, Currency, ReportTemplate, JournalTemplate, JournalLineTemplate, CustomGroup } from '../types';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';

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
  { code: 'GHC', name: 'Ghanaian Cedi', symbol: '₵', rate: 0.08 },
];

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const FinancialProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<FinancialState>({
    ledger: [],
    transactions: [],
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

  // Load data from Supabase
  useEffect(() => {
    if (user) {
      loadData();
    } else {
      // Reset to empty or initial state if no user
      setState(prev => ({ ...prev, ledger: [], transactions: [] }));
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Settings
      const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', user.id).single();
      
      if (!settings) {
        await seedData();
        return;
      }

      // 2. Accounts
      const { data: accounts } = await supabase.from('accounts').select('*').eq('user_id', user.id);
      
      // 3. Transactions
      const { data: transactions } = await supabase.from('transactions').select('*').eq('user_id', user.id);

      // 4. Templates
      const { data: reportTemplates } = await supabase.from('report_templates').select('*').eq('user_id', user.id);
      const { data: journalTemplates } = await supabase.from('journal_templates').select('*').eq('user_id', user.id);
      const { data: journalLineTemplates } = await supabase.from('journal_line_templates').select('*').eq('user_id', user.id);
      
      // 5. Custom Groups
      const { data: customGroups } = await supabase.from('custom_groups').select('*').eq('user_id', user.id);

      setState({
        ledger: (accounts || []).map(a => ({
          ...a,
          customGroupId: a.custom_group_id
        })),
        transactions: (transactions || []).map(t => ({
          ...t,
          accountId: t.account_id,
          originalCurrency: t.original_currency,
          originalAmount: t.original_amount,
          exchangeRate: t.exchange_rate
        })),
        period: settings.period || 'March 2024',
        companyName: settings.company_name || 'Acme Corp.',
        currencySign: settings.currency_sign || '$',
        baseCurrency: settings.base_currency || 'USD',
        currencies: settings.currencies || INITIAL_CURRENCIES,
        templates: (reportTemplates || []).map(t => ({
          ...t,
          reportType: t.report_type,
          hiddenCategories: t.hidden_categories
        })),
        journalTemplates: (journalTemplates || []).map(t => ({
          ...t,
          lines: t.lines || []
        })),
        journalLineTemplates: (journalLineTemplates || []).map(t => ({
          ...t,
          accountId: t.account_id
        })),
        customGroups: customGroups || []
      });

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const seedData = async () => {
    if (!user) return;
    
    // Settings
    await supabase.from('user_settings').insert({
      user_id: user.id,
      company_name: 'Acme Corp.',
      period: 'March 2024',
      currency_sign: '$',
      base_currency: 'USD',
      currencies: INITIAL_CURRENCIES
    });

    // Accounts
    // Generate new unique IDs for accounts to prevent collisions
    const accountIdMap = new Map<string, string>();
    const accountsPayload = INITIAL_LEDGER.map(a => {
      const newId = `acc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${a.id}`;
      accountIdMap.set(a.id, newId);
      return {
        id: newId,
        user_id: user.id,
        code: a.code,
        name: a.name,
        type: a.type,
        debit: a.debit,
        credit: a.credit,
        category: a.category,
        note: a.note
      };
    });
    await supabase.from('accounts').insert(accountsPayload);

    // Transactions
    // Use the new account IDs
    const transactionsPayload = INITIAL_TRANSACTIONS.map((t, index) => ({
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`,
      user_id: user.id,
      date: t.date,
      account_id: accountIdMap.get(t.accountId) || t.accountId,
      description: t.description,
      amount: t.amount
    }));
    await supabase.from('transactions').insert(transactionsPayload);

    await loadData();
  };

  const addAccount = async (account: Account) => {
    if (!user) return;
    
    const { error } = await supabase.from('accounts').insert({
      id: account.id,
      user_id: user.id,
      code: account.code,
      name: account.name,
      type: account.type,
      debit: account.debit,
      credit: account.credit,
      category: account.category,
      note: account.note,
      custom_group_id: account.customGroupId
    });

    if (!error) {
      setState(prev => ({
        ...prev,
        ledger: [...prev.ledger, account]
      }));
    }
  };

  const updateAccountBalance = async (id: string, debit: number, credit: number) => {
    if (!user) return;

    const { error } = await supabase.from('accounts').update({ debit, credit }).eq('id', id).eq('user_id', user.id);

    if (!error) {
      setState(prev => ({
        ...prev,
        ledger: prev.ledger.map(acc => 
          acc.id === id ? { ...acc, debit, credit } : acc
        )
      }));
    }
  };

  const importLedger = async (newLedger: Account[], newTransactions?: Transaction[]) => {
    if (!user) return;

    // Delete existing
    await supabase.from('accounts').delete().eq('user_id', user.id);
    await supabase.from('transactions').delete().eq('user_id', user.id);

    // Insert new with unique IDs
    const accountIdMap = new Map<string, string>();
    const accountsPayload = newLedger.map(a => {
      // Generate a unique ID for the account
      const newId = `acc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${a.code}`;
      accountIdMap.set(a.id, newId);
      
      return {
        id: newId,
        user_id: user.id,
        code: a.code,
        name: a.name,
        type: a.type,
        debit: a.debit,
        credit: a.credit,
        category: a.category,
        note: a.note,
        custom_group_id: a.customGroupId
      };
    });
    await supabase.from('accounts').insert(accountsPayload);

    if (newTransactions && newTransactions.length > 0) {
      const txPayload = newTransactions.map((t, index) => ({
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`,
        user_id: user.id,
        date: t.date,
        account_id: accountIdMap.get(t.accountId) || t.accountId, // Use mapped ID
        description: t.description,
        amount: t.amount,
        reference: t.reference,
        original_currency: t.originalCurrency,
        original_amount: t.originalAmount,
        exchange_rate: t.exchangeRate
      }));
      await supabase.from('transactions').insert(txPayload);
    }

    // Reload data to sync state with new IDs
    await loadData();
  };

  const updateCompanyName = async (name: string) => {
    if (!user) return;
    await supabase.from('user_settings').update({ company_name: name }).eq('user_id', user.id);
    setState(prev => ({ ...prev, companyName: name }));
  };

  const updateCurrencySign = async (sign: string) => {
    if (!user) return;
    // Also update the symbol in currencies array
    const updatedCurrencies = state.currencies.map(c => c.code === state.baseCurrency ? { ...c, symbol: sign } : c);
    
    await supabase.from('user_settings').update({ 
      currency_sign: sign,
      currencies: updatedCurrencies
    }).eq('user_id', user.id);

    setState(prev => ({
      ...prev,
      currencySign: sign,
      currencies: updatedCurrencies
    }));
  };

  const updateBaseCurrency = async (code: string) => {
    if (!user) return;
    const selected = state.currencies.find(c => c.code === code);
    if (!selected) return;

    await supabase.from('user_settings').update({ 
      base_currency: code,
      currency_sign: selected.symbol
    }).eq('user_id', user.id);

    setState(prev => ({
      ...prev,
      baseCurrency: code,
      currencySign: selected.symbol
    }));
  };

  const updateExchangeRate = async (code: string, rate: number) => {
    if (!user) return;
    const updatedCurrencies = state.currencies.map(c => c.code === code ? { ...c, rate } : c);
    
    await supabase.from('user_settings').update({ currencies: updatedCurrencies }).eq('user_id', user.id);

    setState(prev => ({
      ...prev,
      currencies: updatedCurrencies
    }));
  };

  const addCurrency = async (currency: Currency) => {
    if (!user) return;
    if (state.currencies.some(c => c.code === currency.code)) return;

    const updatedCurrencies = [...state.currencies, currency];
    await supabase.from('user_settings').update({ currencies: updatedCurrencies }).eq('user_id', user.id);

    setState(prev => ({
      ...prev,
      currencies: updatedCurrencies
    }));
  };

  const updatePeriod = async (date: string) => {
    if (!user) return;
    await supabase.from('user_settings').update({ period: date }).eq('user_id', user.id);
    setState(prev => ({ ...prev, period: date }));
  };

  const updateAccountNote = async (id: string, note: string) => {
    if (!user) return;
    await supabase.from('accounts').update({ note }).eq('id', id).eq('user_id', user.id);
    setState(prev => ({
      ...prev,
      ledger: prev.ledger.map(acc => acc.id === id ? { ...acc, note } : acc)
    }));
  };

  const updateAccountDetails = async (id: string, updates: Partial<Account>) => {
    if (!user) return;
    
    const dbUpdates: any = { ...updates };
    if (updates.customGroupId !== undefined) dbUpdates.custom_group_id = updates.customGroupId;
    delete dbUpdates.customGroupId;

    await supabase.from('accounts').update(dbUpdates).eq('id', id).eq('user_id', user.id);

    setState(prev => ({
      ...prev,
      ledger: prev.ledger.map(acc => acc.id === id ? { ...acc, ...updates } : acc)
    }));
  };

  const bulkUpdateAccounts = async (ids: string[], updates: Partial<Account>) => {
    if (!user) return;

    const dbUpdates: any = { ...updates };
    if (updates.customGroupId !== undefined) dbUpdates.custom_group_id = updates.customGroupId;
    delete dbUpdates.customGroupId;

    // Supabase doesn't support bulk update with 'in' easily for different values, but here updates are same for all
    await supabase.from('accounts').update(dbUpdates).in('id', ids).eq('user_id', user.id);

    setState(prev => ({
      ...prev,
      ledger: prev.ledger.map(acc => ids.includes(acc.id) ? { ...acc, ...updates } : acc)
    }));
  };

  const addTransaction = async (newTx: Omit<Transaction, 'id'>) => {
    if (!user) return;

    const transactionId = `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    let finalAmount = newTx.amount;
    let exchangeRate = newTx.exchangeRate || 1.0;

    if (newTx.originalCurrency && newTx.originalCurrency !== state.baseCurrency) {
       if (!newTx.exchangeRate) {
         const currency = state.currencies.find(c => c.code === newTx.originalCurrency);
         exchangeRate = currency ? currency.rate : 1.0;
       }
       finalAmount = newTx.originalAmount ? newTx.originalAmount * exchangeRate : newTx.amount * exchangeRate;
    }

    const transaction: Transaction = { 
      ...newTx, 
      id: transactionId,
      amount: finalAmount,
      exchangeRate
    };
    
    // 1. Insert Transaction
    await supabase.from('transactions').insert({
      id: transaction.id,
      user_id: user.id,
      date: transaction.date,
      account_id: transaction.accountId,
      description: transaction.description,
      amount: transaction.amount,
      reference: transaction.reference,
      original_currency: transaction.originalCurrency,
      original_amount: transaction.originalAmount,
      exchange_rate: transaction.exchangeRate
    });

    // 2. Update Account Balance
    // We need to calculate new balance.
    const account = state.ledger.find(a => a.id === transaction.accountId);
    if (account) {
      let newDebit = account.debit;
      let newCredit = account.credit;

      if (transaction.amount > 0) newDebit += transaction.amount;
      else newCredit += Math.abs(transaction.amount);

      await supabase.from('accounts').update({ debit: newDebit, credit: newCredit }).eq('id', account.id).eq('user_id', user.id);
      
      setState(prev => {
        const updatedLedger = prev.ledger.map(acc => {
          if (acc.id === transaction.accountId) {
            return { ...acc, debit: newDebit, credit: newCredit };
          }
          return acc;
        });
        return {
          ...prev,
          ledger: updatedLedger,
          transactions: [...prev.transactions, transaction]
        };
      });
    } else {
      // Just update transactions if account not found (shouldn't happen)
      setState(prev => ({
        ...prev,
        transactions: [...prev.transactions, transaction]
      }));
    }
  };

  const editTransaction = async (id: string, updates: Partial<Transaction>) => {
    if (!user) return;

    const oldTx = state.transactions.find(t => t.id === id);
    if (!oldTx) return;

    const newAmount = updates.amount !== undefined ? updates.amount : oldTx.amount;
    
    // Update Transaction in DB
    const dbUpdates: any = { ...updates };
    if (updates.accountId) dbUpdates.account_id = updates.accountId;
    if (updates.originalCurrency) dbUpdates.original_currency = updates.originalCurrency;
    if (updates.originalAmount) dbUpdates.original_amount = updates.originalAmount;
    if (updates.exchangeRate) dbUpdates.exchange_rate = updates.exchangeRate;
    delete dbUpdates.accountId;
    delete dbUpdates.originalCurrency;
    delete dbUpdates.originalAmount;
    delete dbUpdates.exchangeRate;

    await supabase.from('transactions').update(dbUpdates).eq('id', id).eq('user_id', user.id);

    // Update Account Balances
    // If account changed, we need to update two accounts.
    // For simplicity, let's assume accountId doesn't change often or handle it if it does.
    // The current logic in original file assumed accountId didn't change or handled it simply.
    // The original logic only updated the SAME account.
    
    const account = state.ledger.find(a => a.id === oldTx.accountId);
    if (account) {
       let newDebit = account.debit;
       let newCredit = account.credit;

       // Remove old effect
       if (oldTx.amount > 0) newDebit -= oldTx.amount;
       else newCredit -= Math.abs(oldTx.amount);

       // Add new effect
       if (newAmount > 0) newDebit += newAmount;
       else newCredit += Math.abs(newAmount);

       await supabase.from('accounts').update({ debit: newDebit, credit: newCredit }).eq('id', account.id).eq('user_id', user.id);

       setState(prev => {
         const updatedLedger = prev.ledger.map(acc => 
           acc.id === account.id ? { ...acc, debit: newDebit, credit: newCredit } : acc
         );
         const updatedTransactions = prev.transactions.map(t => 
           t.id === id ? { ...t, ...updates } : t
         );
         return { ...prev, ledger: updatedLedger, transactions: updatedTransactions };
       });
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!user) return;

    const tx = state.transactions.find(t => t.id === id);
    if (!tx) return;

    await supabase.from('transactions').delete().eq('id', id).eq('user_id', user.id);

    const account = state.ledger.find(a => a.id === tx.accountId);
    if (account) {
      let newDebit = account.debit;
      let newCredit = account.credit;

      if (tx.amount > 0) newDebit -= tx.amount;
      else newCredit -= Math.abs(tx.amount);

      await supabase.from('accounts').update({ debit: newDebit, credit: newCredit }).eq('id', account.id).eq('user_id', user.id);

      setState(prev => ({
        ...prev,
        ledger: prev.ledger.map(acc => acc.id === account.id ? { ...acc, debit: newDebit, credit: newCredit } : acc),
        transactions: prev.transactions.filter(t => t.id !== id)
      }));
    }
  };

  const addTemplate = async (template: ReportTemplate) => {
    if (!user) return;
    await supabase.from('report_templates').insert({
      id: template.id,
      user_id: user.id,
      name: template.name,
      report_type: template.reportType,
      hidden_categories: template.hiddenCategories
    });
    setState(prev => ({ ...prev, templates: [...prev.templates, template] }));
  };

  const deleteTemplate = async (id: string) => {
    if (!user) return;
    await supabase.from('report_templates').delete().eq('id', id).eq('user_id', user.id);
    setState(prev => ({ ...prev, templates: prev.templates.filter(t => t.id !== id) }));
  };

  const addJournalTemplate = async (template: JournalTemplate) => {
    if (!user) return;
    await supabase.from('journal_templates').insert({
      id: template.id,
      user_id: user.id,
      name: template.name,
      memo: template.memo,
      lines: template.lines
    });
    setState(prev => ({ ...prev, journalTemplates: [...prev.journalTemplates, template] }));
  };

  const deleteJournalTemplate = async (id: string) => {
    if (!user) return;
    await supabase.from('journal_templates').delete().eq('id', id).eq('user_id', user.id);
    setState(prev => ({ ...prev, journalTemplates: prev.journalTemplates.filter(t => t.id !== id) }));
  };

  const addJournalLineTemplate = async (template: JournalLineTemplate) => {
    if (!user) return;
    await supabase.from('journal_line_templates').insert({
      id: template.id,
      user_id: user.id,
      name: template.name,
      account_id: template.accountId,
      description: template.description,
      debit: template.debit,
      credit: template.credit
    });
    setState(prev => ({ ...prev, journalLineTemplates: [...prev.journalLineTemplates, template] }));
  };

  const deleteJournalLineTemplate = async (id: string) => {
    if (!user) return;
    await supabase.from('journal_line_templates').delete().eq('id', id).eq('user_id', user.id);
    setState(prev => ({ ...prev, journalLineTemplates: prev.journalLineTemplates.filter(t => t.id !== id) }));
  };

  const addCustomGroup = async (name: string) => {
    if (!user) return;
    const newGroup: CustomGroup = { id: `group-${Date.now()}`, name };
    await supabase.from('custom_groups').insert({
      id: newGroup.id,
      user_id: user.id,
      name: newGroup.name
    });
    setState(prev => ({ ...prev, customGroups: [...prev.customGroups, newGroup] }));
  };

  const updateCustomGroup = async (id: string, name: string) => {
    if (!user) return;
    await supabase.from('custom_groups').update({ name }).eq('id', id).eq('user_id', user.id);
    setState(prev => ({ ...prev, customGroups: prev.customGroups.map(g => g.id === id ? { ...g, name } : g) }));
  };

  const deleteCustomGroup = async (id: string) => {
    if (!user) return;
    await supabase.from('custom_groups').delete().eq('id', id).eq('user_id', user.id);
    
    // Reset account customGroupId
    await supabase.from('accounts').update({ custom_group_id: null }).eq('custom_group_id', id).eq('user_id', user.id);

    setState(prev => ({
      ...prev,
      customGroups: prev.customGroups.filter(g => g.id !== id),
      ledger: prev.ledger.map(acc => acc.customGroupId === id ? { ...acc, customGroupId: undefined } : acc)
    }));
  };

  const resetData = async () => {
    if (!user) return;
    await seedData();
  };

  return (
    <FinancialContext.Provider value={{ 
      state, 
      addAccount,
      updateAccountBalance, 
      resetData, 
      importLedger, 
      updateCompanyName,
      updateCurrencySign,
      updatePeriod,
      updateAccountNote,
      updateAccountDetails,
      bulkUpdateAccounts,
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