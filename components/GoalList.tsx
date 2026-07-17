
import React, { useState } from 'react';
// Fixed imports: added ProfileData
import { AppState, Goal, ProfileData } from '../types';
import { Plus, Trash2, Target, Calendar, CheckCircle2 } from 'lucide-react';

interface GoalListProps {
  // Fixed: state now includes ProfileData properties for the active profile
  state: AppState & ProfileData;
  onAdd: (goal: Omit<Goal, 'id'>) => void;
  onDelete: (id: string) => void;
}

export const GoalList: React.FC<GoalListProps> = ({ state, onAdd, onDelete }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [category, setCategory] = useState('Purchase');
  const [deadline, setDeadline] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount) return;
    onAdd({
      name,
      targetAmount: parseFloat(targetAmount),
      currentAmount: 0,
      category,
      deadline
    });
    setName('');
    setTargetAmount('');
    setDeadline('');
    setShowAdd(false);
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-black">Future Goals</h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="p-2 bg-blue-600 text-white rounded-full shadow-lg"
        >
          <Plus size={20} />
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm space-y-4 text-black">
          <div>
            <label className="block text-xs font-semibold opacity-60 mb-1">Goal Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="e.g. New Laptop, Vacation"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold opacity-60 mb-1">Target Amount ({state.currency})</label>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="0.00"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold opacity-60 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-black"
              >
                <option>Purchase</option>
                <option>Travel</option>
                <option>Vehicle</option>
                <option>Emergency</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold opacity-60 mb-1">Deadline (Optional)</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-black"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="flex-1 p-3 bg-slate-100 text-black rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 p-3 bg-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-200"
            >
              Add Goal
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {state.goals.length === 0 ? (
          <div className="text-center py-12 text-black opacity-30">
            <Target size={48} className="mx-auto mb-4" />
            <p>No active goals yet.</p>
            <p className="text-xs mt-2">Goals are automatically funded by {state.allocation.goals}% of your income.</p>
          </div>
        ) : (
          state.goals.map(goal => {
            const progress = (goal.currentAmount / goal.targetAmount) * 100;
            const isCompleted = progress >= 100;
            return (
              <div key={goal.id} className={`bg-white p-5 rounded-2xl border ${isCompleted ? 'border-green-100 bg-green-50/20' : 'border-slate-100'} shadow-sm text-black`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                      <Target size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-black flex items-center gap-2">
                        {goal.name}
                        {isCompleted && <CheckCircle2 size={14} className="text-green-600" />}
                      </h4>
                      <p className="text-[10px] opacity-40 uppercase font-bold tracking-wider">{goal.category}</p>
                    </div>
                  </div>
                  <button onClick={() => onDelete(goal.id)} className="text-black opacity-20 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>{state.currency}{Math.round(goal.currentAmount).toLocaleString()}</span>
                    <span className="opacity-40">Target: {state.currency}{goal.targetAmount.toLocaleString()}</span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ease-out ${isCompleted ? 'bg-green-500' : 'bg-blue-600'}`}
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] pt-1">
                    <span className={`font-bold ${isCompleted ? 'text-green-600' : 'text-blue-600'}`}>
                      {Math.round(progress)}% Completed
                    </span>
                    {goal.deadline && (
                      <span className="opacity-40 flex items-center gap-1">
                        <Calendar size={10} />
                        Deadline: {new Date(goal.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {state.goals.length > 0 && (
        <div className="p-4 bg-slate-100 rounded-2xl text-[10px] text-black opacity-50 text-center italic">
          Every time you add income, {state.allocation.goals}% is split equally among your active goals.
        </div>
      )}
    </div>
  );
};
