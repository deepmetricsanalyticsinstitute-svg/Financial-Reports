

export enum AccountType {
  ASSET = 'Asset',
  LIABILITY = 'Liability',
  EQUITY = 'Equity',
  REVENUE = 'Revenue',
  EXPENSE = 'Expense'
}

export interface CustomGroup {
  id: string;
  name: string;
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
  customGroupId?: string; // Link to CustomGroup
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

export interface ReportTemplate {
  id: string;
  name: string;
  reportType: 'IncomeStatement' | 'BalanceSheet';
  hiddenCategories: string[];
}

export interface JournalTemplateLine {
  accountId: string;
  description: string;
  debit: number;
  credit: number;
}

export interface JournalTemplate {
  id: string;
  name: string;
  memo: string;
  lines: JournalTemplateLine[];
}

export interface JournalLineTemplate {
  id: string;
  name: string;
  accountId: string;
  description: string;
  debit: number;
  credit: number;
}

export interface FinancialState {
  ledger: Account[];
  transactions: Transaction[];
  period: string;
  companyName: string;
  currencySign: string; // Display symbol for Base Currency
  baseCurrency: string; // Code e.g., 'USD'
  currencies: Currency[];
  templates: ReportTemplate[];
  journalTemplates: JournalTemplate[];
  journalLineTemplates: JournalLineTemplate[];
  customGroups: CustomGroup[];
}

export type FinancialContextType = {
  state: FinancialState;
  addAccount: (account: Account) => void;
  updateAccountBalance: (id: string, debit: number, credit: number) => void;
  resetData: () => void;
  importLedger: (ledger: Account[], transactions?: Transaction[]) => void;
  updateCompanyName: (name: string) => void;
  updateCurrencySign: (sign: string) => void; // Deprecated but kept for compatibility, updates symbol of base
  updatePeriod: (date: string) => void;
  updateAccountNote: (id: string, note: string) => void;
  updateAccountDetails: (id: string, updates: Partial<Account>) => void;
  bulkUpdateAccounts: (ids: string[], updates: Partial<Account>) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  editTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  
  // Currency Methods
  updateBaseCurrency: (code: string) => void;
  updateExchangeRate: (code: string, rate: number) => void;
  addCurrency: (currency: Currency) => void;

  // Template Methods
  addTemplate: (template: ReportTemplate) => void;
  deleteTemplate: (id: string) => void;

  // Journal Template Methods
  addJournalTemplate: (template: JournalTemplate) => void;
  deleteJournalTemplate: (id: string) => void;

  // Journal Line Template Methods
  addJournalLineTemplate: (template: JournalLineTemplate) => void;
  deleteJournalLineTemplate: (id: string) => void;

  // Custom Group Methods
  addCustomGroup: (name: string) => void;
  updateCustomGroup: (id: string, name: string) => void;
  deleteCustomGroup: (id: string) => void;
};