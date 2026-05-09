import { Activity, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

interface HeaderProps {
  projectName?: string;
}

export function Header({ projectName = 'Enterprise Core Migration' }: HeaderProps) {
  return (
    <header className="border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 bg-agency-black flex items-center justify-center rounded-sm">
              <span className="text-white font-black text-[12px] tracking-tighter">L</span>
            </div>
            <span className="font-bold text-lg tracking-[-0.03em] uppercase text-agency-black">Labinitial</span>
          </div>
          <div className="h-4 w-px bg-black/10 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2 py-1 px-3 bg-slate-50 rounded-full border border-slate-200">
            <div className="w-1.5 h-1.5 rounded-full bg-agency-green animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-agency-black">Client Portal v4.2</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[9px] uppercase tracking-widest text-emerald-600 font-black">Project Identity</span>
            <span className="text-xs font-black text-agency-black uppercase tracking-tight">{projectName}</span>
          </div>
          
          <div className="flex items-center gap-2 py-2 px-4 bg-emerald-50 border border-emerald-100 rounded-full">
            <Activity size={12} className="text-emerald-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Status: Active</span>
          </div>
        </div>
      </div>
    </header>
  );
}
