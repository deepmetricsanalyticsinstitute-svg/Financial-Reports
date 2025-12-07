
import React, { useMemo } from 'react';
import { useFinancials } from '../context/FinancialContext';
import { AccountType, Account } from '../types';
import AIAnalysis from '../components/AIAnalysis';
import { WalletCards, Download, Loader2 } from 'lucide-react';
import { exportToPDF } from '../utils/printHelper';
import PrintHeader from '../components/PrintHeader';

interface RowProps {
  name: string;
  value: number;
  isTotal?: boolean;
  isSubHeader?: boolean;
}

const Row: React.FC<RowProps> = ({ name, value, isTotal = false, isSubHeader = false }) => (
  <div className={`flex justify-between py-1 ml-4 
    ${isTotal ? 'font-bold border-t border-slate-400 mt-2 pt-2 text-slate-900' : 'text-slate-600'} 
    ${isSubHeader ? 'font-semibold text-slate-700 mt-2 italic' : ''}
    page-break-inside-avoid`}>
    <span className={isSubHeader ? '' : 'pl-4'}>{name}</span>
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
  const { state } = useFinancials();
  const [isExporting, setIsExporting] = React.useState(false);

  // 1. Calculate Net Income first to adjust retained earnings
  const revenues = state.ledger.filter(a => a.type === AccountType.REVENUE);
  const expenses = state.ledger.filter(a => a.type === AccountType.EXPENSE);
  const totalRevenue = revenues.reduce((sum, a) => sum + (a.credit - a.debit), 0);
  const totalExpenses = expenses.reduce((sum, a) => sum + (a.debit - a.credit), 0);
  const currentPeriodEarnings = totalRevenue - totalExpenses;

  // 2. Classify Assets (Smarter Classification)
  const assetAccounts = state.ledger.filter(a => a.type === AccountType.ASSET);
  const currentAssets = assetAccounts.filter(a => isCurrentAsset(a.category));
  const nonCurrentAssets = assetAccounts.filter(a => !isCurrentAsset(a.category));
  
  const totalCurrentAssets = currentAssets.reduce((sum, a) => sum + (a.debit - a.credit), 0);
  const totalNonCurrentAssets = nonCurrentAssets.reduce((sum, a) => sum + (a.debit - a.credit), 0);
  const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

  // 3. Classify Liabilities (Smarter Classification)
  const liabilityAccounts = state.ledger.filter(a => a.type === AccountType.LIABILITY);
  const currentLiabilities = liabilityAccounts.filter(a => isCurrentLiability(a.category));
  const nonCurrentLiabilities = liabilityAccounts.filter(a => !isCurrentLiability(a.category));

  const totalCurrentLiabilities = currentLiabilities.reduce((sum, a) => sum + (a.credit - a.debit), 0);
  const totalNonCurrentLiabilities = nonCurrentLiabilities.reduce((sum, a) => sum + (a.credit - a.debit), 0);
  const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;

  // 4. Calculate Net Working Capital
  const netWorkingCapital = totalCurrentAssets - totalCurrentLiabilities;

  // 5. Classify Equity
  const equityAccounts = state.ledger.filter(a => a.type === AccountType.EQUITY);
  const totalEquityExclEarnings = equityAccounts.reduce((sum, a) => sum + (a.credit - a.debit), 0);
  const totalEquity = totalEquityExclEarnings + currentPeriodEarnings;

  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
        exportToPDF('balance-sheet-report', `Balance_Sheet_${state.companyName}_${state.period}`);
        setIsExporting(false);
    }, 100);
  };

  const renderGroups = (accounts: Account[], defaultCategoryName: string, invert: boolean = false) => {
    const groups = groupByCategory(accounts);
    const categories = Object.keys(groups).sort();
    
    return categories.map(cat => {
      const groupAccounts = groups[cat];
      const isDefault = cat.toLowerCase() === defaultCategoryName.toLowerCase();
      // Only show subheader if there are multiple categories OR the category isn't the default section name
      const showSubHeader = categories.length > 1 || !isDefault;

      return (
        <React.Fragment key={cat}>
          {showSubHeader && <Row name={cat} value={0} isSubHeader />}
          {groupAccounts.map(a => (
            <Row key={a.id} name={a.name} value={invert ? (a.credit - a.debit) : (a.debit - a.credit)} />
          ))}
        </React.Fragment>
      )
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
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

      <div id="balance-sheet-report" className="space-y-8">
        <PrintHeader companyName={state.companyName} reportName="Balance Sheet" period={state.period} />

        <div className="flex flex-col items-center mb-8 print:hidden">
          <h2 className="text-2xl font-bold text-slate-900">Balance Sheet</h2>
          <p className="text-slate-500 font-medium">As of {state.period}</p>
          <p className="text-slate-400 text-sm mt-1">{state.companyName}</p>
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
            {renderGroups(currentAssets, 'Current Assets')}
            <Row name="Total Current Assets" value={totalCurrentAssets} isTotal />

            <SubHeader title="Non-Current Assets" />
            {renderGroups(nonCurrentAssets, 'Non-Current Assets')}
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
            {renderGroups(currentLiabilities, 'Current Liabilities', true)}
            <Row name="Total Current Liabilities" value={totalCurrentLiabilities} isTotal />

            <SubHeader title="Non-Current Liabilities" />
            {renderGroups(nonCurrentLiabilities, 'Non-Current Liabilities', true)}
            <Row name="Total Non-Current Liabilities" value={totalNonCurrentLiabilities} isTotal />
            
            <div className="mt-4 pt-2 border-t border-slate-300 page-break-inside-avoid">
              <div className="flex justify-between font-bold text-slate-700 ml-4">
                <span>Total Liabilities</span>
                <span>{totalLiabilities.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <SectionHeader title="Equity" />
            {renderGroups(equityAccounts, 'Equity', true)}
            <Row name="Current Year Earnings" value={currentPeriodEarnings} />
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
         <AIAnalysis reportType="Balance Sheet" />
      </div>
    </div>
  );
};

export default BalanceSheet;
