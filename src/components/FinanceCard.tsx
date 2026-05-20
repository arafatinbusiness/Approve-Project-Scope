import { BadgeCheck, CreditCard, DollarSign, ExternalLink, Plus, X, Edit3, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Milestone } from '../types';
import { cn } from '../lib/utils';

interface FinanceCardProps {
  totalValue: number;
  milestones: Milestone[];
  onAddMilestone: (label: string, date: string, amount: number) => Promise<void>;
  onUpdateMilestone: (id: string, updates: Partial<Milestone>) => Promise<void>;
  onDeleteMilestone: (id: string) => Promise<void>;
  userRole: 'Agency' | 'Client';
}

export function FinanceCard({ totalValue = 0, milestones = [], onAddMilestone, onUpdateMilestone, onDeleteMilestone, userRole }: FinanceCardProps) {
  const safeTotal = totalValue || 0;
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editAmount, setEditAmount] = useState('');
  
  const formatCurrency = (amount: number) => {
    const safeAmount = amount || 0;
    return safeAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const paidMilestones = milestones.filter(m => m.completed);
  const totalPaid = paidMilestones.reduce((sum, m) => sum + (m.amount || 0), 0);

  const handleAdd = async () => {
    if (!newLabel.trim() || !newDate.trim() || !newAmount.trim()) return;
    await onAddMilestone(newLabel, newDate, parseFloat(newAmount) || 0);
    setNewLabel('');
    setNewDate('');
    setNewAmount('');
    setIsAdding(false);
  };

  const handleStartEdit = (ms: Milestone) => {
    setEditingId(ms.id);
    setEditLabel(ms.label);
    setEditDate(ms.date);
    setEditAmount(String(ms.amount));
  };

  const handleSaveEdit = async (id: string) => {
    await onUpdateMilestone(id, {
      label: editLabel,
      date: editDate,
      amount: parseFloat(editAmount) || 0,
    });
    setEditingId(null);
  };

  return (
    <div className="bg-white border border-black/5 p-6 rounded-sm space-y-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-black/5 pb-4">
        <h3 className="font-mono text-[11px] uppercase tracking-widest text-agency-slate">Financial Transparency</h3>
        <div className="flex items-center gap-2">
          {userRole === 'Agency' && (
            <button
              onClick={() => setIsAdding(true)}
              className="p-1.5 bg-agency-black text-white rounded-sm hover:bg-emerald-600 transition-colors"
            >
              <Plus size={14} />
            </button>
          )}
          <CreditCard size={16} className="text-agency-slate" />
        </div>
      </div>
      
      <div className="space-y-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-600 font-black mb-1">Total Project Value</div>
          <div className="text-4xl font-black flex items-center gap-1 text-agency-black tracking-tighter">
            <span className="text-slate-400 text-2xl font-medium">$</span>
            {formatCurrency(totalValue).split('.')[0]}.<span className="text-sm text-slate-400 font-bold">{formatCurrency(totalValue).split('.')[1]}</span>
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-slate-100">
          {milestones.map((milestone) => (
            <div key={milestone.id} className="flex items-center justify-between group cursor-default">
              {editingId === milestone.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    className="flex-1 border border-slate-200 px-2 py-1 text-xs font-bold rounded-sm focus:border-agency-black outline-none"
                    value={editLabel}
                    onChange={e => setEditLabel(e.target.value)}
                  />
                  <input
                    type="date"
                    className="w-28 border border-slate-200 px-2 py-1 text-xs rounded-sm focus:border-agency-black outline-none"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                  />
                  <input
                    type="number"
                    className="w-20 border border-slate-200 px-2 py-1 text-xs font-mono rounded-sm focus:border-agency-black outline-none"
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                  />
                  <button onClick={() => handleSaveEdit(milestone.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-sm">
                    <Save size={14} />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-sm">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full",
                      milestone.completed ? "bg-agency-green shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-slate-200"
                    )} />
                    <span className={cn(
                      "text-[13px] font-black uppercase tracking-tight",
                      milestone.completed ? "text-agency-black" : "text-slate-600"
                    )}>
                      {milestone.label}
                    </span>
                    <span className={cn(
                      "text-[9px] font-mono",
                      milestone.completed ? "text-slate-400" : "text-slate-500"
                    )}>{milestone.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm font-black font-mono",
                      milestone.completed ? "text-agency-green" : "text-slate-500"
                    )}>
                      ${formatCurrency(milestone.amount)}
                    </span>
                    {milestone.completed ? (
                      <BadgeCheck size={18} className="text-agency-green" />
                    ) : (
                      <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-100" />
                    )}
                    {userRole === 'Agency' && (
                      <>
                        <button onClick={() => handleStartEdit(milestone)} className="p-1 text-slate-200 hover:text-agency-black opacity-0 group-hover:opacity-100 transition-all">
                          <Edit3 size={12} />
                        </button>
                        <button onClick={() => onDeleteMilestone(milestone.id)} className="p-1 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}

          {isAdding && (
            <div className="flex items-center gap-2 pt-2 border-t border-dashed border-slate-200">
              <input
                placeholder="Label"
                className="flex-1 border border-slate-200 px-2 py-1 text-xs font-bold rounded-sm focus:border-agency-black outline-none"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
              />
              <input
                type="date"
                className="w-28 border border-slate-200 px-2 py-1 text-xs rounded-sm focus:border-agency-black outline-none"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
              />
              <input
                type="number"
                placeholder="$"
                className="w-20 border border-slate-200 px-2 py-1 text-xs font-mono rounded-sm focus:border-agency-black outline-none"
                value={newAmount}
                onChange={e => setNewAmount(e.target.value)}
              />
              <button onClick={handleAdd} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-sm">
                <Save size={14} />
              </button>
              <button onClick={() => setIsAdding(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-sm">
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      <button className="w-full py-4 bg-slate-50 border border-slate-200 rounded-sm text-[10px] uppercase tracking-[0.2em] font-black hover:bg-slate-100 transition-all flex items-center justify-center gap-2 text-slate-500 hover:text-agency-black shadow-sm">
        View Invoices <ExternalLink size={12} />
      </button>
    </div>
  );
}
