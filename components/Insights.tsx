import React, { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, AreaChart, Area
} from 'recharts';
import { AppState, ExpenseCategory, ProfileData, UserType, Goal } from '../types';
import {
  TrendingDown, TrendingUp, DollarSign, Target as TargetIcon, Search,
  PieChart as PieChartIcon,
  ChevronRight, Sparkles, Loader2, BarChart3, CalendarDays, ShoppingBag, Target, AlertTriangle, Send
} from 'lucide-react';
import { USER_TYPE_SUGGESTIONS, CATEGORY_COLORS, PROFILE_ALLOWED_CATEGORIES } from '../constants';
import { getSmartInvestmentInsights, getLeftoverAllocationAdvice, askFinancialQuestion } from '../services/geminiService';
import { detectSubscriptions } from '../utils/financeCalculations';
import { GoalList } from './GoalList';

type FilterRange = '1M' | '3M' | 'YTD' | 'ALL';
type Granularity = 'Monthly' | 'Quarterly' | 'Annually';

interface InsightsProps {
  state: AppState & ProfileData;
  onAddGoal?: (goal: Omit<Goal, 'id'>) => void;
  onDeleteGoal?: (id: string) => void;
}

export const Insights: React.FC<InsightsProps> = ({ state, onAddGoal, onDeleteGoal }) => {
  const [filterRange, setFilterRange] = useState<FilterRange>('ALL');
  const [granularity, setGranularity] = useState<Granularity>('Monthly');
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const [userQuestion, setUserQuestion] = useState('');
  const [chatAnswer, setChatAnswer] = useState<string | null>(null);
  const [loadingChat, setLoadingChat] = useState(false);

  const [leftoverAdvice, setLeftoverAdvice] = useState<string | null>(null);
  const [loadingLeftover, setLoadingLeftover] = useState(false);
  const [leftoverResult, setLeftoverResult] = useState<string | null>(null);

  const subscriptions = useMemo(() => detectSubscriptions(state.expenses), [state.expenses]);

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

  const growthData = useMemo(() => {
    const dataMap: Record<string, { income: number; expense: number }> = {};

    state.incomeSources.forEach(i => {
      const date = new Date(i.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!dataMap[key]) dataMap[key] = { income: 0, expense: 0 };
      dataMap[key].income += i.amount;
    });

    state.expenses.forEach(e => {

      const date = new Date(e.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!dataMap[key]) dataMap[key] = { income: 0, expense: 0 };
      dataMap[key].expense += e.amount;
    });

    const sortedKeys = Object.keys(dataMap).sort();
    let cumulativeBalance = 0;

    const results = sortedKeys.map(key => {
      const { income, expense } = dataMap[key];
      cumulativeBalance += (income - expense);
      const [year, month] = key.split('-');
      const label = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(undefined, { month: 'short' });
      return { month: label, balance: cumulativeBalance };
    });

    if (results.length === 0) return [{ month: 'N/A', balance: 0 }];
    if (results.length === 1) return [{ month: 'Start', balance: 0 }, ...results];
    return results;
  }, [state.incomeSources, state.expenses]);

  const categoryData = useMemo(() => {
    return PROFILE_ALLOWED_CATEGORIES[state.userType || UserType.EMPLOYEE]
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

  const handleEndOfMonth = async () => {
    setLoadingLeftover(true);
    try {
      const totalIncome = state.incomeSources.reduce((sum, i) => sum + i.amount, 0);
      const totalExpenses = state.expenses.reduce((sum, e) => sum + e.amount, 0);
      const remaining = totalIncome - totalExpenses;
      const res = await getLeftoverAllocationAdvice(remaining, state, state.currency);
      setLeftoverAdvice(res);
    } catch {
      setLeftoverResult('*Mock Leftover Advice*\nTransfer your entire surplus to Emergency Savings instantly!');
      setLoadingLeftover(false);
    }
  };

  const handleCustomQuestion = async () => {
    if (!userQuestion.trim()) return;
    setLoadingChat(true);
    const answer = await askFinancialQuestion(userQuestion, state);
    setChatAnswer(answer);
    setLoadingChat(false);
  };

  return (
    <div className="space-y-8 pb-24 text-black">
      <h2 className="text-xl font-bold">Financial Analysis</h2>

      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-200">
        <div className="flex items-center gap-2 mb-4">
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
              {loadingAi && <Loader2 className="animate-spin" size={18} />}
              {loadingAi ? 'Analyzing Trends...' : 'Get Advice From SEPI Advisor'}
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

      {/* Interactive Chat Block */}
      <div className="bg-white rounded-3xl p-6 text-slate-900 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-bold text-sm uppercase tracking-widest text-slate-800">Ask SEPI A Question</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">Have a specific financial question? Ask SEPI directly!</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. How can I save for a car faster?"
            className="flex-1 bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-blue-500"
            value={userQuestion}
            onChange={(e) => setUserQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomQuestion()}
          />
          <button
            onClick={handleCustomQuestion}
            disabled={loadingChat || !userQuestion.trim()}
            className="px-5 bg-blue-600 text-white rounded-xl font-bold shadow-md disabled:opacity-50 flex items-center justify-center hover:bg-blue-700 transition"
          >
            {loadingChat ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          </button>
        </div>
        {chatAnswer && (
          <div className="mt-6 space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 shadow-inner">
              {chatAnswer}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* End of Month Allocator */}
        <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 text-emerald-200 opacity-20"><Target size={64} /></div>
          <h3 className="font-bold text-sm uppercase tracking-widest text-emerald-800 mb-2 relative z-10">Leftover Allocator</h3>
          <p className="text-xs text-emerald-600 mb-4 relative z-10">Distribute your remaining cash flow safely based on your goals.</p>
          {!leftoverAdvice ? (
            <button
              onClick={handleEndOfMonth}
              disabled={loadingLeftover}
              className="w-full py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-md disabled:opacity-50 flex justify-center items-center gap-2 relative z-10"
            >
              {loadingLeftover ? <Loader2 className="animate-spin" size={16} /> : "Run Review"}
            </button>
          ) : (
            <div className="space-y-2 relative z-10">
              <div className="text-sm font-medium text-emerald-900 bg-white/50 p-3 rounded-xl">{leftoverAdvice}</div>
              <button onClick={() => setLeftoverAdvice(null)} className="text-[10px] font-bold text-emerald-600">Reset</button>
            </div>
          )}
        </div>

        {/* Subscription Graveyard */}
        <div className="bg-rose-50 rounded-3xl p-6 border border-rose-100">
          <h3 className="font-bold text-sm uppercase tracking-widest text-rose-800 mb-2 flex items-center gap-2">
            <AlertTriangle size={16} /> Recurring Flags
          </h3>
          <p className="text-xs text-rose-600 mb-4">We detected identical transactions that might be subscriptions.</p>
          {subscriptions.length > 0 ? (
            <div className="space-y-2">
              {subscriptions.map((s, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg text-sm border border-rose-100 shadow-sm">
                  <span className="font-semibold text-rose-900">{s.name}</span>
                  <div className="text-right">
                    <span className="block font-bold text-rose-700">{state.currency}{s.amount}</span>
                    <span className="text-[10px] text-slate-400">{s.count} occurrences</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs italic text-rose-400/70">No repeating transactions found.</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Growth Analysis */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <BarChart3 size={18} />
              </div>
              <h3 className="text-sm font-bold text-black uppercase tracking-wider">Growth Analysis</h3>
            </div>
            <span className={`text-xs font-bold ${(growthData[growthData.length - 1]?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(growthData[growthData.length - 1]?.balance || 0) >= 0 ? '+' : ''}{state.currency}{(growthData[growthData.length - 1]?.balance || 0).toLocaleString()} Total
            </span>
          </div>

          <div className="h-48 w-full -mx-2 -mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }} dy={10} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  formatter={(value: number) => [`${state.currency}${value.toLocaleString()}`, 'Balance']}
                />
                <Area type="monotone" dataKey="balance" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" animationDuration={1500} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
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
        <h3 className="text-sm font-bold opacity-50 uppercase tracking-wider flex items-center gap-2"><PieChartIcon size={16} /> Expenses by Category</h3>
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
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-full flex items-center justify-center italic text-slate-400">No expenses in this period</div>}
        </div>
      </div>

      {onAddGoal && onDeleteGoal && (
        <div className="pt-2">
          <GoalList state={state} onAdd={onAddGoal} onDelete={onDeleteGoal} />
        </div>
      )}
    </div >
  );
};
