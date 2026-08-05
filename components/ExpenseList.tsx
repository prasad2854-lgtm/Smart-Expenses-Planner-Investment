import React, { useState, useEffect, useMemo } from 'react';
import { AppState, Expense, ExpenseCategory, ProfileData, UserType } from '../types';
import { Plus, Calendar, Receipt, Trash2, ChevronDown, Home, Tag, Camera as CameraIcon, Loader2, Sparkles } from 'lucide-react';
import { parseReceiptFromImage } from '../services/geminiService';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { CATEGORY_COLORS, SUB_CATEGORIES, PROFILE_ALLOWED_CATEGORIES } from '../constants';

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
  const [items, setItems] = useState<{ name: string, amount: number, category: string }[]>([]);
  const [isScanning, setIsScanning] = useState(false);


  const availableCategories = useMemo(() => {
    const defaultCats = PROFILE_ALLOWED_CATEGORIES[state.userType || UserType.EMPLOYEE];
    return defaultCats;
  }, [state.userType]);

  const filteredExpenses = useMemo(() => {
    return state.expenses;
  }, [state.expenses]);

  useEffect(() => {
    const availableSubCats = SUB_CATEGORIES[category];
    if (availableSubCats && availableSubCats.length > 0) {
      setSubCategory(availableSubCats[0]);
    } else {
      setSubCategory('');
    }
  }, [category]);

  useEffect(() => {
    if (!availableCategories.includes(category)) {
      setCategory(availableCategories[0] || ExpenseCategory.FOOD);
    }
  }, [category, availableCategories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;



    onAdd({
      amount: parseFloat(amount),
      category,
      subCategory: subCategory || undefined,
      note,
      date: new Date(date).toISOString(),
      items: items.length > 0 ? items : undefined
    });
    setAmount('');
    setNote('');
    setItems([]);
    setDate(new Date().toISOString().split('T')[0]);
    setShowAdd(false);
  };

  const handleNativeScan = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 60,
        width: 800,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
        promptLabelHeader: 'Scan Receipt',
        promptLabelPhoto: 'Import from Gallery',
        promptLabelPicture: 'Take a Photo',
        promptLabelCancel: 'Cancel & Go Back'
      });

      const base64String = image.base64String;
      if (!base64String) return;

      setIsScanning(true);
      const mimeType = image.format ? `image/${image.format}` : 'image/jpeg';

      const result = await parseReceiptFromImage(base64String, mimeType, state.currency);

      const safeAmount = result?.amount || 0;
      let finalCategory = (result?.category || ExpenseCategory.OTHER) as ExpenseCategory;

      if (safeAmount === 0) {
        alert('AI could not detect any prices on this image. Please scan a clearer receipt.');
        setIsScanning(false);
        return;
      }
      setAmount(safeAmount.toString());

      if (!availableCategories.includes(finalCategory)) {
        finalCategory = availableCategories.includes(ExpenseCategory.OTHER as ExpenseCategory) ? ExpenseCategory.OTHER as ExpenseCategory : availableCategories[0];
      }
      setCategory(finalCategory);

      if (result?.note) setNote(result.note);
      if (result?.items) setItems(result.items);
    } catch (err: any) {
      if (err.message && err.message.includes('User cancelled')) return;
      console.error(err);
      alert(`Failed to scan receipt: ${err.message || 'Unknown error'}`);
    } finally {
      setIsScanning(false);
    }
  };

  const suggestions = SUB_CATEGORIES[category] || [];

  return (
    <div className="space-y-4 pb-24 text-black">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Expenses</h2>

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

          <div className="flex justify-between items-center bg-blue-50/50 p-3 rounded-xl border border-blue-100">
            <span className="text-xs font-bold text-blue-700 flex items-center gap-1">AI Fast Track</span>
            <button type="button" onClick={handleNativeScan} disabled={isScanning} className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 cursor-pointer transition-all ${isScanning ? 'bg-slate-200 text-slate-500' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-sm shadow-blue-200'}`}>
              {isScanning ? <Loader2 size={14} className="animate-spin" /> : <CameraIcon size={14} />}
              {isScanning ? 'Scanning...' : 'Scan Receipt'}
            </button>
          </div>

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
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${subCategory === sc
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
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${subCategory === ''
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

          </div>
        ) : (
          filteredExpenses.map(expense => (
            <div key={expense.id} className={`bg-white p-4 rounded-2xl border shadow-sm transition-all hover:shadow-md ${expense.isAutoGenerated ? 'border-blue-50 bg-blue-50/10' : 'border-slate-100'}`}>
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-4 flex-1 mr-4">
                  <div className="w-1.5 h-10 rounded-full mt-1 shrink-0" style={{ backgroundColor: CATEGORY_COLORS[expense.category] }}></div>
                  <div className="flex flex-col">
                    <h4 className="text-sm font-bold text-slate-800 leading-snug line-clamp-2">
                      {expense.note ? expense.note : expense.category}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                        <Calendar size={10} />
                        {new Date(expense.date).toLocaleDateString()}
                      </span>
                      {expense.note && (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase tracking-tight">
                          {expense.category}
                        </span>
                      )}
                      {expense.subCategory && (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase tracking-tight">
                          {expense.subCategory}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-sm font-bold text-red-600">-{state.currency}{expense.amount.toLocaleString()}</span>
                  <button onClick={() => onDelete(expense.id)} className="opacity-20 hover:opacity-100 p-2 transition-all hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {expense.items && expense.items.length > 0 && (
                <div className="mt-3 pl-8 space-y-1">
                  <div className="text-[9px] uppercase font-bold text-slate-400 mb-1.5 flex items-center gap-1">
                    Itemized Breakdown
                  </div>
                  {expense.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs text-slate-600 bg-slate-50 px-2 py-1.5 rounded-lg mb-1">
                      <span className="truncate pr-2 font-medium">{item.name}</span>
                      <span className="font-semibold shrink-0 text-slate-500">{state.currency}{item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
