import { Account, AccountType, BankTransaction, Transaction } from '../types';

const typeMap: Record<string, AccountType> = {
  'asset': AccountType.ASSET,
  'assets': AccountType.ASSET,
  'liability': AccountType.LIABILITY,
  'liabilities': AccountType.LIABILITY,
  'equity': AccountType.EQUITY,
  'revenue': AccountType.REVENUE,
  'income': AccountType.REVENUE,
  'expense': AccountType.EXPENSE,
  'expenses': AccountType.EXPENSE
};

const cleanCSVValue = (val: string) => {
  if (!val) return '';
  if (val.startsWith('"') && val.endsWith('"')) {
    val = val.slice(1, -1);
  }
  return val.replace(/""/g, '"').trim();
};

const parseCurrency = (val: string) => {
  if (!val) return 0;
  const cleaned = cleanCSVValue(val).replace(/[$,]/g, '');
  return parseFloat(cleaned) || 0;
};

const parseCSVLine = (text: string) => {
  const result = [];
  let cell = '';
  let quote = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      quote = !quote;
    } else if (char === ',' && !quote) {
      result.push(cell);
      cell = '';
    } else {
      cell += char;
    }
  }
  result.push(cell);
  return result.map(v => v.trim());
};

export const generateTemplate = (mode: 'tb' | 'gl') => {
  if (mode === 'gl') {
    const headers = "Date,Code,Name,Type,Category,Description,Debit,Credit\n";
    const row1 = '2024-03-01,5100,Rent Expense,Expense,Operating Expenses,Monthly Office Rent,2000,0\n';
    const row2 = '2024-03-01,1010,Cash at Bank,Asset,Current Assets,Rent Payment,0,2000\n';
    const row3 = '2024-03-05,4010,Sales Revenue,Revenue,Revenue,Client Invoice #101,0,5000\n';
    const row4 = '2024-03-05,1020,Accounts Receivable,Asset,Current Assets,Client Invoice #101,5000,0';
    return headers + row1 + row2 + row3 + row4;
  } else {
    const headers = "Code,Name,Type,Category,Debit,Credit,Note\n";
    const row1 = '1010,"Cash, Petty",Asset,Current Assets,1000,0,Float for small expenses\n';
    const row2 = '2010,Accounts Payable,Liability,Current Liabilities,0,1000,';
    return headers + row1 + row2;
  }
};

export const generateBankTemplate = () => {
  const headers = "Date,Description,Amount\n";
  const row1 = '2024-03-05,Client Payment #1042,15000.00\n';
  const row2 = '2024-03-10,Rent Payment,-2000.00\n';
  const row3 = '2024-03-12,Bank Service Fee,-25.00';
  return headers + row1 + row2 + row3;
};

export const parseBankCSVFile = async (file: File): Promise<BankTransaction[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/);
        if (lines.length < 2) throw new Error("File appears to be empty.");

        const headerLine = lines[0].replace(/^\uFEFF/, '');
        const headers = parseCSVLine(headerLine).map(h => cleanCSVValue(h).toLowerCase());

        if (!headers.includes('date') || !headers.includes('amount')) {
          throw new Error("Missing required columns: Date, Amount");
        }

        const transactions: BankTransaction[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const values = parseCSVLine(line);
          const getVal = (key: string) => values[headers.indexOf(key)];

          const date = cleanCSVValue(getVal('date'));
          const description = headers.includes('description') ? cleanCSVValue(getVal('description')) : 'Bank Transaction';
          const amount = parseCurrency(getVal('amount'));

          if (date && !isNaN(amount)) {
            transactions.push({
              id: `bank-${i}-${Date.now()}`,
              date,
              description,
              amount
            });
          }
        }
        resolve(transactions);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

export const parseCSVFile = async (file: File, mode: 'tb' | 'gl'): Promise<{ accounts: Account[], transactions: Transaction[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/);
        if (lines.length < 2) throw new Error("File appears to be empty or missing data.");

        const headerLine = lines[0].replace(/^\uFEFF/, '');
        const headers = parseCSVLine(headerLine).map(h => cleanCSVValue(h).toLowerCase());

        const required = ['code', 'name', 'type', 'category', 'debit', 'credit'];
        const missing = required.filter(h => !headers.includes(h));
        if (missing.length > 0) {
          throw new Error(`Missing required columns: ${missing.join(', ')}`);
        }

        const accountsMap = new Map<string, Account>();
        const transactions: Transaction[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const values = parseCSVLine(line);
          const getVal = (key: string) => values[headers.indexOf(key)];

          const code = cleanCSVValue(getVal('code'));
          if (!code) continue;

          const rawType = cleanCSVValue(getVal('type')).toLowerCase();
          const typeKey = Object.keys(typeMap).find(k => rawType.includes(k));
          const type = typeKey ? typeMap[typeKey as keyof typeof typeMap] : AccountType.ASSET;
          
          const debit = parseCurrency(getVal('debit'));
          const credit = parseCurrency(getVal('credit'));
          const name = cleanCSVValue(getVal('name'));
          const category = cleanCSVValue(getVal('category'));
          
          const descriptionVal = headers.includes('description') ? cleanCSVValue(getVal('description')) : 
                                 headers.includes('note') ? cleanCSVValue(getVal('note')) : '';
          
          const dateVal = headers.includes('date') ? cleanCSVValue(getVal('date')) : new Date().toISOString().split('T')[0];

          // Accumulate Account Balances
          if (accountsMap.has(code)) {
            const existing = accountsMap.get(code)!;
            existing.debit += debit;
            existing.credit += credit;
            if (name) existing.name = name;
            if (category) existing.category = category;
            
            if (descriptionVal) {
               const currentNote = existing.note || '';
               const parts = currentNote.split('; ').filter(p => p.trim().length > 0 && p !== 'Aggregated from transaction upload');
               if (!parts.includes(descriptionVal)) {
                 parts.push(descriptionVal);
                 existing.note = parts.join('; ');
               }
            }
          } else {
            accountsMap.set(code, {
              id: `imported-acc-${code}`,
              code,
              name,
              type,
              category,
              debit,
              credit,
              note: descriptionVal || (mode === 'gl' ? 'Aggregated from transaction upload' : '')
            });
          }

          // If in GL mode, store individual transactions
          if (mode === 'gl') {
             // For simplified GL, Debit is +ve amount, Credit is -ve amount for Asset/Expense?
             // Actually, let's store standard accounting: 
             // We need a signed amount for reconciliation matching. 
             // Typically: Asset Debit (+), Asset Credit (-). 
             
             let netAmount = 0;
             if (debit > 0 && credit === 0) netAmount = debit;
             else if (credit > 0 && debit === 0) netAmount = -credit;
             else netAmount = debit - credit;

             transactions.push({
               id: `trans-${i}-${Date.now()}`,
               date: dateVal,
               accountId: `imported-acc-${code}`, // This links to the map ID
               description: descriptionVal || name,
               amount: netAmount
             });
          }
        }

        resolve({
          accounts: Array.from(accountsMap.values()), 
          transactions
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
};