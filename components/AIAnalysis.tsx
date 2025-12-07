
import React, { useState } from 'react';
import { Bot, Sparkles, Loader2, ChevronRight } from 'lucide-react';
import { analyzeFinancials } from '../services/geminiService';
import { useFinancials } from '../context/FinancialContext';
import ReactMarkdown from 'react-markdown';

interface AIAnalysisProps {
  reportType: string;
}

const AIAnalysis: React.FC<AIAnalysisProps> = ({ reportType }) => {
  const { state } = useFinancials();
  const [analysis, setAnalysis] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    setIsOpen(true);
    const result = await analyzeFinancials(state.ledger, reportType, state.companyName, state.period);
    setAnalysis(result);
    setLoading(false);
  };

  return (
    <div className="mt-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-100 p-2 rounded-full">
            <Sparkles className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">AI Financial Analyst</h3>
            <p className="text-xs text-slate-500">Powered by Gemini 2.5</p>
          </div>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
            </>
          ) : (
            <>
              <Bot className="w-4 h-4" /> Analyze {reportType}
            </>
          )}
        </button>
      </div>
      
      {isOpen && (
        <div className="p-6 bg-white animate-in fade-in slide-in-from-top-4 duration-300">
           {!analysis && loading ? (
             <div className="flex flex-col items-center justify-center py-8 text-slate-400">
               <Loader2 className="w-8 h-8 animate-spin mb-2" />
               <p className="text-sm">Reading financial data...</p>
             </div>
           ) : (
            <div className="prose prose-sm prose-slate max-w-none">
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
           )}
        </div>
      )}
    </div>
  );
};

export default AIAnalysis;
