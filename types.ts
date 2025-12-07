
export enum AccountType {
  ASSET = 'Asset',
  LIABILITY = 'Liability',
  EQUITY = 'Equity',
  REVENUE = 'Revenue',
  EXPENSE = 'Expense'
}

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  debit: number;
  credit: number;
  category: string; // e.g., "Current Assets", "Operating Expenses"
  note?: string; // New field for account notes
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  rate: number; // Conversion rate to Base Currency (1 Foreign Unit = X Base Units)
}

export interface Transaction {
  id: string;
  date: string;
  accountId: string; // Links to Account.id
  description: string;
  amount: number; // Amount in Base Currency
  reference?: string;
  
  // Multi-currency support
  originalCurrency?: string;
  originalAmount?: number;
  exchangeRate?: number;
}

export interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  matchedTransactionId?: string; // ID of the matching ledger transaction
}

export interface FinancialState {
  ledger: Account[];
  transactions: Transaction[];
  period: string;
  companyName: string;
  currencySign: string; // Display symbol for Base Currency
  baseCurrency: string; // Code e.g., 'USD'
  currencies: Currency[];
}

export type FinancialContextType = {
  state: FinancialState;
  updateAccountBalance: (id: string, debit: number, credit: number) => void;
  resetData: () => void;
  importLedger: (ledger: Account[], transactions?: Transaction[]) => void;
  updateCompanyName: (name: string) => void;
  updateCurrencySign: (sign: string) => void; // Deprecated but kept for compatibility, updates symbol of base
  updatePeriod: (date: string) => void;
  updateAccountNote: (id: string, note: string) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  editTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  
  // Currency Methods
  updateBaseCurrency: (code: string) => void;
  updateExchangeRate: (code: string, rate: number) => void;
  addCurrency: (currency: Currency) => void;
};
