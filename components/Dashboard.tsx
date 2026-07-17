
import React, { useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  AreaChart, Area, CartesianGrid
} from 'recharts';
import { AppState, ExpenseCategory, UserType, ProfileData } from '../types';
import { CATEGORY_COLORS } from '../constants';
import { TrendingUp, TrendingDown, Landmark, ShieldCheck, Calculator, LineChart as ChartIcon, RotateCcw } from 'lucide-react';

interface DashboardProps {
  state: AppState & ProfileData;
  onUpdate: (updates: Partial<AppState>) => void;
  onRefresh?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ state, onUpdate, onRefresh }) => {
  const isHomeOwner = !!state.hasOwnHouse;

  // Filter expenses based on housing status for a clean view
  const activeExpenses = useMemo(() => {
    if (!isHomeOwner) return state.expenses;
    return state.expenses.filter(e => e.category !== ExpenseCategory.RENT);
  }, [state.expenses, isHomeOwner]);

  const totalIncome = state.incomeSources.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = activeExpenses.reduce((sum, e) => sum + e.amount, 0);
  const balance = totalIncome - totalExpenses;

  const expenseByCategory = Object.values(ExpenseCategory)
    .filter(cat => !(isHomeOwner && cat === ExpenseCategory.RENT))
    .map(cat => ({
      name: cat,
      value: activeExpenses
        .filter(e => e.category === cat)
        .reduce((sum, e) => sum + e.amount, 0)
    })).filter(v => v.value > 0);

  const growthData = useMemo(() => {
    const dataMap: Record<string, { income: number; expense: number }> = {};

    state.incomeSources.forEach(i => {
      const date = new Date(i.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!dataMap[key]) dataMap[key] = { income: 0, expense: 0 };
      dataMap[key].income += i.amount;
    });

    activeExpenses.forEach(e => {
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
  }, [state.incomeSources, activeExpenses]);

  const businessReservation = activeExpenses
    .filter(e => e.category === ExpenseCategory.BUSINESS_RESERVATION)
    .reduce((sum, e) => sum + e.amount, 0);
  const businessProvisions = activeExpenses
    .filter(e => e.category === ExpenseCategory.PROVISIONS)
    .reduce((sum, e) => sum + e.amount, 0);
  const taxReserve = activeExpenses
    .filter(e => e.category === ExpenseCategory.TAX_RESERVE)
    .reduce((sum, e) => sum + e.amount, 0);

  const limitReached = state.monthlyLimit > 0 ? (totalExpenses / state.monthlyLimit) * 100 : 0;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex justify-end">

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex-shrink-0 h-12 w-12 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-blue-100 group"
          >
            <RotateCcw size={20} strokeWidth={2.5} className="group-active:-rotate-90 group-active:transition-transform group-active:duration-300" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-green-100 rounded-lg">
              <TrendingUp size={18} className="text-green-600" />
            </div>
            <span className="text-xs font-medium text-black opacity-60">Income</span>
          </div>
          <div className="text-xl font-bold text-black">{state.currency}{totalIncome.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-red-100 rounded-lg">
              <TrendingDown size={18} className="text-red-600" />
            </div>
            <span className="text-xs font-medium text-black opacity-60">Expenses</span>
          </div>
          <div className="text-xl font-bold text-black">{state.currency}{totalExpenses.toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-blue-600 p-6 rounded-3xl shadow-lg text-white relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-blue-100 text-sm font-medium">Available Balance</p>
          <h2 className="text-3xl font-bold mb-4">{state.currency}{balance.toLocaleString()}</h2>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs text-blue-100 opacity-80">Suggested Savings</p>
              <p className="font-semibold text-lg">{state.currency}{((totalIncome * state.allocation.savings) / 100).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-100 opacity-80">Suggested Investment</p>
              <p className="font-semibold text-lg">{state.currency}{((totalIncome * state.allocation.investments) / 100).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-blue-500 rounded-full opacity-30 blur-2xl"></div>
      </div>

      {
        state.userType !== UserType.BUSINESS && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <ChartIcon size={18} />
                </div>
                <h3 className="text-sm font-bold text-black uppercase tracking-wider">Growth Trend</h3>
              </div>
              <span className={`text-xs font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {balance >= 0 ? '+' : ''}{state.currency}{balance.toLocaleString()} Total
              </span>
            </div>

            <div className="h-48 w-full">
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
        )
      }

      {
        state.userType === UserType.BUSINESS && (
          <div className="bg-slate-900 p-6 rounded-3xl shadow-xl text-white space-y-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Landmark size={18} />
              <h3 className="text-sm font-bold uppercase tracking-wider">Business Capital & Reserves</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-800 p-3 rounded-2xl">
                <div className="text-blue-400 mb-1"><ShieldCheck size={16} /></div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Reservation</p>
                <p className="text-sm font-bold">{state.currency}{businessReservation.toLocaleString()}</p>
              </div>
              <div className="bg-slate-800 p-3 rounded-2xl">
                <div className="text-green-400 mb-1"><Calculator size={16} /></div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Provisions</p>
                <p className="text-sm font-bold">{state.currency}{businessProvisions.toLocaleString()}</p>
              </div>
              <div className="bg-slate-800 p-3 rounded-2xl">
                <div className="text-red-400 mb-1"><TrendingDown size={16} /></div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Tax Reserve</p>
                <p className="text-sm font-bold">{state.currency}{taxReserve.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )
      }

      {
        state.monthlyLimit > 0 && (
          <div className={`p-4 rounded-2xl border ${limitReached >= 100 ? 'bg-red-50 border-red-200' : limitReached >= 75 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-black">Monthly Expense Limit</span>
              <span className="text-xs font-bold text-black opacity-50">{limitReached.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div className={`h-full transition-all duration-500 ${limitReached >= 100 ? 'bg-red-500' : limitReached >= 75 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(limitReached, 100)}%` }}></div>
            </div>
          </div>
        )
      }

      <div className="space-y-6">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-black mb-4">Expenses by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={expenseByCategory} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {expenseByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || '#cbd5e1'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${state.currency}${value.toLocaleString()}`} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div >
  );
};
