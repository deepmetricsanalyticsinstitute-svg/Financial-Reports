import React from 'react';

interface PrintHeaderProps {
  companyName: string;
  reportName: string;
  period: string;
}

const PrintHeader: React.FC<PrintHeaderProps> = ({ companyName, reportName, period }) => {
  return (
    <div className="hidden print:block mb-8 border-b-2 border-slate-800 pb-4">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{companyName}</h1>
          <h2 className="text-xl text-slate-600 mt-1 font-medium">{reportName}</h2>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-900">{period}</p>
          <p className="text-xs text-slate-500 mt-1">Generated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
};

export default PrintHeader;