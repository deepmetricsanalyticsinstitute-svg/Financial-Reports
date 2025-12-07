
import React, { useMemo, useState } from 'react';
import { useFinancials } from '../context/FinancialContext';
import { AccountType } from '../types';
import AIAnalysis from '../components/AIAnalysis';
import { AlertTriangle, CheckCircle2, RotateCcw, UploadCloud, Info, StickyNote, ChevronUp, ChevronDown, Filter, Download, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PrintHeader from '../components/PrintHeader';
import { exportToPDF } from '../utils/printHelper';

const TrialBalance: React.FC = () => {
  const { state, updateAccountBalance, resetData, updateAccountNote } = useFinancials();
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [isExporting, setIsExporting] = useState(false);
  const navigate = useNavigate();

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Trial Balance</h2>
          <p className="text-slate-500">View, adjust, and annotate your account balances.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
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

      <div id="tb-report" className="space-y-6">
        <PrintHeader companyName={state.companyName} reportName="Trial Balance" period={state.period} />
        
        {/* Filter Bar */}
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
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:border-slate-300">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 print:bg-white print:border-b-2 print:border-slate-800">
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
              <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                {filteredLedger.length > 0 ? (
                  filteredLedger.map((account) => (
                    <React.Fragment key={account.id}>
                      <tr className="hover:bg-slate-50/50 transition-colors page-break-inside-avoid">
                        <td className="px-6 py-3 font-mono text-slate-500">{account.code}</td>
                        <td className="px-6 py-3 font-medium text-slate-900">{account.name}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium print:border print:border-slate-300 print:bg-transparent
                            ${account.type === AccountType.ASSET ? 'bg-indigo-100 text-indigo-800' :
                              account.type === AccountType.LIABILITY ? 'bg-orange-100 text-orange-800' :
                              account.type === AccountType.EQUITY ? 'bg-purple-100 text-purple-800' :
                              account.type === AccountType.REVENUE ? 'bg-emerald-100 text-emerald-800' :
                              'bg-rose-100 text-rose-800'
                            }`}>
                            {account.type}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-slate-500">{account.category}</td>
                        <td className="px-6 py-3 text-right">
                          <input 
                            type="number"
                            value={account.debit || ''}
                            onChange={(e) => handleInputChange(account.id, 'debit', e.target.value)}
                            className="w-32 text-right p-1.5 border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded bg-transparent transition-all print:text-right"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-6 py-3 text-right">
                          <input 
                            type="number"
                            value={account.credit || ''}
                            onChange={(e) => handleInputChange(account.id, 'credit', e.target.value)}
                            className="w-32 text-right p-1.5 border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded bg-transparent transition-all print:text-right"
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
                  ))
                ) : (
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
      </div>

      <div className="no-print">
         <AIAnalysis reportType="Trial Balance" />
      </div>
    </div>
  );
};

export default TrialBalance;
