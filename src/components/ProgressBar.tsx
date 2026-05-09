import { cn } from '../lib/utils';

interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="space-y-6 bg-white border-2 border-agency-black p-8 rounded-sm shadow-[12px_12px_0px_rgba(15,23,42,0.05)]">
      <div className="flex justify-between items-end">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-600 font-extrabold mb-1">Development Velocity</div>
          <div className="text-5xl font-black font-mono text-agency-black tracking-tighter">
            {percentage}% <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] ml-2">Complete</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.3em] text-agency-black font-black mb-1">Project Load</div>
          <div className="text-lg font-black font-mono text-agency-black">
            {current} <span className="text-emerald-500 mx-1">/</span> {total} 
            <span className="text-[10px] text-slate-300 ml-1 font-black">PTS</span>
          </div>
        </div>
      </div>
      <div className="h-5 w-full bg-slate-100 rounded-full overflow-hidden border-2 border-slate-200">
        <div 
          className="h-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 transition-all duration-1000 ease-out shadow-[0_0_25px_rgba(16,185,129,0.5)]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
