
import React, { useState, useEffect, useRef } from 'react';
import { AppState, UserType, IncomeSource, Expense, ExpenseCategory, Goal, ProfileData, RecurringExpense } from './types';
import { DEFAULT_ALLOCATION, TYPE_SPECIFIC_SUB_ALLOCATIONS } from './constants';
import { Dashboard } from './components/Dashboard';
import { IncomeList } from './components/IncomeList';
import { ExpenseList } from './components/ExpenseList';
import { Insights } from './components/Insights';
import { Settings } from './components/Settings';
import { RecurringSetup } from './components/RecurringSetup';
import { NotificationToast, ToastType } from './components/NotificationToast';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { calculateHealthScore, processRoutineExpenses } from './utils/financeCalculations';
import { LocalNotifications } from '@capacitor/local-notifications';

import { Auth } from './components/Auth';
import {
  LayoutDashboard,
  ArrowUpCircle,
  ArrowDownCircle,
  Target,
  Lightbulb,
  Settings as SettingsIcon,
  CheckCircle2,
  Home,
  ChevronRight,
  ArrowLeft,
  Building2,
  RotateCcw
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
const API_BASE_URL = Capacitor.isNativePlatform() ? 'https://sepi-six.vercel.app' : '';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'income' | 'expenses' | 'insights' | 'settings'>('dashboard');
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<number>(0);
  const [tempProfile, setTempProfile] = useState<UserType | null>(null);
  const [tempRent, setTempRent] = useState<string>('');

  // Auth states
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [user, setUser] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const showNotification = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  };

  const createInitialProfile = (): ProfileData => ({
    incomeSources: [],
    expenses: [],
    goals: [],
    allocation: { ...DEFAULT_ALLOCATION },
    monthlyLimit: 0
  });

  const [state, setState] = useState<AppState>({
    userType: null,
    profiles: {
      [UserType.EMPLOYEE]: createInitialProfile(),
      [UserType.BUSINESS]: createInitialProfile(),
      [UserType.STUDENT]: createInitialProfile(),
    },
    currency: '₹',
    onboarded: false
  });

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const [isInitializing, setIsInitializing] = useState(true);
  const [pullDist, setPullDist] = useState(0);
  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY === 0 && touchStartY.current > 0) {
      const dist = e.touches[0].clientY - touchStartY.current;
      if (dist > 0) setPullDist(dist * 0.4);
    }
  };
  const handleTouchEnd = () => {
    if (pullDist > 80) fetchState();
    setPullDist(0);
    touchStartY.current = 0;
  };

  // Validate token on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (!token) {
        setIsAuthChecking(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          if (Capacitor.isNativePlatform()) {
            await Preferences.set({ key: 'auth_token', value: token });
          }
        } else {
          setToken(null);
          localStorage.removeItem('auth_token');
          if (Capacitor.isNativePlatform()) await Preferences.remove({ key: 'auth_token' });
        }
      } catch (err) {
        setToken(null);
        localStorage.removeItem('auth_token');
        if (Capacitor.isNativePlatform()) await Preferences.remove({ key: 'auth_token' });
      } finally {
        setIsAuthChecking(false);
      }
    };
    checkAuth();
  }, []);
  const fetchState = React.useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/state`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const parsed = await res.json();

        // Ensure all top level fields exist
        if (!parsed.profiles) parsed.profiles = {};

        // Rescue backwards-compat miskeyed 'EMPLOYEE' profile to 'Employee'
        if (parsed.profiles['EMPLOYEE'] && !parsed.profiles['Employee']) {
          parsed.profiles['Employee'] = parsed.profiles['EMPLOYEE'];
          delete parsed.profiles['EMPLOYEE'];
        }

        // Ensure every valid UserType has a correctly formed ProfileData
        Object.values(UserType).forEach((type) => {
          const loadedProfile = parsed.profiles[type] || {};
          parsed.profiles[type] = {
            ...createInitialProfile(),
            ...loadedProfile,
            allocation: loadedProfile.allocation || { ...DEFAULT_ALLOCATION },
            expenses: loadedProfile.expenses || [],
            incomeSources: loadedProfile.incomeSources || [],
            goals: loadedProfile.goals || []
          };
        });

        // Also normalize the state-level objects if missing
        parsed.onboarded = !!parsed.onboarded;
        parsed.currency = parsed.currency || '₹';

        // Handle case-mismatch from backend automated transactions (EMPLOYEE -> Employee)
        if (parsed.userType) {
          const matchedEnum = Object.values(UserType).find(
            type => type.toUpperCase() === parsed.userType?.toUpperCase()
          );
          if (matchedEnum) {
            parsed.userType = matchedEnum;
          }
        }

        setState(parsed);
      }
    } catch (err) {
      console.error("Failed to fetch state from DB", err);
    } finally {
      setIsInitializing(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthChecking || !token) return;
    fetchState();
  }, [isAuthChecking, token, fetchState]);

  // Routine Expenses Daemon Engine
  useEffect(() => {
    if (isInitializing || !state.onboarded || !state.userType) return;

    const checkRoutineExpenses = () => {
      const currentState = stateRef.current;
      const userType = currentState.userType;
      if (!userType) return;

      const activeProfile = currentState.profiles[userType];
      if (!activeProfile || !activeProfile.recurringExpenses) return;

      const { generatedExpenses, updatedRecurring } = processRoutineExpenses(activeProfile);

      if (generatedExpenses.length > 0) {
        setState(prev => ({
          ...prev,
          profiles: {
            ...prev.profiles,
            [userType]: {
              ...prev.profiles[userType],
              expenses: [...generatedExpenses, ...prev.profiles[userType].expenses],
              recurringExpenses: updatedRecurring
            }
          }
        }));
        showNotification(`${generatedExpenses.length} routine expense(s) auto-debited!`, "info");
      }
    };

    // Check immediately on load/switch
    checkRoutineExpenses();

    // Setup real-time interval check every 5 seconds for instant feedback
    const interval = setInterval(checkRoutineExpenses, 5000);
    return () => clearInterval(interval);
  }, [state.userType, state.onboarded, isInitializing]);

  // Synchronize OS Daily Snapshot Notifications
  useEffect(() => {
    if (!state.onboarded || isInitializing || !state.userType || !Capacitor.isNativePlatform()) return;
    const syncDailyDigest = async () => {
      try {
        const profile = state.profiles[state.userType!];
        if (!profile) return;

        await LocalNotifications.requestPermissions();

        const totalIncome = state.incomeSources.reduce((sum, inc) => sum + inc.amount, 0);
        const totalExpenses = profile.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const balance = totalIncome - totalExpenses;
        const health = calculateHealthScore(state);

        const formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: state.currency });

        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
          await LocalNotifications.cancel(pending);
        }

        await LocalNotifications.schedule({
          notifications: [
            {
              title: "Daily Financial Snapshot",
              body: `Good morning! Current Balance: ${formatter.format(balance)} | SEPI Health Score: ${health}/1000. Open the app to view today's insights!`,
              id: 11,
              schedule: { on: { hour: 9, minute: 0 } },
              smallIcon: "ic_stat_icon_config_sample"
            }
          ]
        });
      } catch (err) {
        console.warn("Local Notifications failed to bind gracefully. Device may not support OS scheduling:", err);
      }
    };
    syncDailyDigest();
  }, [state, isInitializing]);

  useEffect(() => {
    if (state.onboarded && !isInitializing && token) {
      fetch(`${API_BASE_URL}/api/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(state)
      }).catch(err => console.error("Database sync failed", err));
    }
  }, [state, isInitializing, token]);

  const handleLogin = async (newToken: string, newUser: any) => {
    localStorage.setItem('auth_token', newToken);
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key: 'auth_token', value: newToken });
    }
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to logout?')) return;
    localStorage.removeItem('auth_token');
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key: 'auth_token' });
    }
    setToken(null);
    setUser(null);
    setState({
      userType: null,
      profiles: {
        [UserType.EMPLOYEE]: createInitialProfile(),
        [UserType.BUSINESS]: createInitialProfile(),
        [UserType.STUDENT]: createInitialProfile(),
      },
      currency: '₹',
      onboarded: false
    });
    setIsInitializing(true);
  };

  const updateProfileData = (updates: Partial<ProfileData>) => {
    setState(prev => {
      const type = prev.userType;
      if (!type) return prev;
      return {
        ...prev,
        profiles: {
          ...prev.profiles,
          [type]: { ...prev.profiles[type], ...updates }
        }
      };
    });
  };



  const addIncome = (source: Omit<IncomeSource, 'id'>, autoAllocate: boolean = false) => {
    const type = state.userType;
    if (!type) return;

    const profile = state.profiles[type];
    const incomeId = Math.random().toString(36).substr(2, 9);
    const newSource = { ...source, id: incomeId };

    let newExpenses: Expense[] = [];
    let updatedGoals = [...profile.goals];

    if (autoAllocate) {
      const essentialsTotal = (source.amount * profile.allocation.essentials) / 100;
      const subAllocations = { ...TYPE_SPECIFIC_SUB_ALLOCATIONS[type] };

      let remainingEssentials = essentialsTotal;
      let shiftedToGoals = 0;
      const totalSubWeight = Object.values(subAllocations).reduce((a, b) => (a as number) + (b as number), 0) as number;
      Object.entries(subAllocations).forEach(([cat, weight]) => {
        const amt = totalSubWeight > 0 ? (remainingEssentials * (weight as number)) / totalSubWeight : 0;
        if (amt > 0) {
          newExpenses.push({
            id: Math.random().toString(36).substr(2, 9),
            category: cat as ExpenseCategory,
            amount: Math.round(amt),
            date: source.date,
            note: `Auto-allocated`,
            isAutoGenerated: true
          });
        }
      });

      const goalsFund = ((source.amount * profile.allocation.goals) / 100) + shiftedToGoals;
      const activeGoals = updatedGoals.filter(g => g.currentAmount < g.targetAmount);
      if (activeGoals.length > 0) {
        const contribution = goalsFund / activeGoals.length;
        updatedGoals = updatedGoals.map(g => g.currentAmount < g.targetAmount ? { ...g, currentAmount: Math.min(g.targetAmount, g.currentAmount + contribution) } : g);
      }
      showNotification(shiftedToGoals > 0 ? "Income added! Extra rent savings moved to goals." : "Income added and allocated.", "info");
    } else {
      showNotification("Income recorded.", "info");
    }

    updateProfileData({
      incomeSources: [newSource, ...profile.incomeSources],
      expenses: [...newExpenses, ...profile.expenses],
      goals: updatedGoals
    });
  };

  const finishOnboarding = (profile: UserType, recurringExpenses: RecurringExpense[]) => {
    setState(prev => ({
      ...prev,
      userType: profile,
      onboarded: true,
      profiles: {
        ...prev.profiles,
        [profile]: {
          ...prev.profiles[profile],
          recurringExpenses,
          recurringSetupComplete: true
        }
      }
    }));
    showNotification("Welcome! Setup complete.", "info");
  };

  const activeProfile = state.userType ? state.profiles[state.userType] : createInitialProfile();
  const activeState = { ...state, ...activeProfile };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!token) {
    return <Auth onLogin={handleLogin} />;
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-200 rounded-2xl mb-4"></div>
          <div className="h-4 bg-slate-200 rounded w-24"></div>
        </div>
      </div>
    );
  }

  if (!state.onboarded) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col p-8 items-center justify-center text-center text-black">
        {onboardingStep === 0 && (
          <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <img src="./icon.png" alt="SEPI Logo" className="w-24 h-24 mb-8 mx-auto shadow-2xl rounded-3xl" />
            <h1 className="text-3xl font-bold mb-2 text-slate-900 leading-tight">Smart Expenses Planner & Investment</h1>
            <p className="opacity-70 mb-12">Select your profile to begin.</p>
            <div className="space-y-4">
              {Object.values(UserType).map(type => (
                <button key={type} onClick={() => { setTempProfile(type); setOnboardingStep(1); }} className="w-full p-5 bg-white border-2 border-slate-100 rounded-3xl font-bold flex justify-between items-center group shadow-sm active:scale-95 transition-all">
                  {type} Profile <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-600 transition-all" />
                </button>
              ))}
            </div>
          </div>
        )}

        {onboardingStep === 1 && tempProfile && (
          <div className="w-full max-w-sm animate-in fade-in slide-in-from-right-4">
            <button onClick={() => setOnboardingStep(0)} className="mb-4 p-2 text-slate-400 flex items-center gap-2 hover:text-slate-900 transition-colors"><ArrowLeft size={16} /> Back</button>
            <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-slate-100 border-2">
              <RecurringSetup
                profileType={tempProfile}
                onComplete={(expenses) => finishOnboarding(tempProfile, expenses)}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col relative overflow-x-hidden">
      {toast && <NotificationToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <header className="px-6 py-6 sticky top-0 bg-slate-50/80 backdrop-blur-md z-30 flex justify-between items-start">
        <div className="flex-1">
          <h1 className="text-2xl font-black text-slate-900 leading-none mb-1">
            {activeTab === 'dashboard' ? (user?.name || user?.email?.split('@')[0] || 'Dashboard') : activeTab === 'income' ? 'Income' : activeTab === 'expenses' ? 'Spent' : activeTab === 'insights' ? 'Analysis' : 'Account'}
          </h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
            {state.userType ? `${state.userType} Account` : 'Welcome'}
          </p>
        </div>

      </header>

      <main
        className="flex-1 px-6 no-scrollbar overflow-y-auto relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div style={{ height: Math.min(pullDist, 100) }} className="w-full flex items-center justify-center overflow-hidden transition-all duration-75">
          {pullDist > 20 && (
            <div className={`text-slate-400 flex items-center gap-2 font-bold text-sm bg-slate-200/50 py-1.5 px-4 rounded-full transition-colors ${pullDist > 80 ? 'text-blue-500 bg-blue-100' : ''}`}>
              <ArrowDownCircle size={16} className={`transition-transform duration-300 ${pullDist > 80 ? 'rotate-180' : ''}`} />
              {pullDist > 80 ? 'Release to Sync' : 'Pull to Sync'}
            </div>
          )}
        </div>
        <div key={activeTab} className="animate-in fade-in zoom-in-95 duration-300 ease-out preserve-3d">
          {activeTab === 'dashboard' && (
            <div className="space-y-6 pb-6">
              <Dashboard state={activeState} onUpdate={(u) => setState(prev => ({ ...prev, ...u }))} onRefresh={fetchState} onAddExpense={(e) => updateProfileData({ expenses: [{ ...e, id: Math.random().toString(36).substr(2, 9) }, ...activeProfile.expenses] })} />
            </div>
          )}
          {activeTab === 'income' && <IncomeList state={activeState} onAdd={addIncome} onDelete={(id) => updateProfileData({ incomeSources: activeProfile.incomeSources.filter(i => i.id !== id) })} />}
          {activeTab === 'expenses' && <ExpenseList state={activeState} onAdd={(e) => updateProfileData({ expenses: [{ ...e, id: Math.random().toString(36).substr(2, 9) }, ...activeProfile.expenses] })} onDelete={(id) => updateProfileData({ expenses: activeProfile.expenses.filter(e => e.id !== id) })} />}
          {activeTab === 'insights' && <Insights state={activeState} />}
          {activeTab === 'settings' && (
            <Settings
              state={activeState}
              onUpdate={(u) => setState(prev => ({ ...prev, ...u }))}
              onUpdateProfile={updateProfileData}
              onReset={async () => {
                if (confirm("Are you incredibly sure you want to reset and permanently delete all your profiles?")) {
                  try {
                    await fetch(`${API_BASE_URL}/api/state`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                    alert('Profile reset successfully!');
                    // Force local state to raw initial
                    setState({
                      userType: null,
                      profiles: {
                        [UserType.EMPLOYEE]: createInitialProfile(),
                        [UserType.BUSINESS]: createInitialProfile(),
                        [UserType.STUDENT]: createInitialProfile(),
                      },
                      currency: '₹',
                      onboarded: false
                    });
                    setOnboardingStep(0);
                    setActiveTab('dashboard');
                  } catch (err) {
                    console.error(err);
                    alert('Failed to reset profile.');
                  }
                }
              }}
              onLogout={async () => {
                localStorage.removeItem('auth_token');
                if (Capacitor.isNativePlatform()) {
                  await Preferences.remove({ key: 'auth_token' });
                }
                setToken(null);
                setUser(null);
                setActiveTab('dashboard');
              }}
            />
          )}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-xl border-t border-slate-100 px-4 py-4 flex justify-between items-center z-40 shadow-2xl">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
          { id: 'income', icon: ArrowUpCircle, label: 'Income' },
          { id: 'expenses', icon: ArrowDownCircle, label: 'Spent' },
          { id: 'insights', icon: Lightbulb, label: 'Analysis' },
          { id: 'settings', icon: SettingsIcon, label: 'Account' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 flex flex-col items-center gap-1 transition-all ${activeTab === tab.id ? 'text-blue-600 scale-110' : 'text-slate-400 opacity-60 hover:opacity-100'}`}>
            <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
            <span className="text-[10px] font-black">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
