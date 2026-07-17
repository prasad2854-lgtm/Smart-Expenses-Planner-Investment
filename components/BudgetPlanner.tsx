import React from 'react';
import { AppState, ExpenseCategory } from '../types';

interface BudgetPlannerProps {
    state: AppState;
    onUpdateCategoryBudget: (category: string, amount: number) => void;
}

export const BudgetPlanner: React.FC<BudgetPlannerProps> = ({ state, onUpdateCategoryBudget }) => {
    const type = state.userType;
    if (!type) return null;
    const profile = state.profiles[type];
    const budgets = profile.categoryBudgets || {};

    // Aggregate current expenses by category
    const expensesByCategory = profile.expenses.reduce((acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Categorical Budgets</h2>

                {Object.values(ExpenseCategory).map(category => {
                    const budget = budgets[category] || 0;
                    const spent = expensesByCategory[category] || 0;
                    const percentage = budget > 0 ? (spent / budget) * 100 : 0;

                    let alertColor = "bg-blue-500";
                    let textColor = "text-blue-600";
                    if (percentage >= 100) { alertColor = "bg-red-500"; textColor = "text-red-500"; }
                    else if (percentage >= 90) { alertColor = "bg-orange-500"; textColor = "text-orange-500"; }
                    else if (percentage >= 75) { alertColor = "bg-amber-400"; textColor = "text-amber-500"; }

                    return (
                        <div key={category} className="mb-4">
                            <div className="flex justify-between items-end mb-1">
                                <span className="font-semibold text-slate-700 text-sm">{category}</span>
                                <span className={`text-xs font-bold ${textColor}`}>
                                    {spent > 0 ? `${state.currency}${spent.toLocaleString()} / ` : ''}
                                    <button onClick={() => {
                                        const amt = prompt(`Set budget limit for ${category}`, budget.toString());
                                        if (amt && !isNaN(parseFloat(amt))) onUpdateCategoryBudget(category, parseFloat(amt));
                                    }} className="text-slate-400 hover:text-slate-900 underline decoration-dashed">
                                        {budget > 0 ? `${state.currency}${budget.toLocaleString()}` : 'Set Budget'}
                                    </button>
                                </span>
                            </div>
                            {budget > 0 && (
                                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full ${alertColor} transition-all duration-500`} style={{ width: `${Math.min(percentage, 100)}%` }} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
