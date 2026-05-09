import { Plus, User, Shield, Check, X, AlertCircle, Image, ExternalLink, CheckCircle, Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useState } from 'react';
import { ImprovementPoint } from '../types';
import { cn } from '../lib/utils';

const ITEMS_PER_PAGE = 50;

interface ProposedImprovementsProps {
  improvements: ImprovementPoint[];
  onAddPoint: (title: string, description: string, imageUrl?: string) => void;
  onApprove: (id: string, role: 'Agency' | 'Client') => void;
  onComplete: (id: string) => void;
  userRole: 'Agency' | 'Client';
}

function formatDate(isoString: string): string {
  if (!isoString) return 'N/A';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'N/A';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
}

export function ProposedImprovements({ improvements, onAddPoint, onApprove, onComplete, userRole }: ProposedImprovementsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(improvements.length / ITEMS_PER_PAGE));
  const paginatedImprovements = improvements.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      onAddPoint(newTitle, newDesc, newImageUrl || undefined);
      setNewTitle('');
      setNewDesc('');
      setNewImageUrl('');
      setImagePreview(null);
      setIsAdding(false);
    }
  };

  const handleCancel = () => {
    setNewTitle('');
    setNewDesc('');
    setNewImageUrl('');
    setImagePreview(null);
    setIsAdding(false);
  };

  const handleImageUrlChange = (url: string) => {
    setNewImageUrl(url);
    // Simple validation - if it looks like an image URL, show preview
    if (url && (url.match(/\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i) || url.includes('cloudinary') || url.includes('imgix') || url.includes('unsplash'))) {
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b-2 border-agency-black pb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-agency-black">Development Agreements</h2>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="p-2 bg-agency-black text-white rounded-sm hover:bg-emerald-600 transition-colors shadow-lg shadow-black/10"
        >
          <Plus size={16} />
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-slate-50 border-2 border-dashed border-slate-200 p-6 rounded-sm space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="space-y-4">
            <input 
              autoFocus
              placeholder="Agreement title (e.g., Performance Tier 2)"
              className="w-full bg-white border border-slate-200 px-4 py-3 text-sm font-bold focus:border-agency-black outline-none placeholder:text-slate-300"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
            />
            <textarea 
              placeholder="Technical description and justification..."
              className="w-full bg-white border border-slate-200 px-4 py-3 text-sm focus:border-agency-black outline-none placeholder:text-slate-300 min-h-[100px]"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
            />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Image size={14} className="text-slate-400" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">Attach Image URL (optional)</span>
              </div>
              <input 
                placeholder="https://example.com/image.png"
                className="w-full bg-white border border-slate-200 px-4 py-3 text-sm focus:border-agency-black outline-none placeholder:text-slate-300 font-mono text-xs"
                value={newImageUrl}
                onChange={e => handleImageUrlChange(e.target.value)}
              />
              {imagePreview && (
                <div className="relative rounded-sm overflow-hidden border border-slate-200 bg-white">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full h-48 object-cover"
                    onError={() => setImagePreview(null)}
                  />
                  <button
                    type="button"
                    onClick={() => { setNewImageUrl(''); setImagePreview(null); }}
                    className="absolute top-2 right-2 p-1 bg-white/90 rounded-sm hover:bg-white transition-colors shadow-sm"
                  >
                    <X size={14} className="text-slate-600" />
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button 
              type="button" 
              onClick={handleCancel}
              className="px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-agency-black"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-6 py-2 bg-agency-black text-white text-xs font-black uppercase tracking-widest rounded-sm hover:bg-emerald-600 transition-colors"
            >
              Propose Agreement
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4">
        {improvements.length === 0 && !isAdding && (
          <div className="text-center py-12 border border-slate-100 rounded-sm bg-white">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 text-slate-300 mb-4">
              <AlertCircle size={24} />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No agreements yet</p>
          </div>
        )}

        {paginatedImprovements.map((point) => {
          const isConfirmed = point.agencyApproved && point.clientApproved;
          
          return (
            <div 
              key={point.id}
              className={cn(
                "group bg-white p-6 border-2 rounded-sm transition-all relative overflow-hidden",
                isConfirmed ? "border-emerald-500 shadow-[8px_8px_0px_rgba(16,185,129,0.1)]" : "border-slate-100 shadow-sm"
              )}
            >
              {isConfirmed && (
                <div className="absolute top-0 right-0 py-1 px-3 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-bl-sm">
                  Confirmed Scope
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h4 className="text-base font-black tracking-tight text-agency-black uppercase">
                      {point.title}
                    </h4>
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                      point.suggestedBy === 'Agency' ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-purple-50 text-purple-600 border border-purple-100"
                    )}>
                      Proposed by {point.suggestedBy}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-bold leading-relaxed pr-8">
                    {point.description}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                    {point.createdAt && (
                      <div className="flex items-center gap-1.5">
                        <Calendar size={11} />
                        <span>Created {formatDate(point.createdAt)}</span>
                      </div>
                    )}
                    {point.estimatedDays && (
                      <div className="flex items-center gap-1.5 text-amber-600">
                        <Clock size={11} />
                        <span className="font-bold">Est. {(() => {
                          const d = point.estimatedDays!;
                          const totalMinutes = Math.round(d * 8 * 60);
                          if (totalMinutes < 60) return `${totalMinutes} min to implement or fix`;
                          const hours = Math.floor(totalMinutes / 60);
                          const mins = totalMinutes % 60;
                          if (hours < 8) return mins > 0 ? `${hours}h ${mins}m to implement or fix` : `${hours} hour${hours > 1 ? 's' : ''} to implement or fix`;
                          return `${d.toFixed(1)} day${d > 1 ? 's' : ''} to implement or fix`;
                        })()}</span>
                      </div>
                    )}
                  </div>
                  {point.imageUrl && (
                    <div className="mt-3">
                      <a 
                        href={point.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/image inline-flex items-center gap-2"
                      >
                        <div className="relative rounded-sm overflow-hidden border border-slate-200 bg-slate-50 w-64 h-36 group-hover/image:shadow-md transition-shadow">
                          <img 
                            src={point.imageUrl} 
                            alt={point.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              if (target.parentElement) {
                                target.parentElement.innerHTML = `
                                  <div class="flex items-center justify-center h-full text-slate-400">
                                    <div class="text-center p-4">
                                      <svg class="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                      </svg>
                                      <span class="text-[10px] font-mono">Image unavailable</span>
                                    </div>
                                  </div>
                                `;
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-colors flex items-center justify-center">
                            <ExternalLink size={16} className="text-white opacity-0 group-hover/image:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      </a>
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex items-center gap-4">
                  {/* Agency Approval Pillar */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Labinitial</div>
                    <button 
                      onClick={() => onApprove(point.id, 'Agency')}
                      disabled={userRole !== 'Agency' || point.agencyApproved}
                      className={cn(
                        "w-10 h-10 rounded-sm flex items-center justify-center border-2 transition-all",
                        point.agencyApproved 
                          ? "bg-emerald-500 border-emerald-500 text-white" 
                          : userRole === 'Agency' 
                            ? "bg-white border-slate-200 text-slate-300 hover:border-agency-black group/btn" 
                            : "bg-slate-50 border-slate-100 text-slate-200 cursor-not-allowed"
                      )}
                    >
                      {point.agencyApproved ? <Check size={20} strokeWidth={3} /> : <Shield size={18} className={userRole === 'Agency' ? "group-hover/btn:text-agency-black" : ""} />}
                    </button>
                  </div>

                  <div className="w-4 h-px bg-slate-200" />

                  {/* Client Approval Pillar */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Client</div>
                    <button 
                      onClick={() => onApprove(point.id, 'Client')}
                      disabled={userRole !== 'Client' || point.clientApproved}
                      className={cn(
                        "w-10 h-10 rounded-sm flex items-center justify-center border-2 transition-all",
                        point.clientApproved 
                          ? "bg-emerald-500 border-emerald-500 text-white" 
                          : userRole === 'Client' 
                            ? "bg-white border-slate-200 text-slate-300 hover:border-agency-black group/btn" 
                            : "bg-slate-50 border-slate-100 text-slate-200 cursor-not-allowed"
                      )}
                    >
                      {point.clientApproved ? <Check size={20} strokeWidth={3} /> : <User size={18} className={userRole === 'Client' ? "group-hover/btn:text-agency-black" : ""} />}
                    </button>
                  </div>

                  {/* Mark as Done - Client Only */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Done</div>
                    <button 
                      onClick={() => onComplete(point.id)}
                      disabled={userRole !== 'Client' || point.completed}
                      className={cn(
                        "w-10 h-10 rounded-sm flex items-center justify-center border-2 transition-all",
                        point.completed 
                          ? "bg-blue-500 border-blue-500 text-white" 
                          : userRole === 'Client' 
                            ? "bg-white border-slate-200 text-slate-300 hover:border-blue-500 group/btn" 
                            : "bg-slate-50 border-slate-100 text-slate-200 cursor-not-allowed"
                      )}
                      title={point.completed ? `Completed ${point.completedAt ? new Date(point.completedAt).toLocaleDateString() : ''}` : 'Mark as done'}
                    >
                      {point.completed ? <Check size={20} strokeWidth={3} /> : <CheckCircle size={18} className={userRole === 'Client' ? "group-hover/btn:text-blue-500" : ""} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <div className="text-[10px] font-mono text-slate-400">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, improvements.length)} of {improvements.length} agreements
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all",
                currentPage === 1
                  ? "text-slate-300 cursor-not-allowed"
                  : "text-slate-500 hover:text-agency-black hover:bg-slate-100"
              )}
            >
              <ChevronLeft size={12} />
              Prev
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    "w-7 h-7 text-[10px] font-black rounded-sm transition-all",
                    page === currentPage
                      ? "bg-agency-black text-white"
                      : "text-slate-400 hover:text-agency-black hover:bg-slate-100"
                  )}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all",
                currentPage === totalPages
                  ? "text-slate-300 cursor-not-allowed"
                  : "text-slate-500 hover:text-agency-black hover:bg-slate-100"
              )}
            >
              Next
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
