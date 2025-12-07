
import React from 'react';
import { useFinancials } from '../context/FinancialContext';
import { AccountType } from '../types';
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
  isSubTotal?: boolean;
  currency: string;
}

const Row: React.FC<RowProps> = ({ name, value, indent = false, isTotal = false, isHeader = false, isSubTotal = false, currency }) => (
  <div className={`flex justify-between py-2 border-b border-slate-50 last:border-0 
    ${isHeader ? 'font-bold text-slate-900 mt-4' : ''} 
    ${isTotal ? 'font-bold text-slate-900 border-t-2 border-slate-300 mt-2' : ''}
    ${isSubTotal ? 'font-semibold text-slate-700 border-t border-slate-200' : 'text-slate-600'} 
    page-break-inside-avoid
  `}>
    <span className={`${indent ? 'pl-8' : ''}`}>{name}</span>
    {value !== undefined && <span>{isTotal || isHeader ? currency : ''}{value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>}
  </div>
);

const CashFlowStatement: React.FC = () => {
  const { state } = useFinancials();
  const [isExporting, setIsExporting] = React.useState(false);

  // 1. Calculate Net Income
  const revenues = state.ledger.filter(a => a.type === AccountType.REVENUE);
  const expenses = state.ledger.filter(a => a.type === AccountType.EXPENSE);
  const netIncome = revenues.reduce((sum, a) => sum + (a.credit - a.debit), 0) - 
                    expenses.reduce((sum, a) => sum + (a.debit - a.credit), 0);

  // 2. Operating Activities (Indirect Method)
  const currentAssets = state.ledger.filter(a => a.type === AccountType.ASSET && a.category === 'Current Assets' && !a.name.toLowerCase().includes('cash'));
  const currentLiabilities = state.ledger.filter(a => a.type === AccountType.LIABILITY && a.category === 'Current Liabilities');

  const changesInAssets = currentAssets.map(a => ({ ...a, cashEffect: -(a.debit - a.credit) }));
  const changesInLiabilities = currentLiabilities.map(a => ({ ...a, cashEffect: (a.credit - a.debit) }));

  const netCashFromOperating = netIncome + 
    changesInAssets.reduce((sum, a) => sum + a.cashEffect, 0) + 
    changesInLiabilities.reduce((sum, a) => sum + a.cashEffect, 0);

  // 3. Investing Activities
  const nonCurrentAssets = state.ledger.filter(a => a.type === AccountType.ASSET && a.category !== 'Current Assets');
  const investingItems = nonCurrentAssets.map(a => ({ ...a, cashEffect: -(a.debit - a.credit) }));
  const netCashFromInvesting = investingItems.reduce((sum, a) => sum + a.cashEffect, 0);

  // 4. Financing Activities
  const nonCurrentLiabilities = state.ledger.filter(a => a.type === AccountType.LIABILITY && a.category !== 'Current Liabilities');
  const equityInjections = state.ledger.filter(a => a.type === AccountType.EQUITY && a.category !== 'Retained Earnings'); 
  
  const financingItems = [
    ...nonCurrentLiabilities,
    ...equityInjections
  ].map(a => ({ ...a, cashEffect: (a.credit - a.debit) }));
  
  const netCashFromFinancing = financingItems.reduce((sum, a) => sum + a.cashEffect, 0);

  const netIncreaseInCash = netCashFromOperating + netCashFromInvesting + netCashFromFinancing;

  // Validation
  const cashAccount = state.ledger.find(a => a.name.toLowerCase().includes('cash'));
  const endingCashBalance = cashAccount ? (cashAccount.debit - cashAccount.credit) : 0;
  const beginningCashBalance = endingCashBalance - netIncreaseInCash;

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
        exportToPDF('cash-flow-report', `Cash_Flow_${state.companyName}_${state.period}`);
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

      <div id="cash-flow-report" className="space-y-8">
        <PrintHeader companyName={state.companyName} reportName="Statement of Cash Flows" period={state.period} />

        <div className="flex flex-col items-center mb-8 print:hidden">
          <h2 className="text-2xl font-bold text-slate-900">Statement of Cash Flows</h2>
          <p className="text-slate-500 font-medium">For the month ended {state.period}</p>
          <p className="text-slate-400 text-sm mt-1">{state.companyName}</p>
        </div>

        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-lg print:shadow-none print:p-0 print:border-none">
          <div className="space-y-1">
            
            {/* Operating Activities */}
            <Row name="Cash flows from operating activities" isHeader currency={state.currencySign} />
            <Row name="Net Income" value={netIncome} indent currency={state.currencySign} />
            <div className="pl-8 pt-2 pb-1 text-xs text-slate-400 uppercase font-semibold">Adjustments for working capital:</div>
            {changesInAssets.map(a => (
              <Row key={a.id} name={`(Increase) in ${a.name}`} value={a.cashEffect} indent currency={state.currencySign} />
            ))}
            {changesInLiabilities.map(a => (
              <Row key={a.id} name={`Increase in ${a.name}`} value={a.cashEffect} indent currency={state.currencySign} />
            ))}
            <Row name="Net cash provided by operating activities" value={netCashFromOperating} isSubTotal currency={state.currencySign} />

            {/* Investing Activities */}
            <Row name="Cash flows from investing activities" isHeader currency={state.currencySign} />
            {investingItems.map(a => (
              <Row key={a.id} name={`Purchase of ${a.name}`} value={a.cashEffect} indent currency={state.currencySign} />
            ))}
            <Row name="Net cash used in investing activities" value={netCashFromInvesting} isSubTotal currency={state.currencySign} />

            {/* Financing Activities */}
            <Row name="Cash flows from financing activities" isHeader currency={state.currencySign} />
            {financingItems.map(a => (
              <Row key={a.id} name={`Proceeds from ${a.name}`} value={a.cashEffect} indent currency={state.currencySign} />
            ))}
            <Row name="Net cash provided by financing activities" value={netCashFromFinancing} isSubTotal currency={state.currencySign} />

            {/* Summary */}
            <div className="py-6 mt-4 page-break-inside-avoid">
              <div className="flex justify-between py-2 border-t-2 border-slate-800 font-bold text-lg">
                  <span>Net Increase in Cash</span>
                  <span>{state.currencySign}{netIncreaseInCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <Row name="Cash balance at beginning of period" value={beginningCashBalance} currency={state.currencySign} />
              <div className="flex justify-between py-4 border-t-4 double-border border-slate-900 font-bold text-xl bg-slate-50 print:bg-transparent px-4 print:px-0 rounded-lg mt-2">
                  <span>Cash balance at end of period</span>
                  <span className="text-emerald-600 print:text-black">{state.currencySign}{endingCashBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="no-print">
         <AIAnalysis reportType="Cash Flow Statement" />
      </div>
    </div>
  );
};

export default CashFlowStatement;
