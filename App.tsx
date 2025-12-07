import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import TrialBalance from './pages/TrialBalance';
import ImportData from './pages/ImportData';
import IncomeStatement from './pages/IncomeStatement';
import BalanceSheet from './pages/BalanceSheet';
import CashFlowStatement from './pages/CashFlowStatement';
import ChangesInEquity from './pages/ChangesInEquity';
import FinancialNotes from './pages/FinancialNotes';
import BankReconciliation from './pages/BankReconciliation';
import { FinancialProvider } from './context/FinancialContext';

function App() {
  return (
    <FinancialProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/import" element={<ImportData />} />
            <Route path="/trial-balance" element={<TrialBalance />} />
            <Route path="/reconciliation" element={<BankReconciliation />} />
            <Route path="/income-statement" element={<IncomeStatement />} />
            <Route path="/balance-sheet" element={<BalanceSheet />} />
            <Route path="/cash-flow" element={<CashFlowStatement />} />
            <Route path="/equity" element={<ChangesInEquity />} />
            <Route path="/notes" element={<FinancialNotes />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </FinancialProvider>
  );
}

export default App;