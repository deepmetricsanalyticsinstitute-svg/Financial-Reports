

import React, { useMemo, useState } from 'react';
import { useFinancials } from '../context/FinancialContext';
import { AccountType, JournalTemplate, JournalLineTemplate, Account, CustomGroup } from '../types';
import AIAnalysis from '../components/AIAnalysis';
import { AlertTriangle, CheckCircle2, RotateCcw, UploadCloud, Info, StickyNote, ChevronUp, ChevronDown, Filter, Download, Loader2, Plus, X, Save, Trash2, LayoutTemplate, Check, Wand2, BookmarkPlus, Copy, Layers, Settings, Edit3 } from 'lucide-react';
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
  const { state, updateAccountBalance, resetData, updateAccountNote, addTransaction, addJournalTemplate, deleteJournalTemplate, addJournalLineTemplate, deleteJournalLineTemplate, addCustomGroup, updateCustomGroup, deleteCustomGroup, updateAccountDetails } = useFinancials();
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [grouping, setGrouping] = useState<'None' | 'Type' | 'Category' | 'Custom'>('None');
  const [isExporting, setIsExporting] = useState(false);
  const navigate = useNavigate();

  // Journal Entry Modal State
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [journalDate, setJournalDate] = useState(new Date().toISOString().split('T')[0]);
  const [journalMemo, setJournalMemo] = useState('');
  const [journalLines, setJournalLines] = useState<JournalLine[]>([]);
  
  // Template State (Full Entry)
  const [templateName, setTemplateName] = useState('');
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Template State (Line Item)
  const [savingLineId, setSavingLineId] = useState<string | null>(null);
  const [lineTemplateName, setLineTemplateName] = useState('');
  const [showLineTemplateMenu, setShowLineTemplateMenu] = useState(false);

  // Custom Group Management
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');

  // Account Edit Modal
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const handleInputChange = (id: string, field: 'debit' | 'credit', value: string) => {
    const numValue = parseFloat(value) || 0;
    const account = state.ledger.find(a => a.id === id);
    if (account) {
      updateAccountBalance(
        id, 
        field === 'debit' ? numValue : account.debit,
        field === 'credit' ? numValue : account.credit
      );
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(state.ledger.map(a => a.category).filter(c => c && c.trim() !== ''));
    return ['All', ...Array.from(cats).sort()];
  }, [state.ledger]);

  const filteredLedger = useMemo(() => {
    let data = state.ledger;
    if (categoryFilter !== 'All') {
      data = data.filter(a => a.category === categoryFilter);
    }
    return data.sort((a,b) => a.code.localeCompare(b.code));
  }, [state.ledger, categoryFilter]);

  const groupedLedger = useMemo(() => {
    if (grouping === 'None') return null;

    const groups: Record<string, Account[]> = {};
    
    // Grouping Logic
    filteredLedger.forEach(acc => {
        let key = 'Uncategorized';
        
        if (grouping === 'Type') {
            key = acc.type;
        } else if (grouping === 'Category') {
            key = acc.category || 'Uncategorized';
        } else if (grouping === 'Custom') {
            // Find the group name by ID
            const group = state.customGroups.find(g => g.id === acc.customGroupId);
            key = group ? group.name : 'Ungrouped';
        }

        if (!groups[key]) groups[key] = [];
        groups[key].push(acc);
    });

    // Sort Keys Logic
    let sortedKeys = Object.keys(groups);

    if (grouping === 'Type') {
        const typeOrder: Record<string, number> = {
            [AccountType.ASSET]: 1,
            [AccountType.LIABILITY]: 2,
            [AccountType.EQUITY]: 3,
            [AccountType.REVENUE]: 4,
            [AccountType.EXPENSE]: 5
        };
        sortedKeys.sort((a, b) => (typeOrder[a] || 99) - (typeOrder[b] || 99));
    } else if (grouping === 'Custom') {
        // Sort Custom Groups alphabetical, but put Ungrouped last
        sortedKeys.sort((a, b) => {
            if (a === 'Ungrouped') return 1;
            if (b === 'Ungrouped') return -1;
            return a.localeCompare(b);
        });
    } else {
        sortedKeys.sort();
    }

    return sortedKeys.map(key => ({
        key,
        accounts: groups[key].sort((a, b) => a.code.localeCompare(b.code)),
        totals: groups[key].reduce((acc, curr) => ({
            debit: acc.debit + curr.debit,
            credit: acc.credit + curr.credit
        }), { debit: 0, credit: 0 })
    }));
  }, [filteredLedger, grouping, state.customGroups]);

  const displayedTotals = useMemo(() => {
    return filteredLedger.reduce((acc, curr) => ({
      debit: acc.debit + curr.debit,
      credit: acc.credit + curr.credit
    }), { debit: 0, credit: 0 });
  }, [filteredLedger]);

  const globalTotals = useMemo(() => {
    return state.ledger.reduce((acc, curr) => ({
      debit: acc.debit + curr.debit,
      credit: acc.credit + curr.credit
    }), { debit: 0, credit: 0 });
  }, [state.ledger]);

  const isBalanced = Math.abs(globalTotals.debit - globalTotals.credit) < 0.01;

  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
        exportToPDF('tb-report', `Trial_Balance_${state.companyName}_${state.period}`);
        setIsExporting(false);
    }, 100);
  };

  const openJournalModal = () => {
    setJournalDate(new Date().toISOString().split('T')[0]);
    setJournalMemo('');
    setTemplateName('');
    setShowTemplateMenu(false);
    setIsSavingTemplate(false);
    setSavingLineId(null);
    setLineTemplateName('');
    setShowLineTemplateMenu(false);
    // Initialize with two blank lines for convenience (1 Dr, 1 Cr)
    setJournalLines([
      { id: '1', accountId: '', description: '', debit: '', credit: '' },
      { id: '2', accountId: '', description: '', debit: '', credit: '' }
    ]);
    setIsJournalModalOpen(true);
  };

  const addJournalLine = () => {
    setJournalLines([
      ...journalLines, 
      { id: Date.now().toString(), accountId: '', description: '', debit: '', credit: '' }
    ]);
  };

  const addLineFromTemplate = (template: JournalLineTemplate) => {
    setJournalLines([
      ...journalLines,
      {
        id: Date.now().toString(),
        accountId: template.accountId,
        description: template.description,
        debit: template.debit > 0 ? template.debit.toString() : '',
        credit: template.credit > 0 ? template.credit.toString() : ''
      }
    ]);
    setShowLineTemplateMenu(false);
  };

  const removeJournalLine = (id: string) => {
    if (journalLines.length <= 1) return;
    setJournalLines(journalLines.filter(line => line.id !== id));
  };

  const updateJournalLine = (id: string, field: keyof JournalLine, value: string) => {
    setJournalLines(journalLines.map(line => {
      if (line.id === id) {
        // Exclusive logic: if typing in Debit, clear Credit, and vice versa
        if (field === 'debit' && value !== '') return { ...line, [field]: value, credit: '' };
        if (field === 'credit' && value !== '') return { ...line, [field]: value, debit: '' };
        return { ...line, [field]: value };
      }
      return line;
    }));
  };

  // Calculate modal totals
  const journalTotals = useMemo(() => {
    return journalLines.reduce((acc, line) => ({
      debit: acc.debit + (parseFloat(line.debit) || 0),
      credit: acc.credit + (parseFloat(line.credit) || 0)
    }), { debit: 0, credit: 0 });
  }, [journalLines]);

  const isJournalBalanced = Math.abs(journalTotals.debit - journalTotals.credit) < 0.01;
  const journalDifference = Math.abs(journalTotals.debit - journalTotals.credit);

  const autoBalanceEntry = () => {
    const diff = journalTotals.debit - journalTotals.credit;
    if (Math.abs(diff) < 0.01) return;

    const neededAmount = Math.abs(diff).toFixed(2);
    const isCreditNeeded = diff > 0; // If Debits > Credits, we need Credit

    // Helper to check if a line is effectively empty amount-wise
    const isEmptyAmount = (val: string) => !val || parseFloat(val) === 0;

    // Find first line that has no amounts
    const emptyLineIndex = journalLines.findIndex(l => isEmptyAmount(l.debit) && isEmptyAmount(l.credit));

    if (emptyLineIndex !== -1) {
        // Fill the empty line
        const newLines = [...journalLines];
        newLines[emptyLineIndex] = {
            ...newLines[emptyLineIndex],
            debit: isCreditNeeded ? '' : neededAmount,
            credit: isCreditNeeded ? neededAmount : ''
        };
        setJournalLines(newLines);
    } else {
        // Create a new line
        const newLine = { 
            id: Date.now().toString(), 
            accountId: '', 
            description: '', 
            debit: isCreditNeeded ? '' : neededAmount, 
            credit: isCreditNeeded ? neededAmount : '' 
        };
        setJournalLines([...journalLines, newLine]);
    }
  };

  const handleSaveJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isJournalBalanced) return;

    // Filter out empty lines
    const validLines = journalLines.filter(l => l.accountId && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0));

    if (validLines.length === 0) return;

    validLines.forEach(line => {
      const dr = parseFloat(line.debit) || 0;
      const cr = parseFloat(line.credit) || 0;
      
      // Determine net signed amount: Positive for Debit, Negative for Credit
      const netAmount = dr - cr;

      if (netAmount !== 0) {
        addTransaction({
          accountId: line.accountId,
          date: journalDate,
          description: line.description || journalMemo || 'Journal Entry',
          amount: netAmount
        });
      }
    });

    setIsJournalModalOpen(false);
  };

  // Template Handlers
  const handleSaveTemplate = () => {
    if (!templateName.trim()) return;
    
    const linesToSave = journalLines.map(l => ({
        accountId: l.accountId,
        description: l.description,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0
    }));

    addJournalTemplate({
        id: Date.now().toString(),
        name: templateName,
        memo: journalMemo,
        lines: linesToSave
    });
    setTemplateName('');
    setIsSavingTemplate(false);
  };

  const handleLoadTemplate = (template: JournalTemplate) => {
    setJournalMemo(template.memo);
    const newLines = template.lines.map(l => ({
        id: Math.random().toString(36).substr(2, 9),
        accountId: l.accountId,
        description: l.description,
        debit: l.debit > 0 ? l.debit.toString() : '',
        credit: l.credit > 0 ? l.credit.toString() : ''
    }));
    setJournalLines(newLines);
    setShowTemplateMenu(false);
  };

  const handleSaveLineTemplate = (line: JournalLine) => {
    if (!lineTemplateName.trim()) return;
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

  // Custom Group Handlers
  const handleAddGroup = () => {
    if (newGroupName.trim()) {
      addCustomGroup(newGroupName.trim());
      setNewGroupName('');
    }
  };

  const handleUpdateGroup = (id: string) => {
    if (editingGroupName.trim()) {
      updateCustomGroup(id, editingGroupName.trim());
      setEditingGroupId(null);
      setEditingGroupName('');
    }
  };

  const handleEditAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAccount) {
      updateAccountDetails(editingAccount.id, {
        name: editingAccount.name,
        category: editingAccount.category,
        customGroupId: editingAccount.customGroupId
      });
      setEditingAccount(null);
    }
  };

  // Render Row Helper
  const renderAccountRow = (account: Account) => (
    <React.Fragment key={account.id}>
      <tr className="hover:bg-slate-50/50 transition-colors page-break-inside-avoid print:hover:bg-transparent">
        <td className="px-6 py-3 font-mono text-slate-500 print:text-slate-800">{account.code}</td>
        <td className="px-6 py-3 font-medium text-slate-900 flex items-center gap-2 group">
          {account.name}
          <button 
             onClick={() => setEditingAccount(account)}
             className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 transition-opacity print:hidden"
             title="Edit Account Details"
          >
             <Edit3 className="w-3 h-3" />
          </button>
        </td>
        <td className="px-6 py-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
            print:border-0 print:bg-transparent print:p-0 print:font-normal print:text-slate-600
            ${account.type === AccountType.ASSET ? 'bg-indigo-100 text-indigo-800' :
              account.type === AccountType.LIABILITY ? 'bg-orange-100 text-orange-800' :
              account.type === AccountType.EQUITY ? 'bg-purple-100 text-purple-800' :
              account.type === AccountType.REVENUE ? 'bg-emerald-100 text-emerald-800' :
              'bg-rose-100 text-rose-800'
            }`}>
            {account.type}
          </span>
        </td>
        <td className="px-6 py-3 text-slate-500 print:text-slate-700">{account.category}</td>
        <td className="px-6 py-3 text-right">
          <input 
            type="number"
            value={account.debit || ''}
            onChange={(e) => handleInputChange(account.id, 'debit', e.target.value)}
            className="w-32 text-right p-1.5 border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded bg-transparent transition-all print:border-none print:p-0 print:text-slate-900"
            placeholder="0.00"
          />
        </td>
        <td className="px-6 py-3 text-right">
          <input 
            type="number"
            value={account.credit || ''}
            onChange={(e) => handleInputChange(account.id, 'credit', e.target.value)}
            className="w-32 text-right p-1.5 border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded bg-transparent transition-all print:border-none print:p-0 print:text-slate-900"
            placeholder="0.00"
          />
        </td>
        <td className="px-6 py-3 text-center print:hidden">
          <button 
            onClick={() => toggleRow(account.id)}
            className={`p-1.5 rounded-md transition-colors ${account.note ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
            title={account.note ? "Edit Note" : "Add Note"}
          >
            {expandedRow === account.id ? <ChevronUp className="w-4 h-4" /> : <StickyNote className="w-4 h-4" />}
          </button>
        </td>
      </tr>
      {expandedRow === account.id && (
        <tr className="bg-slate-50/50 print:hidden">
          <td colSpan={7} className="px-6 py-4">
            <div className="max-w-2xl mx-auto">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                Note to Account: {account.code} - {account.name}
              </label>
              <textarea
                value={account.note || ''}
                onChange={(e) => updateAccountNote(account.id, e.target.value)}
                placeholder="Enter explanation, calculation details, or other notes..."
                className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[80px]"
              />
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Trial Balance</h2>
          <p className="text-slate-500">View, adjust, and annotate your account balances.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={openJournalModal}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Journal Entry
          </button>

          <div className="h-6 w-px bg-slate-300 mx-1 hidden sm:block"></div>

          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export PDF
          </button>

          <div className="h-6 w-px bg-slate-300 mx-1 hidden sm:block"></div>

          <button 
            onClick={() => navigate('/import')}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <UploadCloud className="w-4 h-4" /> Import Data
          </button>

          <div className="h-6 w-px bg-slate-300 mx-1 hidden sm:block"></div>

          <button 
            onClick={resetData}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
        </div>
      </div>

      <div id="tb-report" className="space-y-6 relative min-h-[500px]">
        <PrintHeader companyName={state.companyName} reportName="Trial Balance" period={state.period} />
        
        {/* PDF/Print Metadata Section */}
        <div className="hidden print:grid grid-cols-2 gap-4 pb-4 mb-4 border-b border-slate-300 text-xs text-slate-600">
            <div>
                <div className="grid grid-cols-[80px_1fr] gap-1">
                    <span className="font-bold text-slate-900">Entity:</span>
                    <span>{state.companyName}</span>
                    <span className="font-bold text-slate-900">Currency:</span>
                    <span>{state.baseCurrency} ({state.currencySign})</span>
                    <span className="font-bold text-slate-900">Basis:</span>
                    <span>Accrual</span>
                </div>
            </div>
            <div className="text-right">
                <div className="inline-block text-left">
                     <div className="grid grid-cols-[80px_1fr] gap-1">
                        <span className="font-bold text-slate-900">Generated:</span>
                        <span>{new Date().toLocaleDateString()}</span>
                        <span className="font-bold text-slate-900">Filter:</span>
                        <span>{categoryFilter}</span>
                        <span className="font-bold text-slate-900">Grouping:</span>
                        <span>{grouping}</span>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Filter and Grouping Bar (Screen Only) */}
        {state.ledger.length > 0 && (
          <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm w-fit print:hidden">
            <Filter className="w-4 h-4 text-slate-500" />
            <label htmlFor="category-filter" className="text-sm font-medium text-slate-700">Filter:</label>
            <select 
              id="category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-sm border-none bg-slate-50 rounded px-2 py-1 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer hover:bg-slate-100"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {categoryFilter !== 'All' && (
              <span className="text-xs text-slate-400 border-l border-slate-200 pl-3">
                Showing {filteredLedger.length} accounts
              </span>
            )}

            <div className="h-4 w-px bg-slate-200 mx-2"></div>

            <Layers className="w-4 h-4 text-slate-500" />
            <label htmlFor="grouping-select" className="text-sm font-medium text-slate-700">Group By:</label>
            <select 
              id="grouping-select"
              value={grouping}
              onChange={(e) => setGrouping(e.target.value as any)}
              className="text-sm border-none bg-slate-50 rounded px-2 py-1 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer hover:bg-slate-100"
            >
              <option value="None">None</option>
              <option value="Type">Type</option>
              <option value="Category">Category</option>
              <option value="Custom">Custom Groups</option>
            </select>

            <button 
               onClick={() => setIsGroupModalOpen(true)}
               className="ml-2 p-1 text-slate-400 hover:text-indigo-600"
               title="Manage Custom Groups"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:border-none print:p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 print:bg-slate-100 print:text-slate-900 print:border-b-2 print:border-slate-800">
                <tr>
                  <th className="px-6 py-4 w-24">Code</th>
                  <th className="px-6 py-4">Account Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4 text-right w-40">Debit ({state.currencySign})</th>
                  <th className="px-6 py-4 text-right w-40">Credit ({state.currencySign})</th>
                  <th className="px-6 py-4 w-16 text-center print:hidden">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                {state.ledger.length === 0 ? (
                   <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <div className="bg-slate-100 p-3 rounded-full mb-3">
                          <UploadCloud className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-lg font-medium text-slate-900">No data available</p>
                        <p className="text-sm mt-1 max-w-sm mx-auto">
                          Your ledger is currently empty. Import your financial data to generate reports.
                        </p>
                        <button 
                          onClick={() => navigate('/import')}
                          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors print:hidden"
                        >
                          Go to Data Import
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : grouping === 'None' ? (
                  // Flat List
                  filteredLedger.length > 0 ? (
                    filteredLedger.map(renderAccountRow)
                  ) : (
                    <tr><td colSpan={7} className="text-center py-4 text-slate-500">No accounts match filter</td></tr>
                  )
                ) : (
                  // Grouped List
                  groupedLedger && groupedLedger.length > 0 ? (
                    groupedLedger.map(group => (
                      <React.Fragment key={group.key}>
                        <tr className="bg-slate-100 print:bg-slate-50 print:border-b print:border-slate-300">
                          <td colSpan={7} className="px-6 py-2.5 font-bold text-slate-800 uppercase text-xs tracking-wider border-y border-slate-200 print:border-t-0 print:border-b print:border-slate-300">
                            {group.key}
                          </td>
                        </tr>
                        {group.accounts.map(renderAccountRow)}
                        <tr className="bg-slate-50/50 font-semibold text-slate-700 italic border-t border-slate-200 print:bg-white print:border-t print:border-slate-300">
                            <td colSpan={4} className="px-6 py-2 text-right">Total {group.key}</td>
                            <td className="px-6 py-2 text-right">{state.currencySign}{group.totals.debit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                            <td className="px-6 py-2 text-right">{state.currencySign}{group.totals.credit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                            <td></td>
                        </tr>
                      </React.Fragment>
                    ))
                  ) : (
                    <tr><td colSpan={7} className="text-center py-4 text-slate-500">No accounts match filter</td></tr>
                  )
                )}
              </tbody>
              <tfoot className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200 print:bg-white print:border-t-2 print:border-slate-800">
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-right">
                    {categoryFilter === 'All' ? 'Grand Totals' : `Total (${categoryFilter})`}
                  </td>
                  <td className="px-6 py-4 text-right">{state.currencySign}{displayedTotals.debit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right">{state.currencySign}{displayedTotals.credit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="print:hidden"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Balancing Status - Global Check */}
        {state.ledger.length > 0 && (
          <div className={`p-4 rounded-lg border flex items-start gap-3 print:hidden ${isBalanced ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
            {isBalanced ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5" />
            )}
            <div>
              <h4 className={`font-semibold ${isBalanced ? 'text-emerald-900' : 'text-rose-900'}`}>
                {isBalanced ? 'Trial Balance is Balanced' : 'Trial Balance is Out of Balance'}
              </h4>
              <p className={`text-sm mt-1 ${isBalanced ? 'text-emerald-700' : 'text-rose-700'}`}>
                {isBalanced 
                  ? 'All debits match credits (Global Ledger). You are ready to generate financial reports.' 
                  : `There is a difference of ${state.currencySign}${Math.abs(globalTotals.debit - globalTotals.credit).toLocaleString()} between global debits and credits. Please review your entries.`}
              </p>
            </div>
          </div>
        )}

        {/* PDF/Print Only Footer */}
        <div className="hidden print:block pt-8 mt-4 border-t border-slate-300">
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                <span>{state.companyName} Financial Reports</span>
                <span>Page 1</span>
            </div>
            <div className="text-center mt-4 text-xs text-slate-300 uppercase tracking-widest">
                *** End of Report ***
            </div>
        </div>
      </div>

      <div className="no-print">
         <AIAnalysis reportType="Trial Balance" />
      </div>

      {/* Edit Account Modal */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-900">Edit Account Details</h3>
                    <button onClick={() => setEditingAccount(null)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleEditAccountSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Account Code</label>
                        <input 
                            value={editingAccount.code}
                            disabled
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-500 cursor-not-allowed"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Account Name</label>
                        <input 
                            value={editingAccount.name}
                            onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                        <input 
                            value={editingAccount.category}
                            onChange={(e) => setEditingAccount({ ...editingAccount, category: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            required
                            list="category-suggestions"
                        />
                        <datalist id="category-suggestions">
                            {categories.filter(c => c !== 'All').map(c => <option key={c} value={c} />)}
                        </datalist>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Custom Group</label>
                        <select 
                            value={editingAccount.customGroupId || ''}
                            onChange={(e) => setEditingAccount({ ...editingAccount, customGroupId: e.target.value || undefined })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        >
                            <option value="">-- No Group --</option>
                            {state.customGroups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-1">Assign to a custom group for report organization.</p>
                    </div>
                    <div className="pt-2 flex justify-end gap-2">
                        <button type="button" onClick={() => setEditingAccount(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Custom Group Management Modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-900">Manage Custom Groups</h3>
                    <button onClick={() => setIsGroupModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6">
                    {/* Add New Group */}
                    <div className="flex gap-2 mb-6">
                        <input 
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            placeholder="New Group Name (e.g. EBITDA Add-backs)"
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                        />
                        <button 
                            onClick={handleAddGroup}
                            disabled={!newGroupName.trim()}
                            className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>

                    {/* List Groups */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {state.customGroups.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-4 italic">No custom groups created yet.</p>
                        ) : (
                            state.customGroups.map(group => (
                                <div key={group.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 group">
                                    {editingGroupId === group.id ? (
                                        <div className="flex flex-1 gap-2">
                                            <input 
                                                value={editingGroupName}
                                                onChange={(e) => setEditingGroupName(e.target.value)}
                                                className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
                                                autoFocus
                                            />
                                            <button onClick={() => handleUpdateGroup(group.id)} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded"><Check className="w-4 h-4" /></button>
                                            <button onClick={() => setEditingGroupId(null)} className="text-slate-400 hover:bg-slate-200 p-1 rounded"><X className="w-4 h-4" /></button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="font-medium text-slate-700 text-sm">{group.name}</span>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => { setEditingGroupId(group.id); setEditingGroupName(group.name); }} 
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                </button>
                                                <button 
                                                    onClick={() => deleteCustomGroup(group.id)} 
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Journal Entry Modal */}
      {isJournalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl overflow-hidden max-h-[90vh] flex flex-col">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-4">
                    <h3 className="font-bold text-slate-900">Add New Journal Entry</h3>
                    <div className="relative">
                        <button 
                            onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                            className="text-xs flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 font-medium transition-colors"
                        >
                            <LayoutTemplate className="w-3 h-3" /> Load Entry Template
                        </button>

                        {showTemplateMenu && (
                             <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-slate-200 z-10 p-3 animate-in fade-in slide-in-from-top-1">
                                 <div className="">
                                     <p className="text-xs font-bold text-slate-500 uppercase mb-2">Saved Entry Templates</p>
                                     {state.journalTemplates.length === 0 ? (
                                         <p className="text-xs text-slate-400 italic mb-2">No templates saved.</p>
                                     ) : (
                                         <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                             {state.journalTemplates.map(t => (
                                                 <div key={t.id} className="flex items-center justify-between group p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                                                     <div onClick={() => handleLoadTemplate(t)} className="flex-1 truncate text-sm text-slate-700 font-medium hover:text-indigo-600">
                                                         {t.name}
                                                     </div>
                                                     <button onClick={(e) => { e.stopPropagation(); deleteJournalTemplate(t.id); }} className="text-slate-300 hover:text-rose-500 p-1">
                                                         <Trash2 className="w-3 h-3" />
                                                     </button>
                                                 </div>
                                             ))}
                                         </div>
                                     )}
                                 </div>
                             </div>
                        )}
                    </div>
                </div>
                <button onClick={() => setIsJournalModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
             </div>
             
             <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
               <form id="journal-form" onSubmit={handleSaveJournal} className="space-y-6">
                 {/* Header Info */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Entry Date</label>
                     <input 
                       type="date" 
                       required
                       value={journalDate}
                       onChange={(e) => setJournalDate(e.target.value)}
                       className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Memo / Reference</label>
                     <input 
                       type="text" 
                       placeholder="e.g. Adjusting Entry #12"
                       value={journalMemo}
                       onChange={(e) => setJournalMemo(e.target.value)}
                       className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                     />
                   </div>
                 </div>

                 {/* Journal Lines Table */}
                 <div className="border rounded-lg overflow-hidden border-slate-200">
                   <table className="w-full text-sm text-left">
                     <thead className="bg-slate-50 text-slate-600 font-medium">
                       <tr>
                         <th className="px-3 py-2 w-1/3">Account</th>
                         <th className="px-3 py-2">Description</th>
                         <th className="px-3 py-2 w-24 text-right">Debit</th>
                         <th className="px-3 py-2 w-24 text-right">Credit</th>
                         <th className="px-3 py-2 w-16 text-center">Actions</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {journalLines.map((line, index) => (
                         <tr key={line.id} className="hover:bg-slate-50">
                           <td className="px-3 py-2">
                             <select 
                               value={line.accountId}
                               onChange={(e) => updateJournalLine(line.id, 'accountId', e.target.value)}
                               className="w-full p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-sm bg-white"
                               required
                             >
                               <option value="">Select Account</option>
                               {state.ledger.sort((a,b) => a.code.localeCompare(b.code)).map(acc => (
                                 <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                               ))}
                             </select>
                           </td>
                           <td className="px-3 py-2">
                             <input 
                               type="text"
                               placeholder="Description"
                               value={line.description}
                               onChange={(e) => updateJournalLine(line.id, 'description', e.target.value)}
                               className="w-full p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none"
                             />
                           </td>
                           <td className="px-3 py-2">
                             <input 
                               type="number"
                               min="0"
                               step="0.01"
                               value={line.debit}
                               onChange={(e) => updateJournalLine(line.id, 'debit', e.target.value)}
                               className="w-full p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-right"
                             />
                           </td>
                           <td className="px-3 py-2">
                             <input 
                               type="number"
                               min="0"
                               step="0.01"
                               value={line.credit}
                               onChange={(e) => updateJournalLine(line.id, 'credit', e.target.value)}
                               className="w-full p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-right"
                             />
                           </td>
                           <td className="px-3 py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {savingLineId === line.id ? (
                                    <div className="absolute right-10 bg-white shadow-xl p-2 rounded-lg border border-slate-200 z-10 flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                                        <input 
                                          value={lineTemplateName}
                                          onChange={(e) => setLineTemplateName(e.target.value)}
                                          placeholder="Template Name"
                                          className="text-xs px-2 py-1 border border-slate-300 rounded w-32 focus:outline-none"
                                          autoFocus
                                        />
                                        <button 
                                          type="button" 
                                          onClick={() => handleSaveLineTemplate(line)} 
                                          className="text-emerald-600 hover:text-emerald-700 p-1"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                          type="button" 
                                          onClick={() => { setSavingLineId(null); setLineTemplateName(''); }} 
                                          className="text-slate-400 hover:text-slate-600 p-1"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => { setSavingLineId(line.id); setLineTemplateName(''); }}
                                        className="text-slate-400 hover:text-indigo-600 p-1"
                                        title="Save line as template"
                                    >
                                        <BookmarkPlus className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => removeJournalLine(line.id)}
                                    className="text-slate-400 hover:text-rose-500 p-1"
                                    disabled={journalLines.length <= 1}
                                    title="Delete line"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                     <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                       <tr>
                         <td colSpan={2} className="px-3 py-2">
                           <div className="flex items-center gap-3">
                               <button 
                                 type="button" 
                                 onClick={addJournalLine}
                                 className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1 font-medium"
                               >
                                 <Plus className="w-4 h-4" /> Add Line
                               </button>

                               <div className="h-4 w-px bg-slate-300"></div>

                               <div className="relative">
                                  <button 
                                     type="button"
                                     onClick={() => setShowLineTemplateMenu(!showLineTemplateMenu)}
                                     className="text-slate-600 hover:text-indigo-700 text-sm flex items-center gap-1 font-medium"
                                  >
                                      <Copy className="w-3.5 h-3.5" /> Add from Saved Line
                                  </button>
                                  {showLineTemplateMenu && (
                                      <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 z-10 p-3 animate-in fade-in slide-in-from-bottom-1">
                                          <p className="text-xs font-bold text-slate-500 uppercase mb-2">Saved Line Templates</p>
                                          {state.journalLineTemplates.length === 0 ? (
                                              <p className="text-xs text-slate-400 italic">No line templates saved.</p>
                                          ) : (
                                              <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                                                  {state.journalLineTemplates.map(t => (
                                                      <div key={t.id} className="flex items-center justify-between group p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                                                          <div onClick={() => addLineFromTemplate(t)} className="flex-1 truncate text-sm text-slate-700 font-medium hover:text-indigo-600">
                                                              {t.name}
                                                          </div>
                                                          <button onClick={(e) => { e.stopPropagation(); deleteJournalLineTemplate(t.id); }} className="text-slate-300 hover:text-rose-500 p-1">
                                                              <Trash2 className="w-3 h-3" />
                                                          </button>
                                                      </div>
                                                  ))}
                                              </div>
                                          )}
                                      </div>
                                  )}
                               </div>
                           </div>
                         </td>
                         <td className="px-3 py-2 text-right">{journalTotals.debit.toFixed(2)}</td>
                         <td className="px-3 py-2 text-right">{journalTotals.credit.toFixed(2)}</td>
                         <td></td>
                       </tr>
                     </tfoot>
                   </table>
                 </div>

                 {/* Balance Check */}
                 <div className={`p-3 rounded-lg flex items-center justify-between text-sm ${isJournalBalanced ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                   <span className="font-semibold">
                     {isJournalBalanced ? 'Entry is Balanced' : 'Entry is Not Balanced'}
                   </span>
                   {!isJournalBalanced && (
                     <div className="flex items-center gap-3">
                         <span>Difference: {state.currencySign}{journalDifference.toFixed(2)}</span>
                         <button
                            type="button"
                            onClick={autoBalanceEntry}
                            className="flex items-center gap-1 px-3 py-1 bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 rounded-md text-xs font-bold shadow-sm transition-colors"
                            title="Automatically add a balancing line"
                         >
                            <Wand2 className="w-3 h-3" /> Auto-Balance
                         </button>
                     </div>
                   )}
                 </div>
               </form>
             </div>

             <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
               <div className="flex items-center gap-2">
                  {isSavingTemplate ? (
                     <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                         <input 
                             value={templateName}
                             onChange={e => setTemplateName(e.target.value)}
                             placeholder="Entry Template Name..."
                             className="text-sm px-2 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none w-48"
                             autoFocus
                         />
                         <button 
                            onClick={handleSaveTemplate}
                            disabled={!templateName.trim()}
                            className="p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                            title="Save"
                            type="button"
                         >
                             <Check className="w-4 h-4" />
                         </button>
                         <button 
                            onClick={() => setIsSavingTemplate(false)}
                            className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-md"
                            title="Cancel"
                            type="button"
                         >
                             <X className="w-4 h-4" />
                         </button>
                     </div>
                  ) : (
                     <button 
                         type="button"
                         onClick={() => setIsSavingTemplate(true)}
                         className="text-slate-500 hover:text-indigo-600 text-sm font-medium flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-indigo-50 transition-colors"
                     >
                         <Save className="w-4 h-4" /> Save as Entry Template
                     </button>
                  )}
               </div>

               <div className="flex gap-3">
                 <button 
                   type="button" 
                   onClick={() => setIsJournalModalOpen(false)} 
                   className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                 >
                   Cancel
                 </button>
                 <button 
                   type="submit"
                   form="journal-form"
                   disabled={!isJournalBalanced}
                   className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                 >
                   <Save className="w-4 h-4" /> Post Journal Entry
                 </button>
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrialBalance;