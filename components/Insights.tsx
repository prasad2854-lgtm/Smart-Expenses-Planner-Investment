
import React, { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from 'recharts';
import { AppState, ExpenseCategory, ProfileData, UserType } from '../types';
import {
  PieChart as PieChartIcon,
  ChevronRight, Sparkles, Loader2, BarChart3, CalendarDays
} from 'lucide-react';
import { USER_TYPE_SUGGESTIONS, CATEGORY_COLORS } from '../constants';
import { getSmartInvestmentInsights } from '../services/geminiService';

type FilterRange = '1M' | '3M' | 'YTD' | 'ALL';
type Granularity = 'Monthly' | 'Quarterly' | 'Annually';

interface InsightsProps {
  state: AppState & ProfileData;
}

export const Insights: React.FC<InsightsProps> = ({ state }) => {
  const [filterRange, setFilterRange] = useState<FilterRange>('ALL');
  const [granularity, setGranularity] = useState<Granularity>('Monthly');
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    return state.expenses.filter(e => {
      const expenseDate = new Date(e.date);
      switch (filterRange) {
        case '1M': {
          const limit = new Date();
          limit.setMonth(now.getMonth() - 1);
          return expenseDate >= limit;
        }
        case '3M': {
          const limit = new Date();
          limit.setMonth(now.getMonth() - 3);
          return expenseDate >= limit;
        }
        case 'YTD': {
          const limit = new Date(now.getFullYear(), 0, 1);
          return expenseDate >= limit;
        }
        case 'ALL':
        default:
          return true;
      }
    });
  }, [state.expenses, filterRange]);

  const filteredIncome = useMemo(() => {
    const now = new Date();
    return state.incomeSources.filter(i => {
      const incomeDate = new Date(i.date);
      switch (filterRange) {
        case '1M': {
          const limit = new Date();
          limit.setMonth(now.getMonth() - 1);
          return incomeDate >= limit;
        }
        case '3M': {
          const limit = new Date();
          limit.setMonth(now.getMonth() - 3);
          return incomeDate >= limit;
        }
        case 'YTD': {
          const limit = new Date(now.getFullYear(), 0, 1);
          return incomeDate >= limit;
        }
        case 'ALL':
        default:
          return true;
      }
    });
  }, [state.incomeSources, filterRange]);

  const trendData = useMemo(() => {
    const dataMap: Record<string, { label: string; income: number; expense: number; sortKey: string }> = {};

    const processItem = (dateStr: string, amount: number, type: 'income' | 'expense') => {
      const d = new Date(dateStr);
      let key = '';
      let label = '';
      let sortKey = '';

      if (granularity === 'Monthly') {
        key = `${d.getFullYear()}-${d.getMonth()}`;
        label = d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
        sortKey = `${d.getFullYear()}${String(d.getMonth()).padStart(2, '0')}`;
      } else if (granularity === 'Quarterly') {
        const q = Math.floor(d.getMonth() / 3) + 1;
        key = `${d.getFullYear()}-Q${q}`;
        label = `Q${q} ${d.getFullYear()}`;
        sortKey = `${d.getFullYear()}${q}`;
      } else {
        key = `${d.getFullYear()}`;
        label = `${d.getFullYear()}`;
        sortKey = `${d.getFullYear()}`;
      }

      if (!dataMap[key]) {
        dataMap[key] = { label, income: 0, expense: 0, sortKey };
      }
      dataMap[key][type] += amount;
    };

    filteredIncome.forEach(i => processItem(i.date, i.amount, 'income'));
    filteredExpenses.forEach(e => processItem(e.date, e.amount, 'expense'));

    return Object.values(dataMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [filteredIncome, filteredExpenses, granularity]);

  const categoryData = useMemo(() => {
    return Object.values(ExpenseCategory)
      .map(cat => ({
        name: cat,
        value: filteredExpenses
          .filter(e => e.category === cat)
          .reduce((sum, e) => sum + e.amount, 0)
      })).filter(v => v.value > 0);
  }, [filteredExpenses]);

  const handleGetAiAdvice = async () => {
    setLoadingAi(true);
    try {
      const advice = await getSmartInvestmentInsights(state);
      setAiInsights(advice);
    } catch (err) {
      setAiInsights("Failed to fetch advice. Check your connection.");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-8 pb-24 text-black">
      <h2 className="text-xl font-bold">Financial Analysis</h2>

      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-200">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="text-yellow-300" size={20} />
          <h3 className="font-bold text-sm uppercase tracking-widest">SEPI Advisor</h3>
        </div>

        {!aiInsights ? (
          <div className="space-y-4">
            <p className="text-xs text-blue-100 opacity-80 leading-relaxed">
              Based on your {state.userType} profile and historical spending, SEPI Can Provide Financial Advice
            </p>
            <button
              onClick={handleGetAiAdvice}
              disabled={loadingAi}
              className="w-full py-3 bg-white text-blue-600 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2"
            >
              {loadingAi ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
              {loadingAi ? 'Analyzing Trends...' : 'Get Smart AI Advice'}
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in zoom-in duration-500">
            <div className="bg-white/10 p-4 rounded-2xl border border-white/20 whitespace-pre-wrap text-sm leading-relaxed">
              {aiInsights}
            </div>
            <button onClick={() => setAiInsights(null)} className="text-xs font-bold text-blue-200">Refresh Analysis</button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <h3 className="text-sm font-bold opacity-50 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 size={16} /> Performance Trend
          </h3>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            {(['Monthly', 'Quarterly', 'Annually'] as Granularity[]).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`px-2 py-1 text-[9px] font-black rounded-md transition-all ${granularity === g ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>



        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm h-72">
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`${state.currency}${value.toLocaleString()}`]}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                <Bar name="Income" dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={granularity === 'Annually' ? 40 : 15} />
                <Bar name="Expenses" dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={granularity === 'Annually' ? 40 : 15} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-full flex items-center justify-center italic text-slate-400">No data available for this range</div>}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold opacity-50 uppercase tracking-wider flex items-center gap-2"><PieChartIcon size={16} /> Expense Breakdown</h3>
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm h-64">
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                  {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || '#cbd5e1'} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => `${state.currency}${value.toLocaleString()}`}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-full flex items-center justify-center italic text-slate-400">No expenses in this period</div>}
        </div>
      </div>
    </div>
  );
};
