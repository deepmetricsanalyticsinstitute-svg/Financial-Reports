import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Table2, 
  FileSpreadsheet, 
  Scale, 
  PieChart,
  ArrowRightLeft,
  TrendingUp,
  BookOpen,
  FileInput,
  Landmark
} from 'lucide-react';
import { useFinancials } from '../context/FinancialContext';

interface LayoutProps {
  children: React.ReactNode;
}

const SidebarItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'bg-slate-800 text-white shadow-md'
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
      }`
    }
  >
    <Icon className="w-5 h-5" />
    <span>{label}</span>
  </NavLink>
);

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { state } = useFinancials();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <div id="app-sidebar" className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500 p-2 rounded-lg">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">LedgerLens AI</h1>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" />
          <SidebarItem to="/import" icon={FileInput} label="Import Data" />
          <SidebarItem to="/trial-balance" icon={Table2} label="Trial Balance" />
          <SidebarItem to="/reconciliation" icon={Landmark} label="Bank Reconciliation" />
          
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reports</p>
          </div>
          
          <SidebarItem to="/income-statement" icon={FileSpreadsheet} label="Income Statement" />
          <SidebarItem to="/balance-sheet" icon={PieChart} label="Balance Sheet" />
          <SidebarItem to="/cash-flow" icon={ArrowRightLeft} label="Cash Flow" />
          <SidebarItem to="/equity" icon={TrendingUp} label="Changes in Equity" />
          <SidebarItem to="/notes" icon={BookOpen} label="Financial Notes" />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800 rounded-lg p-3">
            <p className="text-xs text-slate-400 uppercase font-bold mb-1">Current Entity</p>
            <p className="text-sm font-medium text-white truncate">{state.companyName}</p>
            <p className="text-xs text-emerald-400 mt-1">{state.period}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div id="app-main" className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-auto custom-scrollbar p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;