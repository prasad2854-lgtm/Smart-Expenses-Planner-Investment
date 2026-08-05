import React, { useState, useMemo } from 'react';
import { AppState, ProfileData, Debt } from '../types';
import { calculatePayoffStrategy } from '../utils/financeCalculations';
import { Plus, Trash2, TrendingDown } from 'lucide-react';

interface DebtPlannerProps {
    state: AppState & ProfileData;
    onAddDebt: (debt: Omit<Debt, 'id'>) => void;
    onDeleteDebt: (id: string) => void;
}

export const DebtPlanner: React.FC<DebtPlannerProps> = ({ state, onAddDebt, onDeleteDebt }) => {
    const [showAdd, setShowAdd] = useState(false);
    const [strategy, setStrategy] = useState<'avalanche' | 'snowball'>('avalanche');

    const [name, setName] = useState('');
    const [balance, setBalance] = useState('');
    const [rate, setRate] = useState('');
    const [minPayment, setMinPayment] = useState('');

    const debts = state.debts || [];

    const plannedDebts = useMemo(() => {
        return calculatePayoffStrategy(debts, strategy);
    }, [debts, strategy]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !balance || !rate || !minPayment) return;
        onAddDebt({
            name,
            balance: parseFloat(balance),
            interestRate: parseFloat(rate),
            minimumPayment: parseFloat(minPayment)
        });
        setName('');
        setBalance('');
        setRate('');
        setMinPayment('');
        setShowAdd(false);
    };

    const totalDebt = debts.reduce((s, d) => s + d.balance, 0);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                    <TrendingDown className="text-red-500" /> Debt Payoff Organizer
                </h2>
                <button
                    onClick={() => setShowAdd(!showAdd)}
                    className="p-2 bg-red-100 text-red-600 rounded-lg active:scale-95 transition-all text-sm font-bold flex items-center gap-1"
                >
                    <Plus size={16} /> Add Debt
                </button>
            </div>

            {showAdd && (
                <form onSubmit={handleSubmit} className="bg-white p-4 rounded-2xl border shadow-sm space-y-3 animate-in fade-in zoom-in duration-300">
                    <input type="text" placeholder="Debt Name (e.g. Student Loan)" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" />
                    <div className="flex gap-2">
                        <input type="number" placeholder="Balance" value={balance} onChange={e => setBalance(e.target.value)} className="w-1/3 p-3 bg-slate-50 border border-slate-200 rounded-xl" />
                        <input type="number" placeholder="Interest %" value={rate} onChange={e => setRate(e.target.value)} className="w-1/3 p-3 bg-slate-50 border border-slate-200 rounded-xl" />
                        <input type="number" placeholder="Min. Payment" value={minPayment} onChange={e => setMinPayment(e.target.value)} className="w-1/3 p-3 bg-slate-50 border border-slate-200 rounded-xl" />
                    </div>
                    <button type="submit" className="w-full py-3 bg-red-600 text-white rounded-xl font-bold">Save Debt</button>
                </form>
            )}

            {debts.length > 0 && (
                <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Debt</p>
                            <h3 className="text-2xl font-black">{state.currency}{totalDebt.toLocaleString()}</h3>
                        </div>
                        <div className="flex bg-slate-800 rounded-lg p-1">
                            <button onClick={() => setStrategy('avalanche')} className={`px-2 py-1 text-[10px] font-bold rounded-md ${strategy === 'avalanche' ? 'bg-red-500 text-white' : 'text-slate-400'}`}>Avalanche</button>
                            <button onClick={() => setStrategy('snowball')} className={`px-2 py-1 text-[10px] font-bold rounded-md ${strategy === 'snowball' ? 'bg-red-500 text-white' : 'text-slate-400'}`}>Snowball</button>
                        </div>
                    </div>

                    <p className="text-xs text-slate-400">
                        {strategy === 'avalanche' ? 'Avalanche focuses on paying off high-interest debts first to save money.' : 'Snowball focuses on paying off small balances first to build momentum.'}
                    </p>

                    <div className="space-y-2 mt-4">
                        {plannedDebts.map((debt, index) => (
                            <div key={debt.id} className="bg-slate-800 p-3 rounded-xl flex justify-between items-center border border-slate-700/50 relative overflow-hidden">
                                {index === 0 && <div className="absolute left-0 top-0 w-1 h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,1)]"></div>}
                                <div>
                                    <h4 className="font-bold text-sm tracking-wide text-slate-200 flex items-center gap-2">
                                        <span className="bg-slate-700 w-5 h-5 flex items-center justify-center rounded-full text-[10px]">{index + 1}</span>
                                        {debt.name}
                                    </h4>
                                    <div className="flex gap-3 text-[10px] text-slate-400 mt-1 pl-7">
                                        <span>{state.currency}{debt.minimumPayment}/mo min</span>
                                        <span>{debt.interestRate}% APR</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-slate-300">{state.currency}{debt.balance.toLocaleString()}</span>
                                    <button onClick={() => onDeleteDebt(debt.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
