import React, { useState, useEffect } from 'react';
import { AppState, UserType, AllocationPercentages, ProfileData, RecurringExpense } from '../types';
import { Shield, ChevronRight, Sliders, Briefcase, TrendingUp, GraduationCap, Home, Building2, CheckCircle2, LogOut, RotateCcw, X, ArrowLeft, FileSpreadsheet, FileText, Target } from 'lucide-react';
import { CURRENCIES, DEFAULT_ALLOCATION } from '../constants';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { RecurringSetup } from './RecurringSetup';
import { GoalList } from './GoalList';
import { LocalNotifications } from '@capacitor/local-notifications';
import { calculateHealthScore } from '../utils/financeCalculations';

interface SettingsProps {
  state: AppState & ProfileData;
  onUpdate: (updates: Partial<AppState>) => void;
  onUpdateProfile: (updates: Partial<ProfileData>) => void;
  onReset: () => void;
  onLogout: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ state, onUpdate, onUpdateProfile, onReset, onLogout }) => {
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [showRoutinePage, setShowRoutinePage] = useState(false);
  const [showGoalsPage, setShowGoalsPage] = useState(false);

  const currentCurrencyLabel = CURRENCIES.find(c => c.symbol === state.currency)?.label || state.currency;

  const allocation = state.allocation || DEFAULT_ALLOCATION;
  const totalAlloc = Object.values(allocation).reduce((a, b) => (a as number) + (b as number), 0) as number;

  const handleExportExcel = () => {
    setIsExportingExcel(true);
    setTimeout(async () => {
      try {
        const expensesSheet = XLSX.utils.json_to_sheet(state.expenses.map(e => ({
          Date: e.date,
          Category: e.category,
          Amount: e.amount,
          Note: e.note,
          'Is Cash': e.isCash ? 'Yes' : 'No'
        })));

        const incomeSheet = XLSX.utils.json_to_sheet(state.incomeSources.map(i => ({
          Date: i.date,
          Category: i.type,
          Amount: i.amount,
          Note: i.note
        })));

        const goalsSheet = XLSX.utils.json_to_sheet(state.goals.map(g => ({
          Goal: g.name,
          'Target Amount': g.targetAmount,
          'Current Amount': g.currentAmount,
          Deadline: g.deadline
        })));

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Expenses');
        XLSX.utils.book_append_sheet(workbook, incomeSheet, 'Income');
        XLSX.utils.book_append_sheet(workbook, goalsSheet, 'Goals');

        const fileName = `SIP_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
        if (Capacitor.isNativePlatform()) {
          const b64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
          await Filesystem.writeFile({
            path: fileName,
            data: b64,
            directory: Directory.Documents
          });
          alert(`Saved Excel successfully to Documents Folder!`);
        } else {
          XLSX.writeFile(workbook, fileName);
        }
      } catch (err) {
        console.error("Export failed", err);
      }
      setIsExportingExcel(false);
    }, 500);
  };



  const handleAllocChange = (key: keyof AllocationPercentages, value: string) => {
    const numValue = Math.max(0, Math.min(100, parseInt(value) || 0));
    onUpdateProfile({
      allocation: { ...allocation, [key]: numValue }
    });
  };

  const resetAllocation = () => {
    if (confirm("Reset allocation strategy to defaults?")) {
      onUpdateProfile({ allocation: { ...DEFAULT_ALLOCATION } });
    }
  };



  const allocationKeys: (keyof AllocationPercentages)[] = [
    'essentials', 'savings', 'investments', 'emergency', 'goals'
  ];

  return (
    <div className="space-y-6 pb-24 text-black animate-in fade-in duration-500">
      {/* Profile Header Card */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden mb-8">
        <div className="p-8 flex items-center gap-5">
          <div className="w-16 h-16 bg-[#eef2ff] text-blue-600 rounded-3xl flex items-center justify-center shadow-inner border border-white">
            {state.userType === UserType.EMPLOYEE && <Briefcase size={32} strokeWidth={2.5} />}
            {state.userType === UserType.BUSINESS && <TrendingUp size={32} strokeWidth={2.5} />}
            {state.userType === UserType.STUDENT && <GraduationCap size={32} strokeWidth={2.5} />}
          </div>
          <div>
            <h3 className="font-black text-2xl text-slate-900 tracking-tight leading-tight">{state.userType} Account</h3>
            <p className="text-[11px] text-blue-500 font-black flex items-center gap-1.5 uppercase tracking-wider mt-1.5">
              <Shield size={14} fill="currentColor" className="opacity-20" /> SECURE PROFILE • {state.currency}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8 px-1">


        {/* Switch Profile Control */}
        <div className="space-y-4">
          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">SWITCH ACCOUNT PROFILE</h4>
          <div className="bg-slate-100/60 p-1.5 rounded-[1.8rem] border border-slate-100 flex items-center relative h-16 overflow-hidden shadow-inner">
            {Object.values(UserType).map((type) => (
              <button
                key={type}
                onClick={() => onUpdate({ userType: type })}
                className={`flex-1 z-10 py-2 text-[12px] font-black transition-all duration-300 ${state.userType === type ? 'text-white' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {type}
              </button>
            ))}
            <div
              className="absolute h-[calc(100%-12px)] bg-blue-600 rounded-[1.5rem] shadow-xl shadow-blue-200 transition-all duration-300 left-1.5"
              style={{
                width: 'calc(33.33% - 4px)',
                transform: `translateX(${state.userType === UserType.EMPLOYEE ? '0%' :
                  state.userType === UserType.BUSINESS ? '100%' : '200%'
                  })`
              }}
            />
          </div>
        </div>

        {/* Routine Expenses Modal Trigger */}
        <div className="space-y-4">
          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">AUTOMATION</h4>
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4">
            <button
              onClick={() => setShowRoutinePage(true)}
              className="w-full flex items-center justify-between p-2 active:scale-95 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#eef2ff] text-blue-600 rounded-[1.2rem] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <RotateCcw size={24} />
                </div>
                <div className="text-left flex-1">
                  <span className="block font-bold text-slate-900 border-none outline-none text-lg">Routine Expenses</span>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-older">{state.recurringExpenses ? state.recurringExpenses.length : 0} active routines</span>
                </div>
              </div>
              <ChevronRight size={20} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => setShowGoalsPage(true)}
              className="w-full flex items-center justify-between p-2 mt-2 active:scale-95 transition-all group border-t border-slate-100 pt-3"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#fff0f5] text-pink-600 rounded-[1.2rem] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Target size={24} />
                </div>
                <div className="text-left flex-1">
                  <span className="block font-bold text-slate-900 border-none outline-none text-lg">Financial Goals</span>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-older">{state.goals ? state.goals.length : 0} active goals</span>
                </div>
              </div>
              <ChevronRight size={20} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Financial Strategy Control */}
        <div className="space-y-6">
          <div className="flex justify-between items-center ml-2 mr-2">
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Sliders size={12} strokeWidth={3} /> {state.userType?.toUpperCase()} STRATEGY
            </h4>
            <button
              onClick={resetAllocation}
              className="flex items-center gap-1.5 text-[10px] font-black text-blue-500 hover:text-blue-700 transition-colors uppercase tracking-widest"
            >
              <RotateCcw size={10} /> Reset
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-5">
            {allocationKeys.map((key) => (
              <div key={key} className="space-y-2">
                <label className="block text-[11px] text-slate-400 capitalize font-black ml-3">{key}</label>
                <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-[1.5rem] px-5 py-4 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={allocation[key]}
                    onChange={(e) => handleAllocChange(key, e.target.value)}
                    className="w-full bg-transparent text-base font-black outline-none text-slate-900"
                  />
                  <span className="text-xs text-slate-300 font-black">%</span>
                </div>
              </div>
            ))}
          </div>
          <div className={`p-5 rounded-3xl text-center text-[10px] font-black transition-colors shadow-inner flex flex-col items-center justify-center gap-1 ${totalAlloc === 100 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            <div className="text-lg leading-none">{totalAlloc}%</div>
            <div className="uppercase tracking-[0.1em]">{totalAlloc === 100 ? 'Perfect Allocation' : 'Must sum to 100%'}</div>
          </div>
        </div>
      </div>

      <div className="pt-10 space-y-4">
        <div className="flex">
          <button
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            className={`w-full p-4 bg-emerald-600 text-white font-bold text-sm rounded-[1.5rem] shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-emerald-700 ${isExportingExcel ? 'opacity-70 cursor-wait' : ''}`}
          >
            <FileSpreadsheet size={18} strokeWidth={2.5} /> Export as Excel
          </button>
        </div>
        <button
          onClick={onLogout}
          className="w-full p-6 bg-white text-slate-700 font-black rounded-[2.2rem] border border-slate-200 shadow-sm flex items-center justify-center gap-3 active:scale-[0.98] transition-all hover:bg-slate-50 hover:text-slate-900"
        >
          <LogOut size={22} strokeWidth={2.5} /> Secure Logout
        </button>
        <button
          onClick={onReset}
          className="w-full p-4 bg-transparent text-red-400 font-bold text-sm rounded-[2.2rem] flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-red-50 hover:text-red-600"
        >
          <X size={18} strokeWidth={3} /> Clear Data
        </button>
      </div>

      {/* Full-Screen Routine Page Overlay */}
      {showRoutinePage && (
        <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col animate-in slide-in-from-right-4 duration-300">
          <div className="bg-white px-4 py-4 flex items-center justify-between shadow-sm border-b border-slate-100 shrink-0">
            <button onClick={() => setShowRoutinePage(false)} className="p-3 bg-slate-100 rounded-2xl active:scale-95 transition-transform text-slate-600">
              <ArrowLeft size={24} />
            </button>
            <h2 className="font-bold text-lg text-slate-800">Routine Expenses</h2>
            <div className="w-12"></div> {/* Spacer for alignment */}
          </div>
          <div className="flex-1 overflow-y-auto pb-8">
            <RecurringSetup
              profileType={state.userType || UserType.EMPLOYEE}
              initialExpenses={state.recurringExpenses}
              onComplete={(expenses) => {
                onUpdateProfile({ recurringExpenses: expenses, recurringSetupComplete: true });
                setShowRoutinePage(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Full-Screen Goals Page Overlay */}
      {showGoalsPage && (
        <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col animate-in slide-in-from-right-4 duration-300">
          <div className="bg-white px-4 py-4 flex items-center justify-between shadow-sm border-b border-slate-100 shrink-0">
            <button onClick={() => setShowGoalsPage(false)} className="p-3 bg-slate-100 rounded-2xl active:scale-95 transition-transform text-slate-600">
              <ArrowLeft size={24} />
            </button>
            <h2 className="font-bold text-lg text-slate-800">Financial Goals</h2>
            <div className="w-12"></div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 pb-8">
            <GoalList
              state={state}
              onAdd={(g) => onUpdateProfile({ goals: [...(state.goals || []), { ...g, id: Date.now().toString() }] })}
              onDelete={(id) => onUpdateProfile({ goals: (state.goals || []).filter(g => g.id !== id) })}
            />
          </div>
        </div>
      )}
    </div>
  );
};
