
import React, { useMemo, useState } from 'react';
import { useFinancials } from '../context/FinancialContext';
import { AccountType, JournalTemplate, JournalLineTemplate, Account, CustomGroup } from '../types';
import AIAnalysis from '../components/AIAnalysis';
import { AlertTriangle, CheckCircle2, RotateCcw, UploadCloud, Info, StickyNote, ChevronUp, ChevronDown, Filter, Download, Loader2, Plus, X, Save, Trash2, LayoutTemplate, Check, Wand2, BookmarkPlus, Copy, Layers, Settings, Edit3, Calculator, Users, FolderEdit, CheckSquare, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PrintHeader from '../components/PrintHeader';
import { exportToPDF } from '../utils/printHelper';

interface JournalLine {
  id: string;
  accountId: string;
  description: string;
  debit: string;
  credit: string;
}

const TrialBalance: React.FC = () => {
  const { 
    state, 
    addTransaction, 
    addJournalTemplate, 
    deleteJournalTemplate, 
    addJournalLineTemplate, 
    deleteJournalLineTemplate,
    addCustomGroup,
    updateCustomGroup,
    deleteCustomGroup,
    updateAccountDetails,
    bulkUpdateAccounts,
    addAccount 
  } = useFinancials();
  
  const navigate = useNavigate();
  
  // View State
  const [filterValue, setFilterValue] = useState('ALL'); // 'ALL', 'CAT:CategoryName', 'GRP:GroupId'
  const [grouping, setGrouping] = useState<'None' | 'Type' | 'Category' | 'Custom'>('None');
  const [isExporting, setIsExporting] = useState(false);
  
  // Selection State
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());

  // Modal States
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);

  // Journal Entry State
  const [journalLines, setJournalLines] = useState<JournalLine[]>([
    { id: '1', accountId: '', description: '', debit: '', credit: '' },
    { id: '2', accountId: '', description: '', debit: '', credit: '' }
  ]);
  const [journalMemo, setJournalMemo] = useState('');
  const [journalDate, setJournalDate] = useState(new Date().toISOString().split('T')[0]);
  const [templateName, setTemplateName] = useState('');
  const [lineTemplateName, setLineTemplateName] = useState('');
  const [savingLineId, setSavingLineId] = useState<string | null>(null);
  
  // Multi-Currency Journal State
  const [journalCurrency, setJournalCurrency] = useState(state.baseCurrency);
  const [journalExchangeRate, setJournalExchangeRate] = useState(1.0);

  // Bulk Edit State
  const [bulkAction, setBulkAction] = useState<'category' | 'group'>('category');
  const [bulkValue, setBulkValue] = useState('');

  // Add Account State
  const [newAccountData, setNewAccountData] = useState<Partial<Account>>({
    type: AccountType.EXPENSE,
    category: 'Operating Expenses'
  });

  // --- Helpers ---

  const formatCurrency = (amount: number, symbol: string = state.currencySign) => {
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  // --- Filtering & Sorting ---

  const availableCategories = useMemo(() => {
    return Array.from(new Set(state.ledger.map(a => a.category))).sort();
  }, [state.ledger]);

  const filteredLedger = useMemo(() => {
    let data = state.ledger;
    
    // Handle Filter Dropdown
    if (filterValue !== 'ALL') {
      if (filterValue.startsWith('CAT:')) {
        const cat = filterValue.split('CAT:')[1];
        data = data.filter(a => a.category === cat);
      } else if (filterValue.startsWith('GRP:')) {
        const grpId = filterValue.split('GRP:')[1];
        if (grpId === 'UNGROUPED') {
          data = data.filter(a => !a.customGroupId);
        } else {
          data = data.filter(a => a.customGroupId === grpId);
        }
      }
    }

    // Default Sort: Code
    return data.sort((a, b) => a.code.localeCompare(b.code));
  }, [state.ledger, filterValue]);

  // Grouping Logic
  const groupedLedger = useMemo<Record<string, Account[]>>(() => {
    if (grouping === 'None') return { 'All Accounts': filteredLedger };
    
    const groups: Record<string, Account[]> = {};
    
    filteredLedger.forEach(acc => {
      let key = '';
      if (grouping === 'Type') key = acc.type;
      else if (grouping === 'Category') key = acc.category;
      else if (grouping === 'Custom') {
        const grp = state.customGroups.find(g => g.id === acc.customGroupId);
        key = grp ? grp.name : 'Ungrouped';
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(acc);
    });

    // Sort keys specific logic
    if (grouping === 'Type') {
        // Enforce accounting order
        const order = [AccountType.ASSET, AccountType.LIABILITY, AccountType.EQUITY, AccountType.REVENUE, AccountType.EXPENSE];
        const sortedGroups: Record<string, Account[]> = {};
        order.forEach(type => {
            if (groups[type]) sortedGroups[type] = groups[type];
        });
        return sortedGroups;
    }

    return Object.keys(groups).sort().reduce((obj, key) => {
        obj[key] = groups[key];
        return obj;
    }, {} as Record<string, Account[]>);
  }, [filteredLedger, grouping, state.customGroups]);

  const totals = useMemo(() => {
    return filteredLedger.reduce((acc, curr) => ({
      debit: acc.debit + curr.debit,
      credit: acc.credit + curr.credit
    }), { debit: 0, credit: 0 });
  }, [filteredLedger]);

  // --- Selection Logic ---

  const toggleSelectAll = () => {
    if (selectedAccountIds.size === filteredLedger.length) {
      setSelectedAccountIds(new Set());
    } else {
      setSelectedAccountIds(new Set(filteredLedger.map(a => a.id)));
    }
  };

  const toggleSelectAccount = (id: string) => {
    const newSet = new Set(selectedAccountIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedAccountIds(newSet);
  };

  const handleBulkUpdate = () => {
    if (bulkAction === 'category') {
       bulkUpdateAccounts(Array.from(selectedAccountIds), { category: bulkValue });
    } else {
       // Custom Group
       const groupId = bulkValue === 'remove' ? undefined : bulkValue;
       bulkUpdateAccounts(Array.from(selectedAccountIds), { customGroupId: groupId });
    }
    setShowBulkEditModal(false);
    setSelectedAccountIds(new Set());
  };


  // --- Journal Entry Logic ---

  const openJournalModal = () => {
    setJournalLines([
      { id: '1', accountId: '', description: '', debit: '', credit: '' },
      { id: '2', accountId: '', description: '', debit: '', credit: '' }
    ]);
    setJournalMemo('');
    setJournalCurrency(state.baseCurrency);
    setJournalExchangeRate(1.0);
    setShowJournalModal(true);
  };

  const updateLine = (id: string, field: keyof JournalLine, value: string) => {
    setJournalLines(lines => lines.map(line => 
      line.id === id ? { ...line, [field]: value } : line
    ));
  };

  const addLine = () => {
    setJournalLines([...journalLines, { 
      id: Date.now().toString(), 
      accountId: '', 
      description: journalMemo, // auto-inherit memo
      debit: '', 
      credit: '' 
    }]);
  };

  const removeLine = (id: string) => {
    if (journalLines.length > 2) {
      setJournalLines(lines => lines.filter(l => l.id !== id));
    }
  };

  const autoBalanceEntry = () => {
    const totalDebits = journalLines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
    const totalCredits = journalLines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
    const diff = totalDebits - totalCredits;

    if (Math.abs(diff) < 0.01) return;

    let newLines = [...journalLines];
    
    // Find empty line
    let targetIndex = newLines.findIndex(l => !l.debit && !l.credit && (!l.accountId || l.accountId)); 
    // Actually, prefer a line that is visually empty. 
    // If no empty line exists, create one.
    const emptyLineIndex = newLines.findIndex(l => (!l.debit || l.debit === '0') && (!l.credit || l.credit === '0'));

    if (emptyLineIndex !== -1) {
        targetIndex = emptyLineIndex;
    } else {
        const newLineId = Date.now().toString();
        newLines.push({
            id: newLineId,
            accountId: '',
            description: journalMemo || 'Balancing Entry',
            debit: '',
            credit: ''
        });
        targetIndex = newLines.length - 1;
    }

    const targetLine = newLines[targetIndex];

    if (diff > 0) {
        // Debits > Credits, need Credit
        targetLine.credit = diff.toFixed(2);
        targetLine.debit = '';
    } else {
        // Credits > Debits, need Debit
        targetLine.debit = Math.abs(diff).toFixed(2);
        targetLine.credit = '';
    }
    
    // Populate description if missing
    if (!targetLine.description) targetLine.description = journalMemo || 'Balancing Entry';

    setJournalLines(newLines);
  };

  // Calculated totals for modal
  const journalTotals = useMemo(() => {
    return journalLines.reduce((acc, line) => ({
      debit: acc.debit + (parseFloat(line.debit) || 0),
      credit: acc.credit + (parseFloat(line.credit) || 0)
    }), { debit: 0, credit: 0 });
  }, [journalLines]);

  const isBalanced = Math.abs(journalTotals.debit - journalTotals.credit) < 0.01;

  const handleSaveJournal = () => {
    if (!isBalanced) {
      alert("Journal Entry must be balanced (Debits = Credits). Use the Auto-Balance button.");
      return;
    }
    if (journalLines.some(l => !l.accountId)) {
        alert("All lines must have an account selected.");
        return;
    }

    journalLines.forEach(line => {
      const debitVal = parseFloat(line.debit) || 0;
      const creditVal = parseFloat(line.credit) || 0;
      
      if (debitVal > 0 || creditVal > 0) {
        const amount = debitVal > 0 ? debitVal : -creditVal; // Positive for Debit, Negative for Credit
        
        addTransaction({
            accountId: line.accountId,
            date: journalDate,
            description: line.description || journalMemo,
            amount: amount, // Logic in context handles conversion if needed
            originalCurrency: journalCurrency,
            originalAmount: amount,
            exchangeRate: journalExchangeRate
        });
      }
    });

    setShowJournalModal(false);
  };

  // --- Template Handlers ---

  const saveTemplate = () => {
    if (!templateName) return;
    addJournalTemplate({
      id: Date.now().toString(),
      name: templateName,
      memo: journalMemo,
      lines: journalLines.map(l => ({
        accountId: l.accountId,
        description: l.description,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0
      }))
    });
    setTemplateName('');
    alert("Template saved!");
  };

  const loadTemplate = (t: JournalTemplate) => {
    setJournalMemo(t.memo);
    setJournalLines(t.lines.map((l, idx) => ({
      id: idx.toString(),
      accountId: l.accountId,
      description: l.description,
      debit: l.debit > 0 ? l.debit.toString() : '',
      credit: l.credit > 0 ? l.credit.toString() : ''
    })));
  };

  const saveLineTemplate = () => {
    if (!savingLineId || !lineTemplateName) return;
    const line = journalLines.find(l => l.id === savingLineId);
    if (!line) return;

    addJournalLineTemplate({
      id: Date.now().toString(),
      name: lineTemplateName,
      accountId: line.accountId,
      description: line.description,
      debit: parseFloat(line.debit) || 0,
      credit: parseFloat(line.credit) || 0
    });
    setSavingLineId(null);
    setLineTemplateName('');
  };

  const insertLineTemplate = (tmpl: JournalLineTemplate) => {
    setJournalLines(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        accountId: tmpl.accountId,
        description: tmpl.description,
        debit: tmpl.debit > 0 ? tmpl.debit.toString() : '',
        credit: tmpl.credit > 0 ? tmpl.credit.toString() : ''
      }
    ]);
  };

  // --- Add Account Logic ---
  const handleCreateAccount = () => {
      if (!newAccountData.code || !newAccountData.name) {
          alert("Code and Name are required.");
          return;
      }
      addAccount({
          id: `acc-${Date.now()}`,
          code: newAccountData.code!,
          name: newAccountData.name!,
          type: newAccountData.type || AccountType.EXPENSE,
          category: newAccountData.category || 'Operating Expenses',
          debit: 0,
          credit: 0
      });
      setShowAddAccountModal(false);
      setNewAccountData({ type: AccountType.EXPENSE, category: 'Operating Expenses' }); // Reset
  };


  // --- Render Helpers ---

  const renderAccountRow = (account: Account) => (
    <tr key={account.id} className={`hover:bg-slate-50 group page-break-inside-avoid ${selectedAccountIds.has(account.id) ? 'bg-indigo-50/50' : ''}`}>
      <td className="px-6 py-4 print:py-2">
         <div className="flex items-center gap-3">
             <input 
               type="checkbox" 
               checked={selectedAccountIds.has(account.id)}
               onChange={() => toggleSelectAccount(account.id)}
               className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 print:hidden"
             />
             <span className="font-mono text-slate-500 text-sm bg-slate-100 px-2 py-1 rounded print:bg-transparent print:p-0 print:text-black">
                 {account.code}
             </span>
         </div>
      </td>
      <td className="px-6 py-4 print:py-2">
        <div className="flex items-center gap-2">
           <span className="font-medium text-slate-900">{account.name}</span>
           {account.note && (
             <Info className="w-3.5 h-3.5 text-blue-400 print:hidden" title={account.note} />
           )}
        </div>
      </td>
      <td className="px-6 py-4 print:py-2">
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium 
          print:border-0 print:bg-transparent print:p-0 print:font-normal print:text-black
          ${account.type === AccountType.ASSET ? 'bg-emerald-100 text-emerald-800' : 
            account.type === AccountType.LIABILITY ? 'bg-amber-100 text-amber-800' :
            account.type === AccountType.EQUITY ? 'bg-purple-100 text-purple-800' :
            account.type === AccountType.REVENUE ? 'bg-blue-100 text-blue-800' :
            'bg-rose-100 text-rose-800'}`}>
          {account.type}
        </span>
      </td>
      <td className="px-6 py-4 print:py-2 text-slate-500">{account.category}</td>
      <td className="px-6 py-4 print:py-2 text-right font-medium text-slate-700">
        {account.debit > 0 ? formatCurrency(account.debit) : '-'}
      </td>
      <td className="px-6 py-4 print:py-2 text-right font-medium text-slate-700">
        {account.credit > 0 ? formatCurrency(account.credit) : '-'}
      </td>
    </tr>
  );

  const renderGroup = (groupName: string, accounts: Account[]) => {
    const groupTotal = accounts.reduce((acc, curr) => ({
        debit: acc.debit + curr.debit,
        credit: acc.credit + curr.credit
    }), { debit: 0, credit: 0 });

    return (
        <React.Fragment key={groupName}>
            <tbody className="print:table-row-group break-after-avoid page-break-inside-avoid">
                <tr className="bg-slate-50 border-y border-slate-200 print:bg-slate-200 print:text-black print:font-bold break-after-avoid">
                    <td colSpan={6} className="px-6 py-2 font-bold text-slate-700 text-xs uppercase tracking-wider">
                        {groupName}
                    </td>
                </tr>
            </tbody>
            <tbody className="print:table-row-group">
                {accounts.map(renderAccountRow)}
            </tbody>
            <tbody className="print:table-row-group page-break-inside-avoid">
                <tr className="bg-slate-50/50 font-bold border-t border-slate-300 print:border-t-2 print:border-slate-800">
                    <td colSpan={4} className="px-6 py-2 text-right text-xs uppercase text-slate-500">
                        {groupName} Subtotal
                    </td>
                    <td className="px-6 py-2 text-right text-slate-800">
                        {formatCurrency(groupTotal.debit)}
                    </td>
                    <td className="px-6 py-2 text-right text-slate-800">
                        {formatCurrency(groupTotal.credit)}
                    </td>
                </tr>
            </tbody>
        </React.Fragment>
    );
  };


  // --- Export ---
  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
        exportToPDF('trial-balance-report', `Trial_Balance_${state.companyName}_${state.period}`);
        setIsExporting(false);
    }, 100);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 relative">
      
      {/* Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 no-print">
         <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Trial Balance</h2>
            <p className="text-slate-500 mt-1">Review your general ledger account balances.</p>
         </div>
         <div className="flex gap-2">
            <button 
              onClick={() => setShowGroupModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
            >
              <Layers className="w-4 h-4" /> Groups
            </button>
            <button 
              onClick={openJournalModal}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 shadow-sm"
            >
              <Plus className="w-4 h-4" /> New Journal Entry
            </button>
            <button 
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 
              {isExporting ? 'Generating...' : 'Export PDF'}
            </button>
         </div>
      </div>

      {/* Filters & Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center no-print">
          <div className="flex items-center gap-4 w-full sm:w-auto">
             <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                <Filter className="w-4 h-4 text-slate-500" />
                <select 
                  className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                >
                  <option value="ALL">All Accounts</option>
                  <optgroup label="By Category">
                    {availableCategories.map(cat => (
                      <option key={cat} value={`CAT:${cat}`}>{cat}</option>
                    ))}
                  </optgroup>
                  <optgroup label="By Custom Group">
                     {state.customGroups.map(g => (
                       <option key={g.id} value={`GRP:${g.id}`}>{g.name}</option>
                     ))}
                     <option value="GRP:UNGROUPED">Ungrouped Accounts</option>
                  </optgroup>
                </select>
             </div>

             <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                <LayoutTemplate className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-500">Group By:</span>
                <select 
                  className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer"
                  value={grouping}
                  onChange={(e) => setGrouping(e.target.value as any)}
                >
                  <option value="None">None</option>
                  <option value="Type">Account Type</option>
                  <option value="Category">Category</option>
                  <option value="Custom">Custom Group</option>
                </select>
             </div>
          </div>
          
          <div className="text-sm text-slate-500">
            Showing <span className="font-bold text-slate-900">{filteredLedger.length}</span> accounts
          </div>
      </div>

      {/* Main Report Table */}
      <div id="trial-balance-report" className="space-y-6">
          <PrintHeader companyName={state.companyName} reportName="Trial Balance" period={state.period} />

          {/* PDF Meta Header */}
          <div className="hidden print:grid grid-cols-3 gap-4 mb-6 text-sm border-b border-slate-300 pb-4">
              <div>
                  <span className="text-slate-500 block">Context</span>
                  <span className="font-bold">{state.companyName}</span>
                  <span className="block text-xs">{state.currencySign} {state.baseCurrency}</span>
              </div>
              <div className="text-center">
                  <span className="text-slate-500 block">Report</span>
                  <span className="font-bold uppercase">Trial Balance</span>
              </div>
              <div className="text-right">
                  <span className="text-slate-500 block">Parameters</span>
                  <span className="block">Filter: {filterValue}</span>
                  <span className="block">Grouping: {grouping}</span>
              </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 print:bg-white print:border-b-2 print:border-slate-800 print:text-black print:table-header-group">
                  <tr>
                    <th className="px-6 py-3 font-semibold print:py-2">
                       <div className="flex items-center gap-3">
                         <input 
                           type="checkbox" 
                           className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 print:hidden"
                           checked={filteredLedger.length > 0 && selectedAccountIds.size === filteredLedger.length}
                           onChange={toggleSelectAll}
                         />
                         Code
                       </div>
                    </th>
                    <th className="px-6 py-3 font-semibold print:py-2">Account Name</th>
                    <th className="px-6 py-3 font-semibold print:py-2">Type</th>
                    <th className="px-6 py-3 font-semibold print:py-2">Category</th>
                    <th className="px-6 py-3 font-semibold text-right print:py-2">Debit</th>
                    <th className="px-6 py-3 font-semibold text-right print:py-2">Credit</th>
                  </tr>
                </thead>
                
                {grouping === 'None' ? (
                    <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                        {filteredLedger.map(renderAccountRow)}
                    </tbody>
                ) : (
                    Object.entries(groupedLedger).map(([groupName, accounts]) => renderGroup(groupName, accounts as Account[]))
                )}

                <tfoot className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-300 print:bg-white print:border-t-2 print:border-slate-800 print:table-footer-group">
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-right uppercase tracking-wider print:py-2">Total</td>
                    <td className="px-6 py-4 text-right text-indigo-600 print:text-black print:py-2">{formatCurrency(totals.debit)}</td>
                    <td className="px-6 py-4 text-right text-indigo-600 print:text-black print:py-2">{formatCurrency(totals.credit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            {!isBalanced && (
              <div className="bg-rose-50 p-4 border-t border-rose-100 flex items-center justify-center gap-2 text-rose-700 print:hidden">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Trial Balance is out of balance by {formatCurrency(Math.abs(totals.debit - totals.credit))}</span>
              </div>
            )}
          </div>
      </div>
      
      {/* Footer / AI Analysis */}
      <div className="no-print pt-6">
        <AIAnalysis reportType="Trial Balance" customLedger={filteredLedger} />
      </div>
      
      {/* Floating Bulk Action Bar */}
      {selectedAccountIds.size > 0 && (
         <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-6 z-40 animate-in slide-in-from-bottom-4">
             <span className="font-bold text-sm">{selectedAccountIds.size} selected</span>
             <div className="h-6 w-px bg-slate-700"></div>
             <button 
               onClick={() => { setBulkAction('category'); setShowBulkEditModal(true); }}
               className="flex items-center gap-2 text-sm font-medium hover:text-indigo-400 transition-colors"
             >
                <Edit3 className="w-4 h-4" /> Edit Category
             </button>
             <button 
               onClick={() => { setBulkAction('group'); setShowBulkEditModal(true); }}
               className="flex items-center gap-2 text-sm font-medium hover:text-indigo-400 transition-colors"
             >
                <FolderEdit className="w-4 h-4" /> Assign Group
             </button>
             <button 
               onClick={() => setSelectedAccountIds(new Set())}
               className="ml-2 p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"
             >
                <X className="w-4 h-4" />
             </button>
         </div>
      )}

      {/* Journal Entry Modal */}
      {showJournalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-bold text-slate-900 text-lg">New Journal Entry</h3>
              <div className="flex items-center gap-3">
                 <select 
                    value={journalCurrency}
                    onChange={(e) => setJournalCurrency(e.target.value)}
                    className="text-sm border border-slate-300 rounded px-2 py-1 bg-white font-medium"
                 >
                    {state.currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                 </select>
                 {journalCurrency !== state.baseCurrency && (
                     <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-2 py-1 text-sm">
                        <span className="text-slate-500">Rate:</span>
                        <input 
                          type="number" 
                          step="0.0001"
                          value={journalExchangeRate}
                          onChange={(e) => setJournalExchangeRate(parseFloat(e.target.value))}
                          className="w-16 text-right font-medium outline-none"
                        />
                     </div>
                 )}
                 <button onClick={() => setShowJournalModal(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                 </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
               {/* Controls Header */}
               <div className="flex justify-between mb-6">
                 <div className="flex gap-4 w-2/3">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                        <input 
                            type="date" 
                            value={journalDate}
                            onChange={(e) => setJournalDate(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="flex-[2]">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Memo / Description</label>
                        <input 
                            placeholder="e.g. Monthly Accruals"
                            value={journalMemo}
                            onChange={(e) => setJournalMemo(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                 </div>

                 {/* Template Controls */}
                 <div className="flex items-end gap-2">
                    {state.journalTemplates.length > 0 && (
                        <select 
                          onChange={(e) => {
                             const t = state.journalTemplates.find(jt => jt.id === e.target.value);
                             if (t) loadTemplate(t);
                          }}
                          className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-32"
                          value=""
                        >
                            <option value="" disabled>Load Template</option>
                            {state.journalTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    )}
                    <button 
                       onClick={() => {
                          const name = prompt("Template Name:");
                          if(name) { setTemplateName(name); setTimeout(saveTemplate, 100); }
                       }}
                       className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600"
                       title="Save as Template"
                    >
                       <Save className="w-4 h-4" />
                    </button>
                 </div>
               </div>

               {/* Journal Lines */}
               <div className="space-y-3 mb-6">
                  {journalLines.map((line, index) => (
                    <div key={line.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg group border border-transparent hover:border-slate-200 transition-all">
                       <div className="flex-1">
                          {index === 0 && <label className="block text-xs font-semibold text-slate-500 mb-1">Account</label>}
                          <div className="flex gap-2">
                            <select 
                                value={line.accountId}
                                onChange={(e) => updateLine(line.id, 'accountId', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Select Account...</option>
                                {state.ledger.sort((a,b) => a.code.localeCompare(b.code)).map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                                ))}
                            </select>
                            <button 
                                onClick={() => setShowAddAccountModal(true)} 
                                className="px-2 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-600"
                                title="Add New Account"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                          </div>
                       </div>
                       
                       <div className="flex-[1.5]">
                          {index === 0 && <label className="block text-xs font-semibold text-slate-500 mb-1">Line Description</label>}
                          <input 
                             value={line.description}
                             onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                             placeholder={journalMemo || "Description"}
                             className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                          />
                       </div>

                       <div className="w-32">
                          {index === 0 && <label className="block text-xs font-semibold text-slate-500 mb-1">Debit ({journalCurrency})</label>}
                          <input 
                             type="number"
                             value={line.debit}
                             onChange={(e) => updateLine(line.id, 'debit', e.target.value)}
                             placeholder="0.00"
                             className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-indigo-500"
                             disabled={!!line.credit}
                          />
                       </div>

                       <div className="w-32">
                          {index === 0 && <label className="block text-xs font-semibold text-slate-500 mb-1">Credit ({journalCurrency})</label>}
                          <input 
                             type="number"
                             value={line.credit}
                             onChange={(e) => updateLine(line.id, 'credit', e.target.value)}
                             placeholder="0.00"
                             className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-indigo-500"
                             disabled={!!line.debit}
                          />
                       </div>

                       <div className={`flex items-end gap-1 ${index === 0 ? 'pt-6' : 'pt-1'}`}>
                          {/* Saved Line Features */}
                          <div className="relative group/menu">
                             <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded">
                                <BookmarkPlus className="w-4 h-4" />
                             </button>
                             {/* Simplified popup menu for saving lines or loading */}
                             <div className="absolute right-0 top-full mt-1 w-48 bg-white shadow-xl border border-slate-200 rounded-lg p-2 z-10 hidden group-hover/menu:block">
                                 <p className="text-xs font-bold text-slate-500 px-2 py-1">LINE TEMPLATES</p>
                                 <button 
                                   onClick={() => {
                                      const n = prompt("Name for this line template?");
                                      if(n) { setLineTemplateName(n); setSavingLineId(line.id); setTimeout(saveLineTemplate, 100); }
                                   }}
                                   className="w-full text-left px-2 py-1 text-xs hover:bg-slate-100 rounded text-slate-700"
                                 >
                                    Save Current Line
                                 </button>
                                 {state.journalLineTemplates.length > 0 && (
                                     <>
                                        <div className="h-px bg-slate-100 my-1"></div>
                                        {state.journalLineTemplates.map(lt => (
                                            <button 
                                              key={lt.id}
                                              onClick={() => insertLineTemplate(lt)}
                                              className="w-full text-left px-2 py-1 text-xs hover:bg-slate-100 rounded text-slate-700 truncate"
                                            >
                                               Add: {lt.name}
                                            </button>
                                        ))}
                                     </>
                                 )}
                             </div>
                          </div>

                          <button onClick={() => removeLine(line.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded">
                             <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                    </div>
                  ))}
               </div>
               
               <button onClick={addLine} className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700">
                  <PlusCircle className="w-4 h-4" /> Add Line
               </button>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200 shrink-0">
               <div className="flex justify-between items-center">
                  <div className="flex gap-8">
                     <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Total Debits</p>
                        <p className="text-xl font-bold text-indigo-700">
                           {formatCurrency(journalTotals.debit, state.currencies.find(c=>c.code===journalCurrency)?.symbol)}
                        </p>
                     </div>
                     <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Total Credits</p>
                        <p className="text-xl font-bold text-indigo-700">
                           {formatCurrency(journalTotals.credit, state.currencies.find(c=>c.code===journalCurrency)?.symbol)}
                        </p>
                     </div>
                     {!isBalanced && (
                         <div className="bg-rose-100 px-3 py-1 rounded-lg border border-rose-200">
                            <p className="text-xs font-bold text-rose-600 uppercase">Difference</p>
                            <p className="text-lg font-bold text-rose-700">
                                {formatCurrency(Math.abs(journalTotals.debit - journalTotals.credit), state.currencies.find(c=>c.code===journalCurrency)?.symbol)}
                            </p>
                         </div>
                     )}
                     
                     {journalCurrency !== state.baseCurrency && (
                         <div className="pl-6 border-l border-slate-300">
                             <p className="text-xs font-bold text-emerald-600 uppercase">Base Equivalent ({state.baseCurrency})</p>
                             <p className="text-lg font-bold text-emerald-700">
                                {formatCurrency(journalTotals.debit * journalExchangeRate)}
                             </p>
                         </div>
                     )}
                  </div>

                  <div className="flex gap-3">
                     {!isBalanced && (
                        <button 
                          onClick={autoBalanceEntry}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 font-medium rounded-lg hover:bg-indigo-200 transition-colors"
                          title="Auto-Balance Entry"
                        >
                           <Wand2 className="w-4 h-4" /> Auto-Balance
                        </button>
                     )}
                     <button onClick={() => setShowJournalModal(false)} className="px-5 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium">
                        Cancel
                     </button>
                     <button 
                       onClick={handleSaveJournal}
                       disabled={!isBalanced}
                       className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
                     >
                        <Check className="w-4 h-4" /> Post Entry
                     </button>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Group Management Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-900 text-lg">Manage Custom Groups</h3>
                  <button onClick={() => setShowGroupModal(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                  </button>
              </div>
              <div className="space-y-4 mb-6">
                 {state.customGroups.map(group => (
                    <div key={group.id} className="flex items-center gap-2">
                       <input 
                         defaultValue={group.name}
                         onBlur={(e) => updateCustomGroup(group.id, e.target.value)}
                         className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                       />
                       <button onClick={() => deleteCustomGroup(group.id)} className="p-2 text-slate-400 hover:text-rose-600">
                          <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                 ))}
                 {state.customGroups.length === 0 && <p className="text-sm text-slate-500 italic">No custom groups yet.</p>}
              </div>
              <button 
                 onClick={() => {
                    const name = prompt("New Group Name:");
                    if (name) addCustomGroup(name);
                 }}
                 className="w-full py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg border border-indigo-200 hover:bg-indigo-100 flex items-center justify-center gap-2"
              >
                  <Plus className="w-4 h-4" /> Create New Group
              </button>
           </div>
        </div>
      )}

      {/* Bulk Edit Modal */}
      {showBulkEditModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
             <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                 <h3 className="font-bold text-slate-900 text-lg mb-4">
                    {bulkAction === 'category' ? 'Update Category' : 'Assign Custom Group'}
                 </h3>
                 <p className="text-sm text-slate-500 mb-4">
                    Applying changes to <span className="font-bold text-slate-900">{selectedAccountIds.size}</span> selected accounts.
                 </p>
                 
                 <div className="mb-6">
                    {bulkAction === 'category' ? (
                        <select 
                           className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                           onChange={(e) => setBulkValue(e.target.value)}
                        >
                            <option value="">Select Category...</option>
                            {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    ) : (
                        <select
                           className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                           onChange={(e) => setBulkValue(e.target.value)}
                        >
                            <option value="">Select Group...</option>
                            {state.customGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            <option value="remove">-- Remove from Group --</option>
                        </select>
                    )}
                 </div>
                 
                 <div className="flex gap-3">
                     <button onClick={() => setShowBulkEditModal(false)} className="flex-1 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg">
                        Cancel
                     </button>
                     <button onClick={handleBulkUpdate} className="flex-1 py-2 bg-slate-900 text-white font-medium rounded-lg">
                        Apply Update
                     </button>
                 </div>
             </div>
         </div>
      )}

      {/* Add Account Modal */}
      {showAddAccountModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-slate-900 text-lg">Create New Account</h3>
                      <button onClick={() => setShowAddAccountModal(false)} className="text-slate-400 hover:text-slate-600">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Account Code</label>
                          <input 
                              value={newAccountData.code || ''}
                              onChange={(e) => setNewAccountData({...newAccountData, code: e.target.value})}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                              placeholder="e.g. 6000"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Account Name</label>
                          <input 
                              value={newAccountData.name || ''}
                              onChange={(e) => setNewAccountData({...newAccountData, name: e.target.value})}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                              placeholder="e.g. Travel Expenses"
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                              <select 
                                  value={newAccountData.type}
                                  onChange={(e) => setNewAccountData({...newAccountData, type: e.target.value as AccountType})}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                              >
                                  {Object.values(AccountType).map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                              <input 
                                  value={newAccountData.category || ''}
                                  onChange={(e) => setNewAccountData({...newAccountData, category: e.target.value})}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                  list="category-suggestions"
                              />
                              <datalist id="category-suggestions">
                                  {availableCategories.map(c => <option key={c} value={c} />)}
                              </datalist>
                          </div>
                      </div>
                      <button 
                          onClick={handleCreateAccount}
                          className="w-full py-2 mt-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
                      >
                          Create Account
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default TrialBalance;
