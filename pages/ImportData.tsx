
import React, { useState, useRef } from 'react';
import { useFinancials } from '../context/FinancialContext';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileSpreadsheet, FileText, Download, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { parseCSVFile, generateTemplate } from '../utils/csvHelpers';
import { Account, Transaction } from '../types';

const ImportData: React.FC = () => {
  const { importLedger, state } = useFinancials();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [mode, setMode] = useState<'tb' | 'gl'>('tb');
  const [file, setFile] = useState<File | null>(null);
  const [previewAccounts, setPreviewAccounts] = useState<Account[]>([]);
  const [previewTransactions, setPreviewTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileCurrency, setFileCurrency] = useState<string>(state.baseCurrency);

  const handleDownloadTemplate = () => {
    const csvContent = generateTemplate(mode);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = mode === 'gl' ? 'transaction_template.csv' : 'trial_balance_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setError(null);
    setLoading(true);

    try {
      // Parse file
      const { accounts, transactions } = await parseCSVFile(selectedFile, mode);
      
      // Apply Currency Conversion if necessary
      if (fileCurrency !== state.baseCurrency) {
        const currency = state.currencies.find(c => c.code === fileCurrency);
        const rate = currency ? currency.rate : 1.0;

        const convertedAccounts = accounts.map(a => ({
          ...a,
          debit: a.debit * rate,
          credit: a.credit * rate,
          note: a.note ? `${a.note} (Imported from ${fileCurrency} @ ${rate})` : `(Imported from ${fileCurrency} @ ${rate})`
        }));
        
        const convertedTransactions = transactions.map(t => ({
          ...t,
          amount: t.amount * rate,
          originalAmount: t.amount,
          originalCurrency: fileCurrency,
          exchangeRate: rate
        }));
        
        setPreviewAccounts(convertedAccounts);
        setPreviewTransactions(convertedTransactions);
      } else {
        setPreviewAccounts(accounts);
        setPreviewTransactions(transactions);
      }
    } catch (err: any) {
      setError(err.message || "Failed to parse file.");
      setPreviewAccounts([]);
      setPreviewTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    if (previewAccounts.length > 0) {
      importLedger(previewAccounts, previewTransactions);
      navigate('/trial-balance');
    }
  };

  const totals = previewAccounts.reduce((acc, curr) => ({
    debit: acc.debit + curr.debit,
    credit: acc.credit + curr.credit
  }), { debit: 0, credit: 0 });

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Import Financial Data</h2>
        <p className="text-slate-500 mt-1">Upload your financial records to generate reports.</p>
      </div>

      {/* Mode Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => { setMode('tb'); setFile(null); setPreviewAccounts([]); setPreviewTransactions([]); setError(null); }}
          className={`p-6 rounded-xl border-2 text-left transition-all ${
            mode === 'tb' 
              ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' 
              : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${mode === 'tb' ? 'bg-indigo-200' : 'bg-slate-100'}`}>
              <FileSpreadsheet className={`w-6 h-6 ${mode === 'tb' ? 'text-indigo-700' : 'text-slate-500'}`} />
            </div>
            <h3 className={`font-bold ${mode === 'tb' ? 'text-indigo-900' : 'text-slate-900'}`}>Trial Balance</h3>
          </div>
          <p className="text-sm text-slate-600">
            Upload a summary list of account balances. Best for month-end reporting when you already have final figures.
          </p>
        </button>

        <button
          onClick={() => { setMode('gl'); setFile(null); setPreviewAccounts([]); setPreviewTransactions([]); setError(null); }}
          className={`p-6 rounded-xl border-2 text-left transition-all ${
            mode === 'gl' 
              ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' 
              : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${mode === 'gl' ? 'bg-indigo-200' : 'bg-slate-100'}`}>
              <FileText className={`w-6 h-6 ${mode === 'gl' ? 'text-indigo-700' : 'text-slate-500'}`} />
            </div>
            <h3 className={`font-bold ${mode === 'gl' ? 'text-indigo-900' : 'text-slate-900'}`}>Transaction List</h3>
          </div>
          <p className="text-sm text-slate-600">
            Upload a list of transactions (General Ledger). The app will aggregate debits and credits by account code automatically.
          </p>
        </button>
      </div>

      {/* Upload Section */}
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Upload CSV File</h3>
          <button 
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            <Download className="w-4 h-4" /> Download Template
          </button>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">File Currency</label>
          <select
            value={fileCurrency}
            onChange={(e) => setFileCurrency(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
             {state.currencies.map(c => (
               <option key={c.code} value={c.code}>{c.code} ({c.symbol}) - Rate: {c.rate}</option>
             ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">If the file currency differs from your base reporting currency ({state.baseCurrency}), amounts will be converted automatically.</p>
        </div>

        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 rounded-lg p-10 text-center cursor-pointer hover:bg-slate-50 hover:border-indigo-400 transition-colors"
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".csv" 
            className="hidden" 
          />
          <div className="mx-auto bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <UploadCloud className="w-8 h-8 text-indigo-600" />
          </div>
          <h4 className="text-lg font-medium text-slate-900">
            {file ? file.name : "Click to upload your data file"}
          </h4>
          <p className="text-sm text-slate-500 mt-2">
            Supports .csv files only
          </p>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-3 text-rose-700">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
      </div>

      {/* Preview Section */}
      {previewAccounts.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Import Preview</h3>
              <p className="text-sm text-slate-500">
                Found {previewAccounts.length} accounts. Amounts shown in {state.baseCurrency}.
                <br/>
                <span className="font-medium text-slate-700">Total Debit: {state.currencySign}{totals.debit.toLocaleString()}</span> | 
                <span className="font-medium text-slate-700">Total Credit: {state.currencySign}{totals.credit.toLocaleString()}</span>
              </p>
            </div>
            <button
              onClick={handleImport}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Process & Import Data <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="overflow-x-auto max-h-80 custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0">
                <tr>
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3 text-right">Debit</th>
                  <th className="px-6 py-3 text-right">Credit</th>
                  <th className="px-6 py-3 w-48">Note/Desc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-mono text-slate-500">{acc.code}</td>
                    <td className="px-6 py-3 font-medium text-slate-900">{acc.name}</td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                        {acc.type}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-500">{acc.category}</td>
                    <td className="px-6 py-3 text-right text-slate-700">{state.currencySign}{acc.debit.toLocaleString()}</td>
                    <td className="px-6 py-3 text-right text-slate-700">{state.currencySign}{acc.credit.toLocaleString()}</td>
                    <td className="px-6 py-3 text-xs text-slate-500 truncate max-w-[200px]" title={acc.note}>
                      {acc.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportData;
