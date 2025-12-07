
import React from 'react';
import { useFinancials } from '../context/FinancialContext';
import { StickyNote, Download, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import PrintHeader from '../components/PrintHeader';
import { exportToPDF } from '../utils/printHelper';

const FinancialNotes: React.FC = () => {
  const { state } = useFinancials();
  const [isExporting, setIsExporting] = React.useState(false);

  // Filter accounts that actually have notes
  const accountsWithNotes = state.ledger.filter(a => a.note && a.note.trim().length > 0)
    .sort((a,b) => a.code.localeCompare(b.code));

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
        exportToPDF('notes-report', `Financial_Notes_${state.companyName}_${state.period}`);
        setIsExporting(false);
    }, 100);
  };

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

      <div id="notes-report" className="space-y-8">
        <PrintHeader companyName={state.companyName} reportName="Notes to Financial Statements" period={state.period} />

        <div className="text-center mb-10 print:hidden">
          <h2 className="text-2xl font-bold text-slate-900">Notes to the Financial Statements</h2>
          <p className="text-slate-500 font-medium">For the month ended {state.period}</p>
          <p className="text-slate-400 text-sm mt-1">{state.companyName}</p>
        </div>

        {accountsWithNotes.length > 0 ? (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0 page-break-inside-avoid">
              <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">1. Significant Accounting Policies</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                <strong>Basis of Preparation:</strong> These financial statements have been prepared in accordance with generally accepted accounting principles (GAAP). 
                The historical cost convention has been applied.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                <strong>Revenue Recognition:</strong> Revenue is recognized when goods are delivered or services are rendered to customers.
              </p>
            </div>

            {accountsWithNotes.map((account, index) => (
              <div key={account.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-shadow hover:shadow-md print:shadow-none print:border-slate-300 print:p-4 page-break-inside-avoid">
                <div className="flex items-start gap-4">
                  <div className="bg-indigo-50 p-2 rounded-lg print:bg-transparent print:p-0">
                    <span className="font-bold text-indigo-600 text-lg font-mono print:text-black">
                      {index + 2}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-slate-800 text-lg">
                        {account.name} <span className="text-slate-400 font-normal text-sm ml-2">({account.code})</span>
                      </h4>
                      <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-600 rounded print:border print:border-slate-300">
                        {account.category}
                      </span>
                    </div>
                    <div className="prose prose-sm prose-slate max-w-none text-slate-600">
                      <ReactMarkdown>{account.note || ''}</ReactMarkdown>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-50 flex gap-6 text-sm">
                       <div>
                          <span className="text-slate-400 mr-2">Debit:</span>
                          <span className="font-mono">{account.debit > 0 ? `${state.currencySign}${account.debit.toLocaleString()}` : '-'}</span>
                       </div>
                       <div>
                          <span className="text-slate-400 mr-2">Credit:</span>
                          <span className="font-mono">{account.credit > 0 ? `${state.currencySign}${account.credit.toLocaleString()}` : '-'}</span>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-12 rounded-xl border border-slate-200 border-dashed text-center print:border-solid">
            <div className="mx-auto bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mb-4 print:hidden">
               <StickyNote className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No Notes Available</h3>
            <p className="text-slate-500 mt-2 max-w-md mx-auto print:hidden">
              You haven't added any notes to your accounts yet. Go to the <strong>Trial Balance</strong> page and click the note icon next to an account to add details.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialNotes;
