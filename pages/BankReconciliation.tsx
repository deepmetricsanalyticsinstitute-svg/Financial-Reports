
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useFinancials } from '../context/FinancialContext';
import { AccountType, BankTransaction, Transaction } from '../types';
import { UploadCloud, CheckCircle2, AlertCircle, ArrowLeftRight, Download, RefreshCw, Plus, Trash2, Edit2, X, Save, ArrowDownLeft, Calculator, Wand2 } from 'lucide-react';
import { parseBankCSVFile, generateBankTemplate } from '../utils/csvHelpers';

// Helper to calculate days difference between two YYYY-MM-DD strings
const getDaysDiff = (d1: string, d2: string) => {
  const date1 = new Date(d1).getTime();
  const date2 = new Date(d2).getTime();
  if (isNaN(date1) || isNaN(date2)) return 999;
  return Math.abs(date1 - date2) / (1000 * 3600 * 24);
};

// Helper to check for word overlap in descriptions
const getDescriptionMatchScore = (desc1: string, desc2: string) => {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(w => w.length > 2);
  const words1 = normalize(desc1);
  const words2 = normalize(desc2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  // Count how many words from bank desc appear in ledger desc
  let matchCount = 0;
  words1.forEach(w => {
    if (words2.some(w2 => w2.includes(w) || w.includes(w2))) matchCount++;
  });
  
  return matchCount; // Each matching word adds to score
};

const BankReconciliation: React.FC = () => {
  const { state, addTransaction, deleteTransaction, editTransaction } = useFinancials();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ date: '', description: '', amount: '', currency: 'USD' });
  
  // Set default currency when modal opens
  useEffect(() => {
    if (isModalOpen && !editingId) {
      setFormData(prev => ({ ...prev, currency: state.baseCurrency }));
    }
  }, [isModalOpen, editingId, state.baseCurrency]);

  // Filter for only Asset/Liability accounts (usually Bank/Credit Card)
  const bankAccounts = state.ledger.filter(a => 
    (a.type === AccountType.ASSET && a.category.toLowerCase().includes('asset')) ||
    (a.type === AccountType.LIABILITY && a.name.toLowerCase().includes('card')) ||
    a.name.toLowerCase().includes('bank') ||
    a.name.toLowerCase().includes('cash')
  );

  // Get Ledger Transactions for selected account
  const ledgerTransactions = useMemo(() => {
    if (!selectedAccountId) return [];
    return state.transactions.filter(t => t.accountId === selectedAccountId);
  }, [selectedAccountId, state.transactions]);

  // Selected Account Details
  const selectedAccount = state.ledger.find(a => a.id === selectedAccountId);
  const bookBalance = selectedAccount ? (selectedAccount.debit - selectedAccount.credit) : 0;

  // Auto-Match Logic
  const matchedData = useMemo(() => {
    const matches: { bank: BankTransaction, ledger?: Transaction }[] = [];
    // We create a copy of ledger transactions to "consume" them as we find matches
    const unmatchedLedger = [...ledgerTransactions];

    bankTransactions.forEach(bankItem => {
      // 1. Filter candidates by Amount (Absolute Match required)
      const candidates = unmatchedLedger.filter(l => Math.abs(l.amount - bankItem.amount) < 0.01);
      
      let bestMatch: Transaction | null = null;
      let highestScore = -Infinity;

      candidates.forEach(candidate => {
         let score = 0;
         
         // 2. Score by Date Proximity
         const diffDays = getDaysDiff(candidate.date, bankItem.date);
         
         if (diffDays === 0) score += 20;        // Exact date
         else if (diffDays <= 2) score += 10;    // Within 2 days
         else if (diffDays <= 5) score += 5;     // Within 5 days
         else if (diffDays <= 7) score += 1;     // Within a week
         else score -= 10;                       // Penalize if date is far off

         // 3. Score by Description Similarity
         const textScore = getDescriptionMatchScore(bankItem.description, candidate.description);
         score += (textScore * 5); // Weight text matches reasonably high

         if (score > highestScore) {
            highestScore = score;
            bestMatch = candidate;
         }
      });

      // Threshold: 
      // We accept a match if the score is positive.
      // E.g., Same amount + Date within 5 days (Score 5) -> Match
      // E.g., Same amount + Date far off (-10) + No text match (0) -> Score -10 -> No Match
      if (bestMatch && highestScore > 0) {
         matches.push({ bank: bankItem, ledger: bestMatch });
         
         // Remove this ledger item from the pool so it can't be matched again
         const idx = unmatchedLedger.indexOf(bestMatch);
         if (idx > -1) unmatchedLedger.splice(idx, 1);
      } else {
         matches.push({ bank: bankItem });
      }
    });

    return { matches, unmatchedLedger };
  }, [bankTransactions, ledgerTransactions]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const data = await parseBankCSVFile(file);
      setBankTransactions(data);
    } catch (error) {
      alert("Error parsing bank statement. Please use the template.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const content = generateBankTemplate();
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bank_statement_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const openAddModal = (prefill?: { date: string, description: string, amount: string }) => {
    setEditingId(null);
    setFormData({
      date: prefill?.date || new Date().toISOString().split('T')[0],
      description: prefill?.description || '',
      amount: prefill?.amount || '',
      currency: state.baseCurrency
    });
    setIsModalOpen(true);
  };

  const openEditModal = (tx: Transaction) => {
    setEditingId(tx.id);
    setFormData({
      date: tx.date,
      description: tx.description,
      amount: (tx.originalAmount || tx.amount).toString(),
      currency: tx.originalCurrency || state.baseCurrency
    });
    setIsModalOpen(true);
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) return;

    const amount = parseFloat(formData.amount);
    if (isNaN(amount)) return;

    if (editingId) {
      editTransaction(editingId, {
        date: formData.date,
        description: formData.description,
        amount,
        // Note: Full multi-currency editing logic would require re-fetching rates
        // For now, this assumes basic edits in same context
      });
    } else {
      addTransaction({
        accountId: selectedAccountId,
        date: formData.date,
        description: formData.description,
        amount: amount, // Logic will handle conversion if currency != base
        originalAmount: amount,
        originalCurrency: formData.currency
      });
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this transaction from the ledger?")) {
      deleteTransaction(id);
    }
  };

  const selectedCurrency = state.currencies.find(c => c.code === formData.currency);
  const estimatedBaseAmount = selectedCurrency ? parseFloat(formData.amount || '0') * selectedCurrency.rate : 0;

  const matchedCount = matchedData.matches.filter(m => m.ledger).length;
  const unmatchedBankCount = matchedData.matches.filter(m => !m.ledger).length;
  const unmatchedLedgerCount = matchedData.unmatchedLedger.length;

  return (
    <div className="space-y-6 pb-12 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Bank Reconciliation</h2>
          <p className="text-slate-500">Match your bank statement lines against your ledger.</p>
        </div>
        <div className="flex items-center gap-3">
           <button
             onClick={handleDownloadTemplate}
             className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-2"
           >
             <Download className="w-4 h-4" /> Template
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Account Selection */}
        <div className="md:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
          <label className="block text-sm font-medium text-slate-700 mb-2">Select Account</label>
          <select 
            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
          >
            <option value="">-- Choose Account --</option>
            {bankAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
            ))}
          </select>
          
          {selectedAccount && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="mb-4">
                <p className="text-xs text-slate-400 uppercase font-bold">Book Balance ({state.baseCurrency})</p>
                <p className="text-2xl font-bold text-slate-900">{state.currencySign}{bookBalance.toLocaleString()}</p>
              </div>
              
              <div className="space-y-3">
                 <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Ledger Items</span>
                    <span className="font-medium">{ledgerTransactions.length}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Bank Items</span>
                    <span className="font-medium">{bankTransactions.length}</span>
                 </div>
                 {bankTransactions.length > 0 && (
                   <div className="p-3 bg-slate-50 rounded-lg mt-2">
                      <div className="flex items-center gap-2 text-sm text-slate-700 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Matched: {matchedCount}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                         <AlertCircle className="w-4 h-4 text-rose-500" />
                         <span>Unmatched: {unmatchedBankCount + unmatchedLedgerCount}</span>
                      </div>
                   </div>
                 )}
              </div>
              
              <button
                onClick={() => openAddModal()}
                className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Add Manual Entry
              </button>
            </div>
          )}
        </div>

        {/* Workspace */}
        <div className="md:col-span-2 space-y-6">
          {!selectedAccountId ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-12 text-center text-slate-400">
               <ArrowLeftRight className="w-12 h-12 mx-auto mb-4 opacity-50" />
               <p>Please select an account to begin reconciliation.</p>
            </div>
          ) : (
            <>
              {bankTransactions.length === 0 ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white border-2 border-dashed border-indigo-200 rounded-xl p-12 text-center cursor-pointer hover:bg-indigo-50 transition-colors"
                >
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
                  <UploadCloud className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-900">Upload Bank Statement</h3>
                  <p className="text-slate-500 text-sm mt-1">Upload CSV (Date, Description, Amount)</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                   <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800">Matching Results</h3>
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Wand2 className="w-3 h-3" /> Auto-Match Active
                        </span>
                      </div>
                      <button 
                        onClick={() => setBankTransactions([])}
                        className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Reset
                      </button>
                   </div>
                   
                   <div className="overflow-x-auto">
                     <table className="w-full text-sm text-left">
                       <thead className="bg-white text-slate-500 border-b border-slate-100">
                         <tr>
                           <th className="px-4 py-3 w-32">Date</th>
                           <th className="px-4 py-3">Description</th>
                           <th className="px-4 py-3 text-right">Amount</th>
                           <th className="px-4 py-3 text-center">Status</th>
                           <th className="px-4 py-3 text-slate-400">Action</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                         {/* Matched & Bank Unmatched */}
                         {matchedData.matches.map((item, idx) => (
                           <tr key={item.bank.id} className={item.ledger ? 'bg-white' : 'bg-rose-50/30'}>
                             <td className="px-4 py-3 text-slate-600">{item.bank.date}</td>
                             <td className="px-4 py-3 font-medium text-slate-900">{item.bank.description}</td>
                             <td className="px-4 py-3 text-right font-mono">{state.currencySign}{item.bank.amount.toFixed(2)}</td>
                             <td className="px-4 py-3 text-center">
                               {item.ledger ? (
                                 <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 cursor-help" title={`Matched with: ${item.ledger.description} (${item.ledger.date})`}>
                                   Matched
                                 </div>
                               ) : (
                                 <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                                   Missing
                                 </span>
                               )}
                             </td>
                             <td className="px-4 py-3 text-xs text-slate-500">
                               {item.ledger ? (
                                 <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                       <span className="truncate max-w-[150px] text-slate-700" title={item.ledger.description}>
                                         <span className="font-bold text-xs text-slate-400 mr-1">L:</span>
                                         {item.ledger.description}
                                       </span>
                                       <button onClick={() => openEditModal(item.ledger!)} className="text-slate-400 hover:text-indigo-600"><Edit2 className="w-3 h-3" /></button>
                                       <button onClick={() => handleDelete(item.ledger!.id)} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-3 h-3" /></button>
                                    </div>
                                    <span className="text-slate-400 text-[10px] ml-4">{item.ledger.date}</span>
                                 </div>
                               ) : (
                                 <button 
                                   onClick={() => openAddModal({ date: item.bank.date, description: item.bank.description, amount: item.bank.amount.toString() })}
                                   className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                                 >
                                    <ArrowDownLeft className="w-3 h-3" /> Add to Ledger
                                 </button>
                               )}
                             </td>
                           </tr>
                         ))}
                         
                         {/* Ledger Unmatched */}
                         {matchedData.unmatchedLedger.length > 0 && (
                            <tr className="bg-slate-100/50">
                               <td colSpan={5} className="px-4 py-2 font-bold text-xs text-slate-500 uppercase tracking-wider">
                                  Items in Ledger but not in Bank
                               </td>
                            </tr>
                         )}
                         {matchedData.unmatchedLedger.map((item) => (
                           <tr key={item.id} className="bg-orange-50/30">
                             <td className="px-4 py-3 text-slate-600">{item.date}</td>
                             <td className="px-4 py-3 font-medium text-slate-900">{item.description}</td>
                             <td className="px-4 py-3 text-right font-mono">{state.currencySign}{item.amount.toFixed(2)}</td>
                             <td className="px-4 py-3 text-center">
                               <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                 Outstanding
                               </span>
                             </td>
                             <td className="px-4 py-3 text-xs flex items-center justify-end gap-2">
                               <button onClick={() => openEditModal(item)} className="p-1 hover:bg-orange-100 rounded text-slate-500 hover:text-indigo-600"><Edit2 className="w-3.5 h-3.5" /></button>
                               <button onClick={() => handleDelete(item.id)} className="p-1 hover:bg-orange-100 rounded text-slate-500 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Manual Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900">{editingId ? 'Edit Transaction' : 'Add Transaction'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveTransaction} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input 
                    type="date" 
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                   <select 
                     value={formData.currency}
                     onChange={(e) => setFormData({...formData, currency: e.target.value})}
                     className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                   >
                     {state.currencies.map(c => (
                       <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                     ))}
                   </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Bank Service Charge"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount ({formData.currency})</label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none pl-8"
                  />
                  <span className="absolute left-3 top-2 text-slate-400">
                    {state.currencies.find(c => c.code === formData.currency)?.symbol || '$'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Positive for Deposit/Debit, Negative for Withdrawal/Credit.</p>
              </div>

              {/* Conversion Preview */}
              {formData.currency !== state.baseCurrency && selectedCurrency && (
                <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 flex items-center gap-3">
                   <div className="p-2 bg-indigo-100 rounded-full">
                     <Calculator className="w-4 h-4 text-indigo-600" />
                   </div>
                   <div>
                     <p className="text-xs text-indigo-700 font-semibold uppercase">Auto-Conversion</p>
                     <p className="text-sm text-indigo-900">
                       {state.currencySign}{estimatedBaseAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} 
                       <span className="text-xs opacity-70 ml-1">(@ {selectedCurrency.rate})</span>
                     </p>
                   </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium flex items-center gap-2">
                  <Save className="w-4 h-4" /> Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankReconciliation;
