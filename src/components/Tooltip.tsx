import { Info } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative inline-block group"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children || <Info size={14} className="text-agency-slate hover:text-white cursor-help transition-colors" />}
      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-agency-black border border-white/10 rounded-lg shadow-2xl text-[11px] leading-relaxed text-agency-slate animate-in fade-in slide-in-from-bottom-1 duration-200">
          <div className="font-mono uppercase tracking-wider text-white/40 mb-1">Consultant Note</div>
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white/10" />
        </div>
      )}
    </div>
  );
}
