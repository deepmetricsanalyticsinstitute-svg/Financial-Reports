
import React, { useMemo } from 'react';
import { useFinancials } from '../context/FinancialContext';
import { AccountType, Account } from '../types';
import AIAnalysis from '../components/AIAnalysis';
import { Download, Loader2 } from 'lucide-react';
import { exportToPDF } from '../utils/printHelper';
import PrintHeader from '../components/PrintHeader';

interface RowProps {
  name: string;
  value?: number;
  indent?: boolean;
  isTotal?: boolean;
  isHeader?: boolean;
  isSubHeader?: boolean;
  currency: string;
}

const Row: React.FC<RowProps> = ({ name, value, indent = false, isTotal = false, isHeader = false, isSubHeader = false, currency }) => (
  <div className={`flex justify-between py-2 border-b border-slate-50 last:border-0 
    ${isHeader ? 'font-bold text-slate-900 mt-4' : ''} 
    ${isTotal ? 'font-bold text-slate-900 border-t border-slate-300' : 'text-slate-600'} 
    ${isSubHeader ? 'font-semibold text-slate-700 mt-2 pl-4 italic' : ''}
    page-break-inside-avoid`}>
    <span className={`${indent && !isSubHeader ? 'pl-8' : ''}`}>{name}</span>
    {value !== undefined && <span>{isTotal || isHeader ? currency : ''}{value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>}
  </div>
);

const groupByCategory = (accounts: Account[]) => {
  const groups: Record<string, Account[]> = {};
  accounts.forEach(a => {
    const cat = a.category || 'Uncategorized';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(a);
  });
  return groups;
};

const IncomeStatement: React.FC = () => {
  const { state } = useFinancials();
  const [isExporting, setIsExporting] = React.useState(false);

  // Grouping Logic
  const revenues = state.ledger.filter(a => a.type === AccountType.REVENUE);
  const costOfSales = state.ledger.filter(a => a.category === 'Cost of Sales' || a.category === 'Cost of Goods Sold');
  // Operating expenses are everything else that is an expense
  const operatingExpenses = state.ledger.filter(a => a.type === AccountType.EXPENSE && a.category !== 'Cost of Sales' && a.category !== 'Cost of Goods Sold');

  const totalRevenue = revenues.reduce((sum, a) => sum + (a.credit - a.debit), 0);
  const totalCostOfSales = costOfSales.reduce((sum, a) => sum + (a.debit - a.credit), 0);
  const grossProfit = totalRevenue - totalCostOfSales;
  const totalOperatingExpenses = operatingExpenses.reduce((sum, a) => sum + (a.debit - a.credit), 0);
  const netIncome = grossProfit - totalOperatingExpenses;

  // Grouped Data
  const revenueGroups = useMemo(() => groupByCategory(revenues), [revenues]);
  const costOfSalesGroups = useMemo(() => groupByCategory(costOfSales), [costOfSales]);
  const expenseGroups = useMemo(() => groupByCategory(operatingExpenses), [operatingExpenses]);

  const renderCategorySummaries = (groups: Record<string, Account[]>, invertSign: boolean = false) => {
    const categories = Object.keys(groups).sort();
    
    return categories.map(cat => {
      const accounts = groups[cat];
      const total = accounts.reduce((sum, a) => sum + (invertSign ? (a.credit - a.debit) : (a.debit - a.credit)), 0);

      return (
        <Row 
          key={cat} 
          name={cat} 
          value={total} 
          indent 
          currency={state.currencySign} 
        />
      );
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    // Short delay to allow UI to update state before heavy PDF generation
    setTimeout(() => {
        exportToPDF('income-statement-report', `Income_Statement_${state.companyName}_${state.period}`);
        setIsExporting(false);
    }, 100);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-end no-print">
        <button 
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm disabled:opacity-50"
        >
          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 
          {isExporting ? 'Generating...' : 'Export PDF'}
        </button>
      </div>

      <div id="income-statement-report" className="space-y-8">
        <PrintHeader companyName={state.companyName} reportName="Income Statement" period={state.period} />

        <div className="flex flex-col items-center mb-8 print:hidden print:mb-0">
          <h2 className="text-2xl font-bold text-slate-900">Income Statement</h2>
          <p className="text-slate-500 font-medium">For the month ended {state.period}</p>
          <p className="text-slate-400 text-sm mt-1">{state.companyName}</p>
        </div>

        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-lg print:shadow-none print:p-0 print:border-none">
          <div className="space-y-1">
            <Row name="Revenue" isHeader currency={state.currencySign} />
            {renderCategorySummaries(revenueGroups, true)}
            <Row name="Total Revenue" value={totalRevenue} isTotal currency={state.currencySign} />

            <Row name="Cost of Goods Sold" isHeader currency={state.currencySign} />
            {renderCategorySummaries(costOfSalesGroups, false)}
            <Row name="Total Cost of Goods Sold" value={totalCostOfSales} isTotal currency={state.currencySign} />

            <div className="py-4 page-break-inside-avoid">
              <div className="flex justify-between py-2 border-t-2 border-slate-800 font-bold text-lg">
                  <span>Gross Profit</span>
                  <span>{state.currencySign}{grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <Row name="Operating Expenses" isHeader currency={state.currencySign} />
            {renderCategorySummaries(expenseGroups, false)}
            <Row name="Total Operating Expenses" value={totalOperatingExpenses} isTotal currency={state.currencySign} />

            <div className="py-6 mt-4 page-break-inside-avoid">
              <div className="flex justify-between py-4 border-t-4 double-border border-slate-900 font-bold text-xl bg-slate-50 print:bg-transparent px-4 print:px-0 rounded-lg">
                  <span>Net Income</span>
                  <span className={netIncome >= 0 ? 'text-emerald-600 print:text-black' : 'text-rose-600 print:text-black'}>
                    {state.currencySign}{netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="no-print">
         <AIAnalysis reportType="Income Statement" />
      </div>
    </div>
  );
};

export default IncomeStatement;
