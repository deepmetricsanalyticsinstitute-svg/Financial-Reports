
import React, { useState } from 'react';
import { useFinancials } from '../context/FinancialContext';
import { AccountType } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Wallet, Building2, Settings, X, Plus } from 'lucide-react';

const MetricCard = ({ title, value, subtext, icon: Icon, colorClass, currency }: any) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">MAR 2024</span>
    </div>
    <h3 className="text-slate-500 text-sm font-medium mb-1">{title}</h3>
    <p className="text-2xl font-bold text-slate-900">{currency}{value}</p>
    <p className="text-xs text-slate-400 mt-2">{subtext}</p>
  </div>
);

const Dashboard: React.FC = () => {
  const { state, updateCompanyName, updateBaseCurrency, updatePeriod, updateExchangeRate, addCurrency, updateCurrencySign } = useFinancials();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [showRateModal, setShowRateModal] = useState(false);
  const [newCurrency, setNewCurrency] = useState({ code: '', name: '', symbol: '', rate: 1.0 });

  // Calculations
  const totalRevenue = state.ledger
    .filter(a => a.type === AccountType.REVENUE)
    .reduce((sum, a) => sum + (a.credit - a.debit), 0);
  
  const expenseAccounts = state.ledger
    .filter(a => a.type === AccountType.EXPENSE)
    .sort((a, b) => (b.debit - b.credit) - (a.debit - a.credit));

  const totalExpenses = expenseAccounts
    .reduce((sum, a) => sum + (a.debit - a.credit), 0);
  
  const netIncome = totalRevenue - totalExpenses;
  
  const totalAssets = state.ledger
    .filter(a => a.type === AccountType.ASSET)
    .reduce((sum, a) => sum + (a.debit - a.credit), 0);

  const totalLiabilities = state.ledger
    .filter(a => a.type === AccountType.LIABILITY)
    .reduce((sum, a) => sum + (a.credit - a.debit), 0);

  // Chart Data
  const incomeData = [
    { name: 'Revenue', amount: totalRevenue },
    { name: 'Expenses', amount: totalExpenses },
    { name: 'Net Income', amount: netIncome }
  ];

  const expenseBreakdown = expenseAccounts.map(a => ({ 
    id: a.id,
    name: a.name, 
    value: a.debit - a.credit,
    code: a.code,
    category: a.category
  }));
  
  const COLORS = ['#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981', '#f59e0b'];

  const handleAddCurrency = () => {
    if (newCurrency.code && newCurrency.name) {
      addCurrency({
        ...newCurrency,
        code: newCurrency.code.toUpperCase(),
        symbol: newCurrency.symbol || '$'
      });
      setNewCurrency({ code: '', name: '', symbol: '', rate: 1.0 });
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Building2 className="w-8 h-8 text-slate-700" />
            {state.companyName}
          </h2>
          <p className="text-slate-500 mt-1">Financial Dashboard &bull; {state.period}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-end">
           <div className="w-16 sm:w-20">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                Sign
              </label>
              <input
                type="text"
                value={state.currencySign}
                onChange={(e) => updateCurrencySign(e.target.value)}
                className="w-full px-2 py-2 bg-white border border-slate-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center font-bold"
              />
           </div>
           <div className="w-full sm:w-32">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
              Base Currency
            </label>
            <div className="relative">
              <select
                value={state.baseCurrency}
                onChange={(e) => updateBaseCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-bold appearance-none"
              >
                {state.currencies.map(c => (
                  <option key={c.code} value={c.code}>{c.code}</option>
                ))}
              </select>
              <button 
                onClick={() => setShowRateModal(true)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-full"
                title="Manage Currencies"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="w-full sm:w-48">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
              Reporting Date
            </label>
            <input
              type="text"
              value={state.period}
              onChange={(e) => updatePeriod(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="e.g. March 31, 2024"
            />
          </div>
          <div className="w-full sm:w-64">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
              Company Name
            </label>
            <input
              type="text"
              value={state.companyName}
              onChange={(e) => updateCompanyName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="Enter company name..."
            />
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Net Income" 
          value={netIncome.toLocaleString()} 
          subtext={netIncome > 0 ? "+12% vs last month" : "-5% vs last month"}
          icon={TrendingUp}
          colorClass="bg-emerald-500 text-emerald-500"
          currency={state.currencySign}
        />
        <MetricCard 
          title="Total Revenue" 
          value={totalRevenue.toLocaleString()} 
          subtext="Based on invoiced sales"
          icon={DollarSign}
          colorClass="bg-blue-500 text-blue-500"
          currency={state.currencySign}
        />
        <MetricCard 
          title="Total Assets" 
          value={totalAssets.toLocaleString()} 
          subtext="Current & Non-Current"
          icon={Wallet}
          colorClass="bg-indigo-500 text-indigo-500"
          currency={state.currencySign}
        />
        <MetricCard 
          title="Total Expenses" 
          value={totalExpenses.toLocaleString()} 
          subtext="Operating costs"
          icon={TrendingDown}
          colorClass="bg-rose-500 text-rose-500"
          currency={state.currencySign}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-8">
        {/* Income Overview Bar Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[400px]">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Income Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={incomeData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
              <Tooltip 
                cursor={{fill: '#f8fafc'}}
                formatter={(value: number) => `${state.currencySign}${value.toLocaleString()}`}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={40}>
                 {incomeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#ef4444' : '#6366f1'} />
                  ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Expense Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <h3 className="text-lg font-semibold text-slate-900">Expense Breakdown Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-3 w-32">Code</th>
                <th className="px-6 py-3">Account Name</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-right w-32">% Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenseBreakdown.map((item, index) => {
                 const percentage = totalExpenses > 0 ? (item.value / totalExpenses) * 100 : 0;
                 const isActive = activeIndex === index;
                 return (
                  <tr 
                    key={item.id} 
                    className={`transition-all duration-200 cursor-pointer ${
                      isActive ? 'bg-indigo-50 shadow-inner' : 'hover:bg-slate-50'
                    }`}
                    onClick={() => setActiveIndex(isActive ? null : index)}
                  >
                    <td className="px-6 py-4 font-mono text-slate-500">{item.code}</td>
                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                      <div 
                        className={`w-3 h-3 rounded-full flex-shrink-0 transition-transform ${isActive ? 'scale-125 ring-2 ring-offset-1 ring-indigo-200' : ''}`} 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      {item.name}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{item.category}</td>
                    <td className="px-6 py-4 text-right font-medium text-slate-700">
                      {state.currencySign}{item.value.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500">
                      {percentage.toFixed(1)}%
                    </td>
                  </tr>
                 );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Currency Management Modal */}
      {showRateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-900">Currency Management</h3>
                <button onClick={() => setShowRateModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
             </div>
             <div className="p-6">
                <p className="text-sm text-slate-500 mb-4 bg-blue-50 text-blue-700 p-3 rounded-lg">
                  Manage your available currencies. Exchange rates are relative to the current base currency ({state.baseCurrency}).
                </p>
                
                {/* Existing Currencies List */}
                <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-2 mb-6">
                  {state.currencies.map(curr => (
                    <div key={curr.code} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg bg-white">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-600">
                           {curr.symbol}
                         </div>
                         <div>
                            <div className="font-bold text-slate-800">{curr.code}</div>
                            <div className="text-xs text-slate-400">{curr.name}</div>
                         </div>
                       </div>
                       {curr.code !== state.baseCurrency ? (
                         <div className="flex items-center gap-2">
                           <span className="text-xs text-slate-400">1 {curr.code} = </span>
                           <input 
                             type="number"
                             step="0.0001"
                             value={curr.rate}
                             onChange={(e) => updateExchangeRate(curr.code, parseFloat(e.target.value))}
                             className="w-20 px-2 py-1 text-right border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                           />
                           <span className="text-xs font-bold text-slate-700">{state.baseCurrency}</span>
                         </div>
                       ) : (
                         <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Base Currency</span>
                       )}
                    </div>
                  ))}
                </div>

                {/* Add New Currency Form */}
                <div className="pt-6 border-t border-slate-100">
                   <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                     <Plus className="w-4 h-4 text-indigo-600" /> Add Custom Currency
                   </h4>
                   <div className="grid grid-cols-12 gap-3">
                     <div className="col-span-3">
                       <input 
                         placeholder="Code (e.g. ZAR)" 
                         value={newCurrency.code}
                         onChange={e => setNewCurrency({...newCurrency, code: e.target.value})}
                         className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 uppercase"
                         maxLength={3}
                       />
                     </div>
                     <div className="col-span-3">
                       <input 
                         placeholder="Sym (e.g. R)" 
                         value={newCurrency.symbol}
                         onChange={e => setNewCurrency({...newCurrency, symbol: e.target.value})}
                         className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500"
                       />
                     </div>
                     <div className="col-span-6 flex gap-2">
                       <input 
                         placeholder="Name (e.g. South African Rand)" 
                         value={newCurrency.name}
                         onChange={e => setNewCurrency({...newCurrency, name: e.target.value})}
                         className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500"
                       />
                       <button 
                         onClick={handleAddCurrency}
                         disabled={!newCurrency.code || !newCurrency.name}
                         className="px-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 text-sm font-medium"
                       >
                         Add
                       </button>
                     </div>
                   </div>
                </div>

                <div className="mt-6 flex justify-end">
                   <button 
                     onClick={() => setShowRateModal(false)}
                     className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                   >
                     Done
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
