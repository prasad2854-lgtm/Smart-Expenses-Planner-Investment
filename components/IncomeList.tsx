
import React, { useState } from 'react';
import { AppState, IncomeSource, IncomeSourceType, UserType, ProfileData } from '../types';
import { Plus, Trash2, Calendar, CircleDollarSign, Zap, Info } from 'lucide-react';
import { USER_TYPE_INCOME_MAPPING } from '../constants';

interface IncomeListProps {
  state: AppState & ProfileData;
  onAdd: (source: Omit<IncomeSource, 'id'>, autoAllocate: boolean) => void;
  onDelete: (id: string) => void;
}

export const IncomeList: React.FC<IncomeListProps> = ({ state, onAdd, onDelete }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Get the single source type tied to this specific profile
  const sourceByProfile = state.userType 
    ? USER_TYPE_INCOME_MAPPING[state.userType] 
    : IncomeSourceType.OTHER;

  const [note, setNote] = useState('');
  const [autoAllocate, setAutoAllocate] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    
    onAdd({
      amount: parseFloat(amount),
      type: sourceByProfile, // Strictly use the profile-related type
      note,
      date: new Date(date).toISOString()
    }, autoAllocate);
    
    setAmount('');
    setNote('');
    setDate(new Date().toISOString().split('T')[0]);
    setShowAdd(false);
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-black">Income Sources</h2>
          <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">
            {state.userType} Profile
          </p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg active:scale-95 transition-all hover:bg-blue-700"
        >
          <Plus size={20} />
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-blue-100 shadow-xl space-y-4 text-black animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2 text-blue-600 bg-blue-50/50 p-2 rounded-xl mb-2">
            <Info size={14} />
            <span className="text-[10px] font-bold uppercase">New {sourceByProfile} Entry</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold opacity-60 mb-1">Amount ({state.currency})</label>
              <input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-black text-xl font-bold"
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold opacity-60 mb-1">Date</label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-black font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold opacity-60 mb-1">Source Type</label>
            <div className="w-full p-4 bg-blue-600 text-white rounded-2xl flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-3">
                <CircleDollarSign size={20} />
                <span className="font-bold">{sourceByProfile}</span>
              </div>
              <span className="text-[10px] font-bold opacity-70 border border-white/30 px-2 py-0.5 rounded-full">
                Fixed for {state.userType}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold opacity-60 mb-1">Note (Optional)</label>
            <input 
              type="text" 
              value={note} 
              onChange={(e) => setNote(e.target.value)} 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="E.g. Bonus, Monthly Dividend"
            />
          </div>

          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <input 
              type="checkbox" 
              id="autoAllocate"
              checked={autoAllocate}
              onChange={(e) => setAutoAllocate(e.target.checked)}
              className="mt-1 w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="autoAllocate" className="flex-1 text-xs font-semibold text-slate-700 cursor-pointer select-none">
              <div className="flex items-center gap-2 text-blue-600 mb-0.5">
                <Zap size={14} fill="currentColor" />
                Auto-allocate Expenses
              </div>
              <p className="text-[10px] font-normal text-slate-400">
                Automatically split this income based on your {state.userType} profile's allocation settings.
              </p>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="button" 
              onClick={() => setShowAdd(false)}
              className="flex-1 p-4 bg-slate-100 text-black rounded-2xl font-bold active:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex-2 p-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 active:bg-blue-700 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Add Income
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {state.incomeSources.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 text-black opacity-30">
            <CircleDollarSign size={48} className="mx-auto mb-4" />
            <p className="font-bold">No income records yet</p>
            <p className="text-xs px-10 mt-1">Add your {sourceByProfile} to start planning your {state.userType} budget.</p>
          </div>
        ) : (
          state.incomeSources.map(source => (
            <div key={source.id} className="bg-white p-5 rounded-3xl border border-slate-100 flex justify-between items-center shadow-sm hover:border-blue-200 transition-all group">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-50 text-green-600 rounded-2xl group-hover:bg-green-100 transition-colors">
                  <CircleDollarSign size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-black">{source.type}</h4>
                  <div className="flex items-center gap-1 text-[10px] text-black opacity-40">
                    <Calendar size={10} />
                    {new Date(source.date).toLocaleDateString()}
                    {source.note && <span className="max-w-[120px] truncate">• {source.note}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-black text-green-600">+{state.currency}{source.amount.toLocaleString()}</span>
                <button 
                  onClick={() => onDelete(source.id)} 
                  className="text-black opacity-10 hover:opacity-100 hover:text-red-500 p-2 transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
