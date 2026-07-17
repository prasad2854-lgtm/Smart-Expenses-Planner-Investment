import React from 'react';
import { IndianRupee } from 'lucide-react';
import { ProfileData } from '../types';

interface CashWalletProps {
    profile: ProfileData;
    updateProfile: (updated: Partial<ProfileData>) => void;
}

export const CashWallet: React.FC<CashWalletProps> = ({ profile, updateProfile }) => {
    // Calculate cash dynamically
    const initialCash = profile.reconciledCashBalance || 0;

    // Track all ATM/Cash withdrawals as "Income" to the cash wallet
    const cashAdded = profile.expenses
        .filter(e => e.category === 'ATM Withdrawal')
        .reduce((sum, e) => sum + e.amount, 0);

    // Track all Cash Expenses
    const cashSpent = profile.expenses
        .filter(e => e.isCash && e.category !== 'ATM Withdrawal')
        .reduce((sum, e) => sum + e.amount, 0);

    const currentExpectedCash = initialCash + cashAdded - cashSpent;

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mt-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-bold text-black flex items-center gap-2">
                    <IndianRupee size={18} className="text-emerald-500" /> CASH WALLET
                </h2>
                <div className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg flex items-center font-bold text-xs shadow-sm border border-emerald-100">
                    Total: ₹{currentExpectedCash.toLocaleString()}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm text-black">
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                    <div className="text-slate-400 mb-1 font-bold text-[10px] uppercase tracking-wider">Withdrawn</div>
                    <div className="text-lg text-emerald-600 font-extrabold">+₹{cashAdded.toLocaleString()}</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                    <div className="text-slate-400 mb-1 font-bold text-[10px] uppercase tracking-wider">Spent</div>
                    <div className="text-lg text-rose-500 font-extrabold">-₹{cashSpent.toLocaleString()}</div>
                </div>
            </div>
        </div>
    );
};
