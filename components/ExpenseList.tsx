
import React, { useState, useEffect, useMemo } from 'react';
import { AppState, Expense, ExpenseCategory, ProfileData, UserType } from '../types';
import { Plus, Calendar, Receipt, Trash2, ChevronDown, Home, Tag } from 'lucide-react';
import { CATEGORY_COLORS, SUB_CATEGORIES } from '../constants';

interface ExpenseListProps {
  state: AppState & ProfileData;
  onAdd: (expense: Omit<Expense, 'id'>) => void;
  onDelete: (id: string) => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({ state, onAdd, onDelete }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.FOOD);
  const [subCategory, setSubCategory] = useState<string>('');
  const [note, setNote] = useState('');

  const isHomeOwner = !!state.hasOwnHouse;

  const availableCategories = useMemo(() => {
    return Object.values(ExpenseCategory).filter(c => {
      if (isHomeOwner && c === ExpenseCategory.RENT) return false;
      return true;
    });
  }, [isHomeOwner]);

  const filteredExpenses = useMemo(() => {
    return state.expenses.filter(e => {
      if (isHomeOwner && e.category === ExpenseCategory.RENT) return false;
      return true;
    });
  }, [state.expenses, isHomeOwner]);

  useEffect(() => {
    const availableSubCats = SUB_CATEGORIES[category];
    if (availableSubCats && availableSubCats.length > 0) {
      setSubCategory(availableSubCats[0]);
    } else {
      setSubCategory('');
    }
  }, [category]);

  useEffect(() => {
    if (isHomeOwner && category === ExpenseCategory.RENT) {
      setCategory(ExpenseCategory.FOOD);
    }
  }, [isHomeOwner, category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    
    if (isHomeOwner && category === ExpenseCategory.RENT) return;

    onAdd({
      amount: parseFloat(amount),
      category,
      subCategory: subCategory || undefined,
      note,
      date: new Date(date).toISOString()
    });
    setAmount('');
    setNote('');
    setDate(new Date().toISOString().split('T')[0]);
    setShowAdd(false);
  };

  const suggestions = SUB_CATEGORIES[category] || [];

  return (
    <div className="space-y-4 pb-24 text-black">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Spent History</h2>
          {isHomeOwner && (
            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full w-fit">
              <Home size={10} />
              Homeowner Mode
            </div>
          )}
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="p-3 bg-red-600 text-white rounded-2xl shadow-lg active:scale-95 transition-transform"
        >
          <Plus size={20} />
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold opacity-60 mb-1 uppercase tracking-wider">Amount ({state.currency})</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 font-bold text-lg" placeholder="0.00" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-semibold opacity-60 mb-1 uppercase tracking-wider">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 font-bold text-lg" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-semibold opacity-60 mb-1 uppercase tracking-wider">Category</label>
              <div className="relative">
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)} 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 appearance-none font-semibold transition-all"
                  style={{ borderLeft: `4px solid ${CATEGORY_COLORS[category]}` }}
                >
                  {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>

            {suggestions.length > 0 && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                <label className="block text-[10px] font-black opacity-30 mb-2 uppercase tracking-widest flex items-center gap-1">
                  <Tag size={10} /> Suggestions
                </label>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map(sc => (
                    <button
                      key={sc}
                      type="button"
                      onClick={() => setSubCategory(sc)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
                        subCategory === sc 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100' 
                        : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'
                      }`}
                    >
                      {sc}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSubCategory('')}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
                      subCategory === '' 
                      ? 'bg-slate-600 text-white border-slate-600' 
                      : 'bg-slate-50 text-slate-400 border-slate-100'
                    }`}
                  >
                    Custom
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold opacity-60 mb-1 uppercase tracking-wider">Note (Optional)</label>
            <input 
              type="text" 
              value={note} 
              onChange={(e) => setNote(e.target.value)} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500" 
              placeholder={subCategory ? `e.g. ${subCategory} details...` : "Describe this expense..."} 
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="flex-1 p-3 bg-slate-100 rounded-xl font-semibold active:bg-slate-200 transition-colors">Cancel</button>
            <button type="submit" className="flex-1 p-3 bg-red-600 text-white rounded-xl font-semibold shadow-lg shadow-red-200 active:scale-95 transition-all">Track Entry</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 opacity-30">
            <Receipt size={48} className="mx-auto mb-4" />
            <p className="font-bold">No expense entries found</p>
            {isHomeOwner && <p className="text-[10px] mt-1">Rent expenses are hidden in Homeowner mode.</p>}
          </div>
        ) : (
          filteredExpenses.map(expense => (
              <div key={expense.id} className={`bg-white p-4 rounded-2xl border flex justify-between items-center shadow-sm transition-all hover:shadow-md ${expense.isAutoGenerated ? 'border-blue-50 bg-blue-50/10' : 'border-slate-100'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[expense.category] }}></div>
                  <div>
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      {expense.category}
                      {expense.subCategory && (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase tracking-tight">
                          {expense.subCategory}
                        </span>
                      )}
                    </h4>
                    <div className="flex items-center gap-1 text-[10px] opacity-40">
                      <Calendar size={10} />
                      {new Date(expense.date).toLocaleDateString()}
                      {expense.note && <span className="max-w-[120px] truncate ml-1">• {expense.note}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-red-600">-{state.currency}{expense.amount.toLocaleString()}</span>
                  <button onClick={() => onDelete(expense.id)} className="opacity-20 hover:opacity-100 p-2 transition-all hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
};
