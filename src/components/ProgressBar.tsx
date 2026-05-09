import { cn } from '../lib/utils';

interface ProgressBarProps {
  current: number;
  total: number;
  doneCount: number;
}

export function ProgressBar({ current, total, doneCount }: ProgressBarProps) {
  const dualApprovedPercentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const completedPercentage = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="bg-white border-2 border-agency-black p-8 rounded-sm shadow-[12px_12px_0px_rgba(15,23,42,0.05)]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Development Agreements - Dual Approved */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-600 font-black">Development Agreements</span>
            </div>
            <span className="text-xs font-black font-mono text-emerald-600">{dualApprovedPercentage}%</span>
          </div>
          <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-1000 ease-out"
              style={{ width: `${dualApprovedPercentage}%` }}
            />
          </div>
          <div className="text-[10px] font-mono text-slate-400">
            <span className="font-black text-agency-black">{current}</span> / {total} Dual Approved
          </div>
        </div>

        {/* Right: Completed Task */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-blue-600 font-black">Completed Task</span>
            </div>
            <span className="text-xs font-black font-mono text-blue-600">{completedPercentage}%</span>
          </div>
          <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-1000 ease-out"
              style={{ width: `${completedPercentage}%` }}
            />
          </div>
          <div className="text-[10px] font-mono text-slate-400">
            <span className="font-black text-agency-black">{doneCount}</span> / {total} Completed
          </div>
        </div>
      </div>
    </div>
  );
}
