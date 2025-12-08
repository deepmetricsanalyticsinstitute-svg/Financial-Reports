
import React from 'react';
import { useFinancials } from '../context/FinancialContext';
import { AccountType } from '../types';
import AIAnalysis from '../components/AIAnalysis';
import PrintHeader from '../components/PrintHeader';
import { exportToPDF } from '../utils/printHelper';
import { Download, Loader2 } from 'lucide-react';

const ChangesInEquity: React.FC = () => {
  const { state } = useFinancials();
  const [isExporting, setIsExporting] = React.useState(false);

  // 1. Calculate Net Income
  const revenues = state.ledger.filter(a => a.type === AccountType.REVENUE);
  const expenses = state.ledger.filter(a => a.type === AccountType.EXPENSE);
  const netIncome = revenues.reduce((sum, a) => sum + (a.credit - a.debit), 0) - 
                    expenses.reduce((sum, a) => sum + (a.debit - a.credit), 0);

  // 2. Identify Equity Accounts
  // We use flexible matching to find standard equity accounts
  const capitalAccount = state.ledger.find(a => 
    a.type === AccountType.EQUITY && (a.name.toLowerCase().includes("capital") || a.name.toLowerCase().includes("share"))
  );
  
  const retainedEarningsAccount = state.ledger.find(a => 
    a.type === AccountType.EQUITY && (a.name.toLowerCase().includes("retained") || a.name.toLowerCase().includes("earnings"))
  );

  // Look for Dividends or Drawings (Equity accounts that typically have a Debit balance)
  const dividendsAccount = state.ledger.find(a => 
    a.type === AccountType.EQUITY && 
    (a.name.toLowerCase().includes("dividend") || a.name.toLowerCase().includes("drawing"))
  );
  
  // Balances
  const capitalBalance = capitalAccount ? (capitalAccount.credit - capitalAccount.debit) : 0;
  
  // Assume the ledger balance for Retained Earnings is the Opening Balance for the period
  const openingRetainedEarnings = retainedEarningsAccount ? (retainedEarningsAccount.credit - retainedEarningsAccount.debit) : 0;
  
  // Dividends reduce equity, so we treat the debit balance as the positive amount of dividends paid
  const dividends = dividendsAccount ? (dividendsAccount.debit - dividendsAccount.credit) : 0; 

  // Calculation: Closing RE = Opening RE + Net Income - Dividends
  const closingRetainedEarnings = openingRetainedEarnings + netIncome - dividends;
  
  const totalEquityOpening = capitalBalance + openingRetainedEarnings;
  const totalEquityEnding = capitalBalance + closingRetainedEarnings;

  const cs = state.currencySign;

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
        exportToPDF('equity-report', `Equity_Changes_${state.companyName}_${state.period}`, true);
        setIsExporting(false);
    }, 100);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
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

      <div id="equity-report" className="space-y-8">
        <PrintHeader companyName={state.companyName} reportName="Statement of Changes in Equity" period={state.period} />

        <div className="flex flex-col items-center mb-8 print:hidden">
          <h2 className="text-2xl font-bold text-slate-900">Statement of Changes in Equity</h2>
          <p className="text-slate-500 font-medium">For the month ended {state.period}</p>
          <p className="text-slate-400 text-sm mt-1">{state.companyName}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden print:shadow-none print:border-slate-300">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-900 font-bold border-b border-slate-200 print:bg-white print:border-b-2 print:border-slate-800">
                <tr>
                  <th className="px-6 py-4"></th>
                  <th className="px-6 py-4 text-right">Share Capital</th>
                  <th className="px-6 py-4 text-right">Retained Earnings</th>
                  <th className="px-6 py-4 text-right bg-slate-100 print:bg-transparent">Total Equity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-6 py-4 font-medium text-slate-700">Balance at beginning of period</td>
                  <td className="px-6 py-4 text-right">{cs}{capitalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right">{cs}{openingRetainedEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right font-medium bg-slate-50 print:bg-transparent">{cs}{totalEquityOpening.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-slate-700">Net Income for the period</td>
                  <td className="px-6 py-4 text-right">-</td>
                  <td className={`px-6 py-4 text-right ${netIncome >= 0 ? 'text-emerald-600' : 'text-rose-600'} print:text-black`}>
                    {cs}{netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className={`px-6 py-4 text-right font-medium bg-slate-50 print:bg-transparent ${netIncome >= 0 ? 'text-emerald-600' : 'text-rose-600'} print:text-black`}>
                    {cs}{netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-slate-700">Dividends / Drawings</td>
                  <td className="px-6 py-4 text-right">-</td>
                  <td className="px-6 py-4 text-right text-rose-600 print:text-black">
                    {dividends !== 0 ? `(${cs}${dividends.toLocaleString('en-US', { minimumFractionDigits: 2 })})` : '-'}
                  </td>
                  <td className="px-6 py-4 text-right font-medium bg-slate-50 print:bg-transparent text-rose-600 print:text-black">
                    {dividends !== 0 ? `(${cs}${dividends.toLocaleString('en-US', { minimumFractionDigits: 2 })})` : '-'}
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-300 print:bg-transparent print:border-t-2 print:border-slate-800">
                <tr>
                  <td className="px-6 py-4">Balance at end of period</td>
                  <td className="px-6 py-4 text-right">{cs}{capitalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right">{cs}{closingRetainedEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right bg-slate-100 print:bg-transparent">{cs}{totalEquityEnding.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 print:hidden">
          <p><strong>Note:</strong> This statement assumes the ledger balance for "Retained Earnings" represents the opening balance. Net Income is calculated from the current Income Statement and added to this balance, while Dividends/Drawings are subtracted.</p>
        </div>
      </div>

      <div className="no-print">
         <AIAnalysis reportType="Statement of Changes in Equity" />
      </div>
    </div>
  );
};

export default ChangesInEquity;
