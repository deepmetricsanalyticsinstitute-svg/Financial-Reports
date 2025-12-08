
import React, { useMemo, useState, useEffect } from 'react';
import { useFinancials } from '../context/FinancialContext';
import { AccountType, Account, ReportTemplate } from '../types';
import AIAnalysis from '../components/AIAnalysis';
import { Download, Loader2, Settings2, X, Check, Save, Trash2, LayoutTemplate, TrendingUp, ArrowRightLeft } from 'lucide-react';
import { exportToPDF } from '../utils/printHelper';
import PrintHeader from '../components/PrintHeader';

interface RowProps {
  name: string;
  value: number;
  compValue?: number;
  showVariance?: boolean;
  indent?: boolean;
  isTotal?: boolean;
  isHeader?: boolean;
  isSubHeader?: boolean;
  currency: string;
  inverseColor?: boolean; // If true, positive variance is bad (Red), negative is good (Green) - e.g. Expenses
}

const Row: React.FC<RowProps> = ({ 
  name, 
  value, 
  compValue = 0, 
  showVariance = false, 
  indent = false, 
  isTotal = false, 
  isHeader = false, 
  isSubHeader = false, 
  currency,
  inverseColor = false
}) => {
  const variance = value - compValue;
  const variancePercent = compValue !== 0 ? (variance / compValue) * 100 : 0;
  
  // Color Logic
  // Default (Revenue/Profit): Increase (Pos) = Green, Decrease (Neg) = Red
  // Inverse (Expense): Increase (Pos) = Red, Decrease (Neg) = Green
  let varColor = 'text-slate-500';
  if (variance > 0) {
    varColor = inverseColor ? 'text-rose-600' : 'text-emerald-600';
  } else if (variance < 0) {
    varColor = inverseColor ? 'text-emerald-600' : 'text-rose-600';
  }

  return (
    <div className={`flex items-end py-2 border-b border-slate-50 last:border-0 
      ${isHeader ? 'font-bold text-slate-900 mt-4 border-b-2 border-slate-200' : ''} 
      ${isTotal ? 'font-bold text-slate-900 border-t border-slate-300 bg-slate-50/50' : 'text-slate-600'} 
      ${isSubHeader ? 'font-semibold text-slate-700 mt-2 pl-4 italic' : ''}
      page-break-inside-avoid`}
    >
      {/* Name Column */}
      <div className={`flex-1 ${indent && !isSubHeader ? 'pl-8' : ''} truncate pr-2`}>
        {name}
      </div>

      {/* Value Columns */}
      <div className="flex items-center text-right text-sm">
        {/* Current Period */}
        <div className="w-32 px-2">
           {(value !== undefined && !isSubHeader) && (
             <span>{isTotal || isHeader ? currency : ''}{value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
           )}
        </div>

        {/* Comparison Columns */}
        {showVariance && !isSubHeader && (
          <>
            <div className="w-32 px-2 text-slate-400">
               {(!isHeader) && (
                 <span>{compValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
               )}
            </div>
            <div className={`w-24 px-2 font-medium ${isHeader ? 'text-slate-900' : varColor}`}>
               {(!isHeader) && (
                 <span>{variance > 0 ? '+' : ''}{variance.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
               )}
            </div>
            <div className={`w-20 px-2 font-medium ${isHeader ? 'text-slate-900' : varColor}`}>
               {(!isHeader) && (
                 <span>{variancePercent > 0 ? '+' : ''}{variancePercent.toFixed(1)}%</span>
               )}
            </div>
          </>
        )}
      </div>
    </div>
  );
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

// Helper to generate a mock comparison ledger based on the current one
const generatePriorPeriod = (currentLedger: Account[]): Account[] => {
  return currentLedger.map(acc => {
    // Simulate a prior period:
    // Random variance between -15% and +15%
    const variance = 1 + (Math.random() * 0.3 - 0.15); 
    return {
      ...acc,
      debit: acc.debit * variance,
      credit: acc.credit * variance
    };
  });
};

const IncomeStatement: React.FC = () => {
  const { state, addTemplate, deleteTemplate } = useFinancials();
  const [isExporting, setIsExporting] = React.useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());
  const [templateName, setTemplateName] = useState('');
  
  // Variance Analysis State
  const [showVariance, setShowVariance] = useState(false);
  const [compLedger, setCompLedger] = useState<Account[]>([]);

  // Initialize Comparison Data
  useEffect(() => {
    if (state.ledger.length > 0 && compLedger.length === 0) {
      setCompLedger(generatePriorPeriod(state.ledger));
    }
  }, [state.ledger]);

  // 1. Get all relevant categories for the filter UI
  const allCategories = useMemo(() => {
    const relevantTypes = [AccountType.REVENUE, AccountType.EXPENSE];
    const cats = new Set(
        state.ledger
            .filter(a => relevantTypes.includes(a.type))
            .map(a => a.category || 'Uncategorized')
    );
    return Array.from(cats).sort();
  }, [state.ledger]);

  // 2. Filter Ledgers based on configuration
  const filteredLedger = useMemo(() => {
    return state.ledger.filter(a => !hiddenCategories.has(a.category || 'Uncategorized'));
  }, [state.ledger, hiddenCategories]);

  const filteredCompLedger = useMemo(() => {
    return compLedger.filter(a => !hiddenCategories.has(a.category || 'Uncategorized'));
  }, [compLedger, hiddenCategories]);

  const reportTemplates = state.templates.filter(t => t.reportType === 'IncomeStatement');

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return;
    addTemplate({
      id: Date.now().toString(),
      name: templateName,
      reportType: 'IncomeStatement',
      hiddenCategories: Array.from(hiddenCategories)
    });
    setTemplateName('');
  };

  const handleLoadTemplate = (t: ReportTemplate) => {
    setHiddenCategories(new Set(t.hiddenCategories));
  };

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

  // --- CALCULATION HELPERS ---
  const calculateTotals = (ledger: Account[]) => {
    const revenues = ledger.filter(a => a.type === AccountType.REVENUE);
    const costOfSales = ledger.filter(a => a.category === 'Cost of Sales' || a.category === 'Cost of Goods Sold');
    const operatingExpenses = ledger.filter(a => a.type === AccountType.EXPENSE && a.category !== 'Cost of Sales' && a.category !== 'Cost of Goods Sold');

    const totalRevenue = revenues.reduce((sum, a) => sum + (a.credit - a.debit), 0);
    const totalCostOfSales = costOfSales.reduce((sum, a) => sum + (a.debit - a.credit), 0);
    const grossProfit = totalRevenue - totalCostOfSales;
    const totalOperatingExpenses = operatingExpenses.reduce((sum, a) => sum + (a.debit - a.credit), 0);
    const netIncome = grossProfit - totalOperatingExpenses;

    const revenueGroups = groupByCategory(revenues);
    const costOfSalesGroups = groupByCategory(costOfSales);
    const expenseGroups = groupByCategory(operatingExpenses);

    return {
      totalRevenue,
      totalCostOfSales,
      grossProfit,
      totalOperatingExpenses,
      netIncome,
      revenueGroups,
      costOfSalesGroups,
      expenseGroups
    };
  };

  const current = calculateTotals(filteredLedger);
  const comp = calculateTotals(filteredCompLedger);

  const handleExport = async () => {
    setIsExporting(true);
    setTimeout(() => {
        exportToPDF('income-statement-report', `Income_Statement_${state.companyName}_${state.period}`, showVariance); // Landscape if variance is on
        setIsExporting(false);
    }, 100);
  };

  const renderCategorySummaries = (
    groups: Record<string, Account[]>, 
    compGroups: Record<string, Account[]>,
    invertSign: boolean = false, 
    inverseColor: boolean = false
  ) => {
    const categories = Object.keys(groups).sort();
    
    return categories.map(cat => {
      const accounts = groups[cat];
      const compAccounts = compGroups[cat] || [];

      const total = accounts.reduce((sum, a) => sum + (invertSign ? (a.credit - a.debit) : (a.debit - a.credit)), 0);
      const compTotal = compAccounts.reduce((sum, a) => sum + (invertSign ? (a.credit - a.debit) : (a.debit - a.credit)), 0);

      return (
        <Row 
          key={cat} 
          name={cat} 
          value={total} 
          compValue={compTotal}
          showVariance={showVariance}
          indent 
          currency={state.currencySign} 
          inverseColor={inverseColor}
        />
      );
    });
  };

  return (
    <div className={`mx-auto space-y-8 relative ${showVariance ? 'max-w-6xl' : 'max-w-4xl'}`}>
      <div className="flex justify-between items-center no-print">
         
         <div className="flex items-center gap-2">
            <button
               onClick={() => setShowVariance(!showVariance)}
               className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                 showVariance 
                 ? 'bg-slate-900 text-white shadow-md' 
                 : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
               }`}
            >
               <TrendingUp className="w-4 h-4" />
               {showVariance ? 'Hide Comparison' : 'Variance Analysis'}
            </button>
            {showVariance && (
               <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
                 Comparing vs. Prior Period (Simulated)
               </span>
            )}
         </div>

         <div className="flex gap-3">
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

                    {/* Category Filter */}
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
      </div>

      <div id="income-statement-report" className="space-y-8">
        <PrintHeader companyName={state.companyName} reportName="Income Statement" period={state.period} />

        <div className="flex flex-col items-center mb-8 print:hidden print:mb-0">
          <h2 className="text-2xl font-bold text-slate-900">Income Statement</h2>
          <p className="text-slate-500 font-medium">For the month ended {state.period}</p>
          <p className="text-slate-400 text-sm mt-1">{state.companyName}</p>
        </div>

        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-lg print:shadow-none print:p-0 print:border-none">
          {/* Custom Header for Variance Mode */}
          <div className="flex justify-end text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-2 mb-2">
              <div className="w-32 px-2 text-right">Current</div>
              {showVariance && (
                <>
                  <div className="w-32 px-2 text-right">Prior Period</div>
                  <div className="w-24 px-2 text-right">Diff</div>
                  <div className="w-20 px-2 text-right">%</div>
                </>
              )}
          </div>

          <div className="space-y-1">
            <Row name="Revenue" isHeader currency={state.currencySign} showVariance={showVariance} value={0} />
            {renderCategorySummaries(current.revenueGroups, comp.revenueGroups, true, false)}
            <Row 
              name="Total Revenue" 
              value={current.totalRevenue} 
              compValue={comp.totalRevenue}
              isTotal 
              currency={state.currencySign} 
              showVariance={showVariance} 
              inverseColor={false}
            />

            <Row name="Cost of Goods Sold" isHeader currency={state.currencySign} showVariance={showVariance} value={0} />
            {renderCategorySummaries(current.costOfSalesGroups, comp.costOfSalesGroups, false, true)}
            <Row 
              name="Total Cost of Goods Sold" 
              value={current.totalCostOfSales} 
              compValue={comp.totalCostOfSales}
              isTotal 
              currency={state.currencySign} 
              showVariance={showVariance}
              inverseColor={true} // Increase in COGS is bad
            />

            <div className="py-4 page-break-inside-avoid">
              <Row 
                name="Gross Profit" 
                value={current.grossProfit} 
                compValue={comp.grossProfit}
                currency={state.currencySign}
                showVariance={showVariance}
                isTotal
                inverseColor={false}
              />
            </div>

            <Row name="Operating Expenses" isHeader currency={state.currencySign} showVariance={showVariance} value={0} />
            {renderCategorySummaries(current.expenseGroups, comp.expenseGroups, false, true)}
            <Row 
              name="Total Operating Expenses" 
              value={current.totalOperatingExpenses} 
              compValue={comp.totalOperatingExpenses}
              isTotal 
              currency={state.currencySign} 
              showVariance={showVariance}
              inverseColor={true} // Increase in Expenses is bad
            />

            <div className="py-6 mt-4 page-break-inside-avoid">
              <div className={`flex items-center py-4 border-t-4 double-border border-slate-900 bg-slate-50 print:bg-transparent px-4 print:px-0 rounded-lg`}>
                  <div className="flex-1 font-bold text-xl">Net Income</div>
                  
                  <div className="flex items-center text-right font-bold text-xl">
                      <div className={`w-32 px-2 ${current.netIncome >= 0 ? 'text-emerald-600' : 'text-rose-600'} print:text-black`}>
                         {state.currencySign}{current.netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      
                      {showVariance && (
                        <>
                          <div className="w-32 px-2 text-slate-400 text-lg">
                             {comp.netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                          
                          {(() => {
                            const diff = current.netIncome - comp.netIncome;
                            const pct = comp.netIncome !== 0 ? (diff / comp.netIncome) * 100 : 0;
                            const colorClass = diff >= 0 ? 'text-emerald-600' : 'text-rose-600';
                            
                            return (
                              <>
                                <div className={`w-24 px-2 text-lg ${colorClass}`}>
                                  {diff > 0 ? '+' : ''}{diff.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                                </div>
                                <div className={`w-20 px-2 text-lg ${colorClass}`}>
                                  {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
                                </div>
                              </>
                            );
                          })()}
                        </>
                      )}
                  </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="no-print">
         <AIAnalysis reportType="Income Statement" customLedger={filteredLedger} />
      </div>
    </div>
  );
};

export default IncomeStatement;
