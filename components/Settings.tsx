import React, { useState, useEffect } from 'react';
import { AppState, UserType, AllocationPercentages, ProfileData } from '../types';
import { Shield, ChevronRight, Sliders, Briefcase, TrendingUp, GraduationCap, Home, Building2, CheckCircle2, LogOut, RotateCcw, X, FileSpreadsheet, FileText } from 'lucide-react';
import { CURRENCIES, DEFAULT_ALLOCATION } from '../constants';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

interface SettingsProps {
  state: AppState & ProfileData;
  onUpdate: (updates: Partial<AppState>) => void;
  onUpdateProfile: (updates: Partial<ProfileData>) => void;
  onSetHousing: (isHomeowner: boolean, rent?: number) => void;
  onReset: () => void;
  onLogout: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ state, onUpdate, onUpdateProfile, onSetHousing, onReset, onLogout }) => {
  const [isChangingHousing, setIsChangingHousing] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  // localSelection tracks what is currently highlighted in the "change" menu
  const [localSelection, setLocalSelection] = useState<boolean>(state.hasOwnHouse !== false);
  const [newRent, setNewRent] = useState(state.fixedRent?.toString() || '');

  const isHomeowner = state.hasOwnHouse !== false;
  const currentCurrencyLabel = CURRENCIES.find(c => c.symbol === state.currency)?.label || state.currency;

  const allocation = state.allocation || DEFAULT_ALLOCATION;
  const totalAlloc = Object.values(allocation).reduce((a, b) => (a as number) + (b as number), 0) as number;

  const showHousingSettings = state.userType === UserType.EMPLOYEE;

  // Sync local state when external state changes or when entering "change" mode
  useEffect(() => {
    if (!isChangingHousing) {
      setLocalSelection(isHomeowner);
      setNewRent(state.fixedRent?.toString() || '');
    }
  }, [isHomeowner, state.fixedRent, isChangingHousing]);

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

  const handleExportPDF = () => {
    setIsExportingPDF(true);
    setTimeout(async () => {
      try {
        // @ts-ignore
        const doc = new jsPDF();
        const currentDate = new Date().toISOString().split('T')[0];

        doc.setFontSize(22);
        doc.text("Smart Income Planner - Financial Report", 14, 22);

        doc.setFontSize(11);
        doc.text(`Generated on: ${currentDate}`, 14, 30);
        doc.text(`Account Type: ${state.userType || 'Default'}`, 14, 36);

        // Expenses
        doc.setFontSize(14);
        doc.text("Expense Ledger", 14, 50);
        // @ts-ignore
        doc.autoTable({
          startY: 55,
          head: [['Date', 'Category', 'Amount', 'Note', 'Cash']],
          body: state.expenses.map(e => [e.date, e.category, e.amount, e.note || '', e.isCash ? 'Yes' : 'No']),
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] }
        });

        // Income
        // @ts-ignore
        const finalYExpenses = doc.lastAutoTable.finalY || 55;
        doc.text("Income Ledger", 14, finalYExpenses + 15);
        // @ts-ignore
        doc.autoTable({
          startY: finalYExpenses + 20,
          head: [['Date', 'Category', 'Amount', 'Note']],
          body: state.incomeSources.map(i => [i.date, i.type, i.amount, i.note || '']),
          theme: 'striped',
          headStyles: { fillColor: [16, 185, 129] }
        });

        const fileName = `SIP_Report_${currentDate}.pdf`;
        if (Capacitor.isNativePlatform()) {
          const pdfOutput = doc.output('datauristring');
          const base64Data = (pdfOutput as string).split(',')[1];
          await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Documents
          });
          alert(`Saved PDF successfully to Documents Folder!`);
        } else {
          doc.save(fileName);
        }
      } catch (err) {
        console.error("PDF Export failed", err);
      }
      setIsExportingPDF(false);
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

  const confirmHousingChange = () => {
    if (localSelection) {
      onSetHousing(true);
      setIsChangingHousing(false);
    } else {
      const rent = parseFloat(newRent) || 0;
      if (rent <= 0 && !confirm("Save with 0 rent?")) return;
      onSetHousing(false, rent);
      setIsChangingHousing(false);
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
        {/* Housing Status - Fixed bug where user was unable to switch types */}
        {showHousingSettings && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
              <Home size={12} strokeWidth={3} /> HOUSING STATUS
            </h4>

            <div className="p-5 bg-white border border-slate-100 rounded-[2.2rem] shadow-sm transition-all hover:border-blue-100">
              {!isChangingHousing ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center text-white shadow-lg ${isHomeowner ? 'bg-[#00c08b] shadow-green-100 ring-4 ring-green-50' : 'bg-blue-600 shadow-blue-100 ring-4 ring-blue-50'}`}>
                      {isHomeowner ? <Home size={28} strokeWidth={2.5} /> : <Building2 size={28} strokeWidth={2.5} />}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 text-lg leading-none">{isHomeowner ? 'Owned House' : 'Rented House'}</span>
                      <span className="text-[13px] text-slate-400 font-medium mt-1">
                        {isHomeowner ? 'No monthly rent tracked' : `Fixed Rent: ${state.currency}${state.fixedRent?.toLocaleString() || 0}`}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsChangingHousing(true)}
                    className="text-[14px] font-black text-blue-600 bg-[#eef2ff] px-8 py-3 rounded-full active:scale-90 transition-all shadow-sm hover:bg-blue-100"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Select house type</span>
                    <button onClick={() => setIsChangingHousing(false)} className="text-slate-300 hover:text-red-500 p-1"><X size={20} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setLocalSelection(true)}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${localSelection ? 'border-green-500 bg-green-50' : 'border-slate-100 bg-slate-50/50'}`}
                    >
                      <Home size={24} className={localSelection ? 'text-green-600' : 'text-slate-300'} />
                      <span className={`text-xs font-bold ${localSelection ? 'text-green-700' : 'text-slate-400'}`}>Owned</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocalSelection(false)}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${!localSelection ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-slate-50/50'}`}
                    >
                      <Building2 size={24} className={!localSelection ? 'text-blue-600' : 'text-slate-300'} />
                      <span className={`text-xs font-bold ${!localSelection ? 'text-blue-700' : 'text-slate-400'}`}>Rented</span>
                    </button>
                  </div>

                  {!localSelection && (
                    <div className="mt-4 space-y-2 animate-in slide-in-from-top-1 duration-200">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monthly Rent Amount</label>
                      <input
                        type="number"
                        value={newRent}
                        onChange={(e) => setNewRent(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 focus:ring-blue-500/20"
                        placeholder="0.00"
                      />
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      onClick={confirmHousingChange}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-100 active:scale-[0.98] transition-all"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              )}
            </div>

            {isHomeowner && !isChangingHousing && (
              <div className="flex items-center gap-2 ml-3 mt-2 animate-in slide-in-from-left-2 duration-500">
                <div className="w-5 h-5 bg-green-50 text-green-600 rounded-full flex items-center justify-center shadow-sm">
                  <CheckCircle2 size={12} strokeWidth={3} />
                </div>
                <p className="text-[11px] text-[#00c08b] font-black tracking-tight uppercase tracking-wider">Rent allocation moved to savings & goals.</p>
              </div>
            )}
          </div>
        )}

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
        <div className="flex gap-4">
          <button
            onClick={handleExportExcel}
            disabled={isExportingExcel || isExportingPDF}
            className={`flex-1 p-4 bg-emerald-600 text-white font-bold text-sm rounded-[1.5rem] shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-emerald-700 ${isExportingExcel ? 'opacity-70 cursor-wait' : ''}`}
          >
            <FileSpreadsheet size={18} strokeWidth={2.5} /> Excel
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isExportingExcel || isExportingPDF}
            className={`flex-1 p-4 bg-blue-600 text-white font-bold text-sm rounded-[1.5rem] shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-blue-700 ${isExportingPDF ? 'opacity-70 cursor-wait' : ''}`}
          >
            <FileText size={18} strokeWidth={2.5} /> PDF
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
    </div>
  );
};
