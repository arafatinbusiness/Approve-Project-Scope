import { BadgeCheck, CreditCard, DollarSign, ExternalLink } from 'lucide-react';
import { Milestone } from '../types';
import { cn } from '../lib/utils';

interface FinanceCardProps {
  totalValue: number;
  milestones: Milestone[];
}

export function FinanceCard({ totalValue = 0, milestones = [] }: FinanceCardProps) {
  const safeTotal = totalValue || 0;
  
  const formatCurrency = (amount: number) => {
    const safeAmount = amount || 0;
    return safeAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const paidMilestones = milestones.filter(m => m.completed);
  const totalPaid = paidMilestones.reduce((sum, m) => sum + (m.amount || 0), 0);

  return (
    <div className="bg-white border border-black/5 p-6 rounded-sm space-y-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-black/5 pb-4">
        <h3 className="font-mono text-[11px] uppercase tracking-widest text-agency-slate">Financial Transparency</h3>
        <CreditCard size={16} className="text-agency-slate" />
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
          {milestones.map((milestone, idx) => (
            <div key={idx} className="flex items-center justify-between group cursor-default">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  milestone.completed ? "bg-agency-green shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-slate-200"
                )} />
                <span className={cn(
                  "text-[13px] font-black uppercase tracking-tight",
                  milestone.completed ? "text-agency-black" : "text-slate-300"
                )}>
                  {milestone.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-sm font-black font-mono",
                  milestone.completed ? "text-agency-green" : "text-slate-200"
                )}>
                  ${formatCurrency(milestone.amount)}
                </span>
                {milestone.completed ? (
                  <BadgeCheck size={18} className="text-agency-green" />
                ) : (
                  <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-100" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="w-full py-4 bg-slate-50 border border-slate-200 rounded-sm text-[10px] uppercase tracking-[0.2em] font-black hover:bg-slate-100 transition-all flex items-center justify-center gap-2 text-slate-500 hover:text-agency-black shadow-sm">
        View Invoices <ExternalLink size={12} />
      </button>
    </div>
  );
}
