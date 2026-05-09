import { CheckCircle2, Clock, Plus, UserCircle2, ShieldHalf } from 'lucide-react';
import { useState } from 'react';
import { ProjectTask } from '../types';
import { cn } from '../lib/utils';

interface ScopeSectionProps {
  title: string;
  tasks: ProjectTask[];
  onToggleTask?: (taskId: string, role: 'Agency' | 'Client') => void;
  onAddTask?: (title: string, description: string) => void;
  userRole?: 'Agency' | 'Client';
}

export function ScopeSection({ title, tasks, onToggleTask, onAddTask, userRole }: ScopeSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim() && onAddTask) {
      onAddTask(newTitle, newDesc);
      setNewTitle('');
      setNewDesc('');
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b-2 border-agency-black pb-3">
        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-agency-black">{title}</h2>
        <div className="h-px flex-1 bg-slate-100" />
        <span className="text-[10px] font-black font-mono text-slate-400 uppercase tracking-widest">{tasks.length} Points</span>
        {userRole === 'Agency' && (
          <button 
            onClick={() => setIsAdding(true)}
            className="p-1.5 bg-agency-black text-white rounded-sm hover:bg-emerald-600 transition-colors"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-slate-50 border-2 border-dashed border-slate-200 p-5 rounded-sm space-y-3">
          <input 
            autoFocus
            placeholder="Task title"
            className="w-full bg-white border border-slate-200 px-4 py-2.5 text-sm font-bold focus:border-agency-black outline-none placeholder:text-slate-300"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
          />
          <textarea 
            placeholder="Description (optional)"
            className="w-full bg-white border border-slate-200 px-4 py-2.5 text-sm focus:border-agency-black outline-none placeholder:text-slate-300 min-h-[60px]"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <button 
              type="button" 
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-agency-black"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-1.5 bg-agency-black text-white text-[10px] font-black uppercase tracking-widest rounded-sm hover:bg-emerald-600 transition-colors"
            >
              Add Task
            </button>
          </div>
        </form>
      )}
      
      <div className="grid gap-2">
        {tasks.length === 0 && !isAdding && (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-sm">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">No tasks yet</p>
          </div>
        )}
        {tasks.map((task) => {
          const agencyApproved = task.agencyApproved || false;
          const clientApproved = task.clientApproved || false;
          const bothApproved = agencyApproved && clientApproved;

          return (
            <div 
              key={task.id}
              className={cn(
                "group bg-white p-5 flex items-center gap-5 border border-slate-100 rounded-sm transition-all hover:border-slate-200 hover:shadow-sm",
                !bothApproved && "opacity-60 saturate-0"
              )}
            >
              {/* Dual Approval Checkboxes */}
              <div className="flex flex-col gap-2 shrink-0">
                {/* Agency Approval */}
                <button
                  onClick={() => onToggleTask?.(task.id, 'Agency')}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-sm text-[9px] font-black uppercase tracking-widest transition-all",
                    agencyApproved 
                      ? "bg-blue-100 text-blue-700" 
                      : "bg-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-400"
                  )}
                  title={agencyApproved ? "Agency approved - click to revoke" : "Click to approve as Agency"}
                >
                  <ShieldHalf size={10} />
                  {agencyApproved ? 'Agency ✓' : 'Agency'}
                </button>
                
                {/* Client Approval */}
                <button
                  onClick={() => onToggleTask?.(task.id, 'Client')}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-sm text-[9px] font-black uppercase tracking-widest transition-all",
                    clientApproved 
                      ? "bg-purple-100 text-purple-700" 
                      : "bg-slate-100 text-slate-400 hover:bg-purple-50 hover:text-purple-400"
                  )}
                  title={clientApproved ? "Client approved - click to revoke" : "Click to approve as Client"}
                >
                  <UserCircle2 size={10} />
                  {clientApproved ? 'Client ✓' : 'Client'}
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h4 className={cn(
                    "text-[15px] font-black tracking-tight transition-colors",
                    bothApproved ? "text-agency-black" : "text-slate-400"
                  )}>
                    {task.title}
                  </h4>
                  {bothApproved && (
                    <div className="w-5 h-5 bg-agency-green rounded-sm flex items-center justify-center shadow-[0_4px_12px_rgba(16,185,129,0.2)] shrink-0">
                      <CheckCircle2 size={14} className="text-white" />
                    </div>
                  )}
                </div>
                {task.description && (
                  <p className={cn(
                    "text-[12px] leading-relaxed max-w-2xl font-bold transition-colors",
                    bothApproved ? "text-slate-700" : "text-slate-300"
                  )}>
                    {task.description}
                  </p>
                )}
              </div>

              {bothApproved && task.completedAt && (
                <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-sm">
                  <Clock size={11} className="text-emerald-600" />
                  <span className="text-[10px] font-black font-mono text-emerald-700 tabular-nums">
                    {task.completedAt}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
