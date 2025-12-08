
import React, { useMemo, useState } from 'react';
import { useFinancials } from '../context/FinancialContext';
import { AccountType, Account, ReportTemplate } from '../types';
import AIAnalysis from '../components/AIAnalysis';
import { WalletCards, Download, Loader2, Settings2, X, Check, Save, Trash2, LayoutTemplate } from 'lucide-react';
import { exportToPDF } from '../utils/printHelper';
import PrintHeader from '../components/PrintHeader';

interface RowProps {
  name: string;
  value: number;
  isTotal?: boolean;
  isSubHeader?: boolean;
  indent?: boolean;
}

const Row: React.FC<RowProps> = ({ name, value, isTotal = false, isSubHeader = false, indent = false }) => (
  <div className={`flex justify-between py-1 ml-4 
    ${isTotal ? 'font-bold border-t border-slate-400 mt-2 pt-2 text-slate-900' : 'text-slate-600'} 
    ${isSubHeader ? 'font-semibold text-slate-700 mt-2 italic' : ''}
    page-break-inside-avoid`}>
    <span className={indent ? 'pl-4' : ''}>{name}</span>
    {isSubHeader ? <span></span> : <span>{value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>}
  </div>
);

const SectionHeader = ({ title }: { title: string }) => (
  <h3 className="text-lg font-bold text-slate-800 border-b-2 border-slate-800 pb-1 mb-3 mt-6 uppercase tracking-wide break-after-avoid">
    {title}
  </h3>
);

const SubHeader = ({ title }: { title: string }) => (
  <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-2 mt-4 ml-2 break-after-avoid">
    {title}
  </h4>
);

// Helpers to classify generic categories if user inputs them manually
const isCurrentAsset = (cat: string) => {
  const c = cat.toLowerCase();
  return c.includes('current') || c.includes('cash') || c.includes('bank') || c.includes('receivable') || c.includes('inventory') || c.includes('stock') || c.includes('prepaid');
};

const isCurrentLiability = (cat: string) => {
  const c = cat.toLowerCase();
  return c.includes('current') || c.includes('payable') || c.includes('tax') || c.includes('vat') || c.includes('gst') || c.includes('accrued') || c.includes('short');
};

const groupByCategory = (accounts: Account[]) => {
  const groups: Record<string, Account[]> = {};
  accounts.forEach(a => {
    const cat = a.category || 'Uncategorized';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(a);
  });
  return groups;
};

const BalanceSheet: React.FC = () => {
  const { state, addTemplate, deleteTemplate } = useFinancials();
  const [isExporting, setIsExporting] = React.useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());
  const [templateName, setTemplateName] = useState('');

  // 1. Get all relevant categories for the filter UI
  const allCategories = useMemo(() => {
    const relevantTypes = [AccountType.ASSET, AccountType.LIABILITY, AccountType.EQUITY];
    const cats = new Set(
        state.ledger
            .filter(a => relevantTypes.includes(a.type))
            .map(a => a.category || 'Uncategorized')
    );
    return Array.from(cats).sort();
  }, [state.ledger]);

  // 2. Filter Ledger based on configuration
  const filteredLedger = useMemo(() => {
    return state.ledger.filter(a => !hiddenCategories.has(a.category || 'Uncategorized'));
  }, [state.ledger, hiddenCategories]);

  const reportTemplates = state.templates.filter(t => t.reportType === 'BalanceSheet');

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return;
    addTemplate({
      id: Date.now().toString(),
      name: templateName,
      reportType: 'BalanceSheet',
      hiddenCategories: Array.from(hiddenCategories)
    });
    setTemplateName('');
  };

  const handleLoadTemplate = (t: ReportTemplate) => {
    setHiddenCategories(new Set(t.hiddenCategories));
  };

  // Toggle visibility handler
  const toggleCategory = (cat: string) => {
    setHiddenCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  // 1. Calculate Net Income first to adjust retained earnings (Uses FULL ledger usually, but here we obey the filter for a "What If")
  // Note: Standard Accounting would demand Net Income includes all expenses. 
  // But if the user explicitly hides an expense category in Balance Sheet view, they likely want it excluded from the Equity calculation too for that view.
  const revenues = filteredLedger.filter(a => a.type === AccountType.REVENUE);
  const expenses = filteredLedger.filter(a => a.type === AccountType.EXPENSE);
  const totalRevenue = revenues.reduce((sum, a) => sum + (a.credit - a.debit), 0);
  const totalExpenses = expenses.reduce((sum, a) => sum + (a.debit - a.credit), 0);
  const currentPeriodEarnings = totalRevenue - totalExpenses;

  // 2. Classify Assets (Smarter Classification)
  const assetAccounts = filteredLedger.filter(a => a.type === AccountType.ASSET);
  const currentAssets = assetAccounts.filter(a => isCurrentAsset(a.category));
  const nonCurrentAssets = assetAccounts.filter(a => !isCurrentAsset(a.category));
  
  const totalCurrentAssets = currentAssets.reduce((sum, a) => sum + (a.debit - a.credit), 0);
  const totalNonCurrentAssets = nonCurrentAssets.reduce((sum, a) => sum + (a.debit - a.credit), 0);
  const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

  // 3. Classify Liabilities (Smarter Classification)
  const liabilityAccounts = filteredLedger.filter(a => a.type === AccountType.LIABILITY);
  const currentLiabilities = liabilityAccounts.filter(a => isCurrentLiability(a.category));
  const nonCurrentLiabilities = liabilityAccounts.filter(a => !isCurrentLiability(a.category));

  const totalCurrentLiabilities = currentLiabilities.reduce((sum, a) => sum + (a.credit - a.debit), 0);
  const totalNonCurrentLiabilities = nonCurrentLiabilities.reduce((sum, a) => sum + (a.credit - a.debit), 0);
  const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;

  // 4. Calculate Net Working Capital
  const netWorkingCapital = totalCurrentAssets - totalCurrentLiabilities;

  // 5. Classify Equity
  const equityAccounts = filteredLedger.filter(a => a.type === AccountType.EQUITY);
  const totalEquityExclEarnings = equityAccounts.reduce((sum, a) => sum + (a.credit - a.debit), 0);
  const totalEquity = totalEquityExclEarnings + currentPeriodEarnings;

  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
  const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.1;

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
        exportToPDF('balance-sheet-report', `Balance_Sheet_${state.companyName}_${state.period}`);
        setIsExporting(false);
    }, 100);
  };

  const renderCategorySummaries = (accounts: Account[], invert: boolean = false) => {
    const groups = groupByCategory(accounts);
    const categories = Object.keys(groups).sort();
    
    return categories.map(cat => {
      const groupAccounts = groups[cat];
      const total = groupAccounts.reduce((sum, a) => sum + (invert ? (a.credit - a.debit) : (a.debit - a.credit)), 0);

      return (
        <Row 
          key={cat} 
          name={cat} 
          value={total} 
          indent
        />
      );
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 relative">
      <div className="flex justify-end gap-3 no-print">
        <div className="relative">
            <button 
              onClick={() => setShowConfig(!showConfig)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors shadow-sm ${
                showConfig || hiddenCategories.size > 0 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Settings2 className="w-4 h-4" /> 
              Customize View
              {hiddenCategories.size > 0 && (
                <span className="flex items-center justify-center bg-indigo-600 text-white text-[10px] w-5 h-5 rounded-full">
                  {hiddenCategories.size}
                </span>
              )}
            </button>
            
            {showConfig && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-20 overflow-hidden animate-in fade-in slide-in-from-top-2">
                 <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h4 className="font-semibold text-slate-900 text-sm">Report Configuration</h4>
                    <button onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                 </div>

                 {/* Template Section */}
                 <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-4">
                    {/* Load Template */}
                    {reportTemplates.length > 0 && (
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                             <LayoutTemplate className="w-3 h-3" /> Saved Templates
                          </label>
                          <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                              {reportTemplates.map(t => (
                                  <div key={t.id} className="flex items-center justify-between text-sm group p-2 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-all cursor-pointer">
                                      <button onClick={() => handleLoadTemplate(t)} className="text-slate-700 text-left flex-1 truncate hover:text-indigo-600 font-medium">
                                        {t.name}
                                      </button>
                                      <button onClick={() => deleteTemplate(t.id)} className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                  </div>
                              ))}
                          </div>
                      </div>
                    )}
                    
                    {/* Save Template */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Save Current View</label>
                        <div className="flex gap-2">
                            <input 
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder="Template Name..." 
                                className="flex-1 text-xs border border-slate-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            />
                            <button 
                              onClick={handleSaveTemplate} 
                              disabled={!templateName.trim()} 
                              className="bg-indigo-600 text-white px-2.5 py-1.5 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600"
                              title="Save Template"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                 </div>

                 <div className="p-2">
                   <p className="px-2 py-1 text-xs font-bold text-slate-500 uppercase mt-2 mb-1">Include Categories</p>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                      {allCategories.length > 0 ? allCategories.map(cat => (
                        <div 
                          key={cat} 
                          onClick={() => toggleCategory(cat)}
                          className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer group"
                        >
                          <span className={`text-sm ${hiddenCategories.has(cat) ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>
                            {cat}
                          </span>
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                            hiddenCategories.has(cat) 
                              ? 'border-slate-300 bg-transparent' 
                              : 'border-indigo-500 bg-indigo-500'
                          }`}>
                              {!hiddenCategories.has(cat) && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>
                        </div>
                      )) : (
                        <p className="text-xs text-slate-400 p-2 text-center">No categories found</p>
                      )}
                    </div>
                 </div>
                 <div className="p-2 border-t border-slate-100 bg-slate-50">
                    <button 
                      onClick={() => setHiddenCategories(new Set())}
                      className="w-full py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
                    >
                      Reset All Filters
                    </button>
                 </div>
              </div>
            )}
         </div>

        <button 
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm disabled:opacity-50"
        >
          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 
          {isExporting ? 'Generating...' : 'Export PDF'}
        </button>
      </div>

      <div id="balance-sheet-report" className="space-y-8">
        <PrintHeader companyName={state.companyName} reportName="Balance Sheet" period={state.period} />

        <div className="flex flex-col items-center mb-8 print:hidden">
          <h2 className="text-2xl font-bold text-slate-900">Balance Sheet</h2>
          <p className="text-slate-500 font-medium">As of {state.period}</p>
          <p className="text-slate-400 text-sm mt-1">{state.companyName}</p>
          {!isBalanced && (
            <p className="text-xs text-rose-500 mt-2 bg-rose-50 px-2 py-1 rounded">
              Report filtered. Assets do not equal Liabilities + Equity.
            </p>
          )}
        </div>

        {/* Net Working Capital Metric */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden print:shadow-none print:border print:border-slate-300">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-lg print:hidden">
              <WalletCards className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Net Working Capital</h3>
              <p className="text-sm text-slate-400 mt-0.5">Key Liquidity Metric (Current Assets - Current Liabilities)</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${netWorkingCapital >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
              {state.currencySign}{netWorkingCapital.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
              netWorkingCapital >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${netWorkingCapital >= 0 ? 'bg-emerald-500' : 'bg-rose-500'} print:hidden`}></span>
              {netWorkingCapital >= 0 ? 'Positive Working Capital' : 'Negative Working Capital'}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 print:grid-cols-1 print:gap-4">
          {/* ASSETS COLUMN */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-md print:shadow-none print:border-none print:p-0">
            <SectionHeader title="Assets" />
            
            <SubHeader title="Current Assets" />
            {renderCategorySummaries(currentAssets)}
            <Row name="Total Current Assets" value={totalCurrentAssets} isTotal />

            <SubHeader title="Non-Current Assets" />
            {renderCategorySummaries(nonCurrentAssets)}
            <Row name="Total Non-Current Assets" value={totalNonCurrentAssets} isTotal />

            <div className="mt-8 pt-4 border-t-4 border-slate-900 page-break-inside-avoid">
              <div className="flex justify-between font-bold text-lg text-slate-900">
                <span>Total Assets</span>
                <span>{state.currencySign}{totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* LIABILITIES & EQUITY COLUMN */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-md print:shadow-none print:border-none print:p-0">
            <SectionHeader title="Liabilities" />
            
            <SubHeader title="Current Liabilities" />
            {renderCategorySummaries(currentLiabilities, true)}
            <Row name="Total Current Liabilities" value={totalCurrentLiabilities} isTotal />

            <SubHeader title="Non-Current Liabilities" />
            {renderCategorySummaries(nonCurrentLiabilities, true)}
            <Row name="Total Non-Current Liabilities" value={totalNonCurrentLiabilities} isTotal />
            
            <div className="mt-4 pt-2 border-t border-slate-300 page-break-inside-avoid">
              <div className="flex justify-between font-bold text-slate-700 ml-4">
                <span>Total Liabilities</span>
                <span>{totalLiabilities.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <SectionHeader title="Equity" />
            {renderCategorySummaries(equityAccounts, true)}
            <Row name="Current Year Earnings" value={currentPeriodEarnings} indent />
            <Row name="Total Equity" value={totalEquity} isTotal />

            <div className="mt-8 pt-4 border-t-4 border-slate-900 page-break-inside-avoid">
              <div className="flex justify-between font-bold text-lg text-slate-900">
                <span>Total Liabilities & Equity</span>
                <span>{state.currencySign}{totalLiabilitiesAndEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="no-print">
         <AIAnalysis reportType="Balance Sheet" customLedger={filteredLedger} />
      </div>
    </div>
  );
};

export default BalanceSheet;