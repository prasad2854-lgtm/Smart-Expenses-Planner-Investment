import React, { useState } from 'react';
import { ExpenseCategory, RecurringFrequency, RecurringExpense, ProfileData, UserType } from '../types';
import { PROFILE_ALLOWED_CATEGORIES } from '../constants';
import { CalendarClock, Plus, Trash2, ArrowRight, Edit2 } from 'lucide-react';

interface RecurringSetupProps {
    profileType: UserType;
    initialExpenses?: RecurringExpense[];
    onComplete: (completedExpenses: RecurringExpense[]) => void;
}

export const RecurringSetup: React.FC<RecurringSetupProps> = ({ profileType, initialExpenses, onComplete }) => {
    const [expenses, setExpenses] = useState<Omit<RecurringExpense, 'id' | 'lastProcessedDate'>[]>(initialExpenses || []);
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.RENT);
    const [frequency, setFrequency] = useState<RecurringFrequency>('Monthly');
    const [startDate, setStartDate] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000 + 3600000).toISOString().slice(0, 16));

    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !amount) return;

        const newExp = {
            name,
            amount: parseFloat(amount),
            category,
            frequency,
            startDate
        };

        if (editingIndex !== null) {
            const updated = [...expenses];
            const updatedExp = { ...updated[editingIndex], ...newExp };

            // If they altered the start date, we must delete the lastProcessedDate 
            // to force the Daemon engine to recalculate the trigger.
            if (updated[editingIndex].startDate !== startDate) {
                delete (updatedExp as any).lastProcessedDate;
            }

            updated[editingIndex] = updatedExp;
            setExpenses(updated);
            setEditingIndex(null);
        } else {
            setExpenses([...expenses, newExp]);
        }

        setName('');
        setAmount('');
    };

    const handleEdit = (index: number) => {
        const exp = expenses[index];
        setName(exp.name);
        setAmount(exp.amount.toString());
        setCategory(exp.category);
        setFrequency(exp.frequency);
        if (exp.startDate) setStartDate(exp.startDate);
        setEditingIndex(index);
    };

    const cancelEdit = () => {
        setEditingIndex(null);
        setName('');
        setAmount('');
        setFrequency('Monthly');
        setCategory(PROFILE_ALLOWED_CATEGORIES[profileType][0]);
    };

    const handleRemove = (index: number) => {
        setExpenses(expenses.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        const finalExpenses: RecurringExpense[] = expenses.map(exp => {
            if ((exp as any).id && (exp as any).lastProcessedDate) {
                // If it already exists, do not override its state, just keep what was edited
                return exp as RecurringExpense;
            }

            // Safely parse the datetime-local string (YYYY-MM-DDThh:mm) to local timezone components
            // to perfectly guarantee cross-browser stability without UTC offset shifting.
            const [localDatePart, localTimePart] = exp.startDate.split('T');
            const [ly, lm, ld] = localDatePart.split('-').map(Number);
            const [lh, lmin] = localTimePart.split(':').map(Number);
            let preStart = new Date(ly, lm - 1, ld, lh, lmin);

            if (exp.frequency === 'Daily') preStart.setDate(preStart.getDate() - 1);
            else if (exp.frequency === 'Weekly') preStart.setDate(preStart.getDate() - 7);
            else if (exp.frequency === 'Monthly') preStart.setMonth(preStart.getMonth() - 1);
            else if (exp.frequency === 'Quarterly') preStart.setMonth(preStart.getMonth() - 3);
            else if (exp.frequency === 'Half-Yearly') preStart.setMonth(preStart.getMonth() - 6);
            else if (exp.frequency === 'Yearly') preStart.setFullYear(preStart.getFullYear() - 1);

            return {
                ...exp,
                id: Math.random().toString(36).substr(2, 9),
                lastProcessedDate: preStart.toISOString()
            } as RecurringExpense;
        });

        onComplete(finalExpenses);
    };

    return (
        <>
            <div className="bg-slate-900 min-h-screen py-10 px-4 flex flex-col text-white overflow-y-auto w-full md:items-center">
                <div className="bg-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-slate-700">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center">
                            <CalendarClock size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">Routine Expenses</h2>
                            <p className="text-slate-400 text-sm">Automate your fixed {profileType} payments</p>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 rounded-2xl p-4 mb-6 border border-slate-700/50">
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1">Expense Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Netflix, Rent, Internet"
                                    className="w-full bg-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 border border-slate-700 focus:outline-none focus:border-indigo-500"
                                    value={editingIndex === null ? name : ''}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Amount</label>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        className="w-full bg-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 border border-slate-700 focus:outline-none focus:border-indigo-500"
                                        value={editingIndex === null ? amount : ''}
                                        onChange={(e) => setAmount(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Frequency</label>
                                    <select
                                        value={frequency}
                                        onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                                        className="w-full bg-slate-800 rounded-xl px-4 py-3 text-white border border-slate-700 focus:outline-none focus:border-indigo-500 text-sm"
                                    >
                                        <option value="Daily">Daily</option>
                                        <option value="Weekly">Weekly</option>
                                        <option value="Monthly">Monthly</option>
                                        <option value="Quarterly">Quarterly</option>
                                        <option value="Half-Yearly">Half-Yearly</option>
                                        <option value="Yearly">Yearly</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Category</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                                        className="w-full bg-slate-800 rounded-xl px-4 py-3 text-white border border-slate-700 focus:outline-none focus:border-indigo-500 text-sm"
                                    >
                                        {PROFILE_ALLOWED_CATEGORIES[profileType].map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Next Run Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full bg-slate-800 rounded-xl px-4 py-3 text-white border border-slate-700 focus:outline-none focus:border-indigo-500 text-sm"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <button type="submit" disabled={!name || !amount} className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 transition-colors">
                                <Plus size={18} /> Add to Routine
                            </button>
                        </form>
                    </div>

                    <div className="space-y-3 mb-8 max-h-48 overflow-y-auto">
                        {expenses.length === 0 ? (
                            <div className="text-center py-6 text-slate-500 italic text-sm">
                                No routine expenses added yet.
                            </div>
                        ) : (
                            expenses.map((exp, idx) => (
                                <div key={idx} className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex justify-between items-center">
                                    <div>
                                        <h4 className="font-bold text-slate-200">{exp.name}</h4>
                                        <p className="text-xs text-slate-400">{exp.frequency} • {exp.category}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-black text-indigo-400">₹{exp.amount}</span>
                                        <button onClick={() => handleEdit(idx)} className="text-slate-500 hover:text-blue-400 transition-colors">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleRemove(idx)} className="text-slate-500 hover:text-red-400 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="flex flex-col gap-4">
                        <button
                            onClick={handleSave}
                            disabled={expenses.length === 0}
                            className={`w-full text-white rounded-2xl py-3.5 font-bold flex items-center justify-center gap-2 shadow-lg transition-colors ${expenses.length === 0 ? 'bg-indigo-400 opacity-50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'}`}
                        >
                            {expenses.length === 0 ? 'Add at least one routine expense' : 'Save Routines'} <ArrowRight size={18} />
                        </button>
                        {expenses.length === 0 && (
                            <p className="text-[10px] text-slate-400 font-bold text-center italic tracking-wider">
                                We need at least one to accurately forecast your automated ledger. You can add things like Rent, Subscriptions, Utilities, and Transportation.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Modal Pop-up */}
            {
                editingIndex !== null && (
                    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
                        <div className="bg-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-slate-700">
                            <h3 className="text-xl font-bold mb-4">Edit Routine Expense</h3>
                            <form onSubmit={handleAdd} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Expense Name</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="e.g. Netflix, Rent, Internet"
                                        className="w-full bg-slate-900 rounded-xl px-4 py-3 text-white placeholder-slate-500 border border-slate-700 focus:outline-none focus:border-indigo-500"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1">Amount</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            className="w-full bg-slate-900 rounded-xl px-4 py-3 text-white placeholder-slate-500 border border-slate-700 focus:outline-none focus:border-indigo-500"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1">Frequency</label>
                                        <select
                                            value={frequency}
                                            onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                                            className="w-full bg-slate-900 rounded-xl px-4 py-3 text-white border border-slate-700 focus:outline-none focus:border-indigo-500 text-sm"
                                        >
                                            <option value="Daily">Daily</option>
                                            <option value="Weekly">Weekly</option>
                                            <option value="Monthly">Monthly</option>
                                            <option value="Quarterly">Quarterly</option>
                                            <option value="Half-Yearly">Half-Yearly</option>
                                            <option value="Yearly">Yearly</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1">Category</label>
                                        <select
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                                            className="w-full bg-slate-900 rounded-xl px-4 py-3 text-white border border-slate-700 focus:outline-none focus:border-indigo-500 text-sm"
                                        >
                                            {PROFILE_ALLOWED_CATEGORIES[profileType].map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1">Next Run Date</label>
                                        <input
                                            type="datetime-local"
                                            className="w-full bg-slate-900 rounded-xl px-4 py-3 text-white border border-slate-700 focus:outline-none focus:border-indigo-500 text-sm"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <button type="button" onClick={cancelEdit} className="w-full bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-3 font-bold transition-colors">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={!name || !amount} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl py-3 font-bold transition-colors">
                                        Update
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </>
    );
};
