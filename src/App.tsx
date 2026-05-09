import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ShieldCheck, Rocket, Lock, ArrowRight, CheckCircle2, ChevronRight, UserCircle2, ShieldHalf, LogOut, Eye, EyeOff, Plus, FolderKanban, ExternalLink, Calendar, Clock, Users, Edit3, X, Save } from 'lucide-react';
import { Header } from './components/Header';
import { ProgressBar } from './components/ProgressBar';
import { FinanceCard } from './components/FinanceCard';
import { ProposedImprovements } from './components/ProposedImprovements';
import { Project, ImprovementPoint } from './types';
import { cn } from './lib/utils';
import { auth, db } from './lib/firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { 
  createProject, 
  getProjectsForClient, 
  getProjectsForAgency, 
  getProjectById, 
  approveProject, 
  updateProject,
  addImprovement, 
  updateImprovement, 
  addMilestone,
  updateMilestone,
  deleteMilestone
} from './lib/projectService';

const AGENCY_EMAILS = [
  'support@labinitial.com',
  'arafatinbusiness@gmail.com',
  'support@shopifyheroesagency.com',
  'arafat@labinitial.com',
  'arafat@shopifyheroesagency.com',
];

function detectRole(email: string): 'Agency' | 'Client' {
  return AGENCY_EMAILS.includes(email.toLowerCase()) ? 'Agency' : 'Client';
}

type View = 'login' | 'dashboard' | 'project';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'Agency' | 'Client'>('Client');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState('');
  const [currentView, setCurrentView] = useState<View>('login');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Create project form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newTotalValue, setNewTotalValue] = useState('1000');
  const [newStartDate, setNewStartDate] = useState('');

  // Edit project form state
  const [showEditForm, setShowEditForm] = useState(false);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDesc, setEditProjectDesc] = useState('');
  const [editClientEmail, setEditClientEmail] = useState('');
  const [editTotalValue, setEditTotalValue] = useState('');
  const [editStartDate, setEditStartDate] = useState('');

  // Milestone management state
  const [newMilestoneLabel, setNewMilestoneLabel] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');
  const [newMilestoneAmount, setNewMilestoneAmount] = useState('');
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editMilestoneLabel, setEditMilestoneLabel] = useState('');
  const [editMilestoneDate, setEditMilestoneDate] = useState('');
  const [editMilestoneAmount, setEditMilestoneAmount] = useState('');

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email) {
        setEmail(user.email);
        const role = detectRole(user.email);
        setUserRole(role);
        setIsAuthenticated(true);
        setCurrentView('dashboard');
        loadProjects(user.email, role);
      } else {
        setIsAuthenticated(false);
        setEmail('');
        setPassword('');
        setUserRole('Client');
        setCurrentView('login');
        setProjects([]);
        setSelectedProject(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadProjects = async (userEmail: string, role: 'Agency' | 'Client') => {
    setIsLoading(true);
    try {
      if (role === 'Agency') {
        const agencyProjects = await getProjectsForAgency(userEmail);
        setProjects(agencyProjects);
      } else {
        const clientProjects = await getProjectsForClient(userEmail);
        setProjects(clientProjects);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userEmail = userCredential.user.email || email;
      const role = detectRole(userEmail);
      setUserRole(role);
      setIsAuthenticated(true);
      setCurrentView('dashboard');
      await loadProjects(userEmail, role);
    } catch (error: any) {
      const errorMessages: Record<string, string> = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
      };
      setAuthError(errorMessages[error.code] || 'Authentication failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setAuthError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const userEmail = result.user.email;
      if (userEmail) {
        const role = detectRole(userEmail);
        setUserRole(role);
        setIsAuthenticated(true);
        setCurrentView('dashboard');
        await loadProjects(userEmail, role);
      }
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        setAuthError('Google sign-in failed. Please try again.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setIsAuthenticated(false);
    setEmail('');
    setPassword('');
    setUserRole('Client');
    setCurrentView('login');
    setProjects([]);
    setSelectedProject(null);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsLoading(true);
    try {
      const totalValue = parseFloat(newTotalValue) || 1000;
      const projectId = await createProject(newProjectName, newProjectDesc, newClientEmail, email, totalValue, newStartDate || undefined);
      // Reload projects
      const updatedProjects = await getProjectsForAgency(email);
      setProjects(updatedProjects);
      setShowCreateForm(false);
      setNewProjectName('');
      setNewProjectDesc('');
      setNewClientEmail('');
      setNewTotalValue('1000');
      setNewStartDate('');
    } catch (err) {
      console.error('Error creating project:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProject = async (projectId: string) => {
    setIsLoading(true);
    try {
      const project = await getProjectById(projectId);
      if (project) {
        setSelectedProject(project);
        setCurrentView('project');
      }
    } catch (err) {
      console.error('Error loading project:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    setSelectedProject(null);
    setCurrentView('dashboard');
    // Reload projects
    if (email) loadProjects(email, userRole);
  };

  const handleApprove = async () => {
    if (!selectedProject) return;
    try {
      await approveProject(selectedProject.id);
      setSelectedProject(prev => prev ? { ...prev, isApproved: true, approvedAt: new Date().toISOString() } : null);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#ffffff', '#0f172a']
      });
    } catch (err) {
      console.error('Error approving project:', err);
    }
  };

  const handleAddImprovement = async (title: string, description: string, imageUrl?: string) => {
    if (!selectedProject) return;
    const newPoint: ImprovementPoint = {
      id: crypto.randomUUID(),
      title,
      description,
      imageUrl,
      suggestedBy: userRole,
      agencyApproved: userRole === 'Agency',
      clientApproved: userRole === 'Client'
    };

    try {
      await addImprovement(selectedProject.id, newPoint);
      setSelectedProject(prev => prev ? {
        ...prev,
        improvements: [...(prev.improvements || []), newPoint]
      } : null);
    } catch (err) {
      console.error('Error adding improvement:', err);
    }
  };

  const handleApproveImprovement = async (id: string, role: 'Agency' | 'Client') => {
    if (!selectedProject) return;
    
    const point = selectedProject.improvements?.find(p => p.id === id);
    if (!point) return;

    const updates: Partial<ImprovementPoint> = {
      agencyApproved: role === 'Agency' ? true : point.agencyApproved,
      clientApproved: role === 'Client' ? true : point.clientApproved
    };

    try {
      await updateImprovement(selectedProject.id, id, updates);
      setSelectedProject(prev => {
        if (!prev) return null;
        const updatedImprovements = (prev.improvements || []).map(p => {
          if (p.id === id) {
            const updated = { ...p, ...updates };
            if (updated.agencyApproved && updated.clientApproved && (!p.agencyApproved || !p.clientApproved)) {
              confetti({
                particleCount: 50,
                spread: 40,
                origin: { y: 0.7 },
                colors: ['#10b981', '#34d399']
              });
            }
            return updated;
          }
          return p;
        });
        return { ...prev, improvements: updatedImprovements };
      });
    } catch (err) {
      console.error('Error approving improvement:', err);
    }
  };

  const handleOpenEditForm = () => {
    if (!selectedProject) return;
    setEditProjectName(selectedProject.name);
    setEditProjectDesc(selectedProject.description);
    setEditClientEmail(selectedProject.clientEmail);
    setEditTotalValue(String(selectedProject.totalValue || 0));
    setEditStartDate(selectedProject.startDate || '');
    setShowEditForm(true);
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    
    try {
      const updates: Partial<Project> = {
        name: editProjectName,
        description: editProjectDesc,
        clientEmail: editClientEmail.toLowerCase(),
        totalValue: parseFloat(editTotalValue) || 0,
        startDate: editStartDate || undefined,
      };
      
      await updateProject(selectedProject.id, updates);
      setSelectedProject(prev => prev ? { ...prev, ...updates } : null);
      setShowEditForm(false);
    } catch (err) {
      console.error('Error updating project:', err);
    }
  };

  // Login View
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 bg-[grid-white-fade] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />
        <div className="w-full max-w-md space-y-12 relative z-10">
          <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 bg-agency-black rounded-xl flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
              <span className="text-white font-black text-3xl">L</span>
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold tracking-tight uppercase text-agency-black">Labinitial</h1>
              <p className="text-agency-slate text-sm font-mono tracking-widest uppercase">Client Portal</p>
            </div>
          </div>

          {authError && (
            <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3">
              <p className="text-[11px] font-bold text-red-600 uppercase tracking-widest">{authError}</p>
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-[10px] uppercase tracking-[0.2em] text-agency-slate ml-1">
                Registered Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="you@email.com"
                  className="w-full bg-black/[0.02] border border-black/10 rounded-sm px-4 py-4 text-sm focus:outline-none focus:border-agency-green transition-colors placeholder:text-black/20 text-agency-black"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-black/20">
                  <Lock size={16} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-[10px] uppercase tracking-[0.2em] text-agency-slate ml-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter your password"
                  className="w-full bg-black/[0.02] border border-black/10 rounded-sm px-4 py-4 text-sm focus:outline-none focus:border-agency-green transition-colors placeholder:text-black/20 text-agency-black pr-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-4 flex items-center text-black/20 hover:text-agency-black transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn || !email || !password}
              className={cn(
                "w-full py-4 bg-agency-black text-white font-bold uppercase tracking-widest text-xs rounded-sm hover:bg-agency-green transition-all flex items-center justify-center gap-3",
                (isLoggingIn || !email || !password) && "opacity-50 grayscale cursor-not-allowed"
              )}
            >
              {isLoggingIn ? "Authenticating..." : "Sign In"}
              <ArrowRight size={16} />
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-black/10" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                <span className="bg-white px-4 text-slate-400 font-bold">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoggingIn}
              className={cn(
                "w-full py-4 border-2 border-black/10 text-agency-black font-bold uppercase tracking-widest text-xs rounded-sm hover:border-agency-green hover:bg-agency-green/5 transition-all flex items-center justify-center gap-3",
                isLoggingIn && "opacity-50 cursor-not-allowed"
              )}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>

            <p className="text-center text-[10px] text-agency-slate leading-relaxed">
              Proprietary access for Labinitial clients only.<br />
              Secure token-based authentication protocol active.
            </p>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard View
  if (currentView === 'dashboard') {
    return (
      <div className="min-h-screen bg-white">
        <Header projectName={selectedProject?.name} />
        
        {/* Role Indicator */}
        <div className="sticky top-20 z-30 bg-slate-50 border-b border-slate-200 py-2 px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Authenticated As:</span>
              <div className="flex items-center gap-3 bg-white border border-slate-200 px-3 py-1.5 rounded-sm">
                {userRole === 'Agency' ? (
                  <ShieldHalf size={14} className="text-blue-600" />
                ) : (
                  <UserCircle2 size={14} className="text-purple-600" />
                )}
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  userRole === 'Agency' ? "text-blue-600" : "text-purple-600"
                )}>
                  {userRole}
                </span>
                <span className="text-[9px] text-slate-400 font-mono">|</span>
                <span className="text-[9px] text-slate-500 font-mono">{email}</span>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-sm transition-all"
            >
              <LogOut size={12} />
              Sign Out
            </button>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-agency-black">
                {userRole === 'Agency' ? 'Projects' : 'My Projects'}
              </h1>
              <p className="text-agency-slate text-sm mt-2 font-mono">
                {userRole === 'Agency' 
                  ? 'Manage and oversee all client projects.' 
                  : 'View and approve your project scopes.'}
              </p>
            </div>
            {userRole === 'Agency' && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 bg-agency-black text-white px-5 py-3 rounded-sm font-bold uppercase tracking-widest text-xs hover:bg-agency-green transition-all"
              >
                <Plus size={14} />
                New Project
              </button>
            )}
          </div>

          {/* Create Project Form */}
          {showCreateForm && (
            <div className="mb-12 bg-slate-50 border border-slate-200 p-8 rounded-sm">
              <h2 className="text-lg font-bold text-agency-black mb-6 uppercase tracking-widest">Create New Project</h2>
              <form onSubmit={handleCreateProject} className="space-y-5">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-agency-slate mb-2">Project Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shopify Store Redesign"
                    className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-agency-green transition-colors"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-agency-slate mb-2">Description</label>
                  <textarea
                    required
                    placeholder="Brief project overview..."
                    rows={3}
                    className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-agency-green transition-colors resize-none"
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-agency-slate mb-2">Client Email</label>
                  <input
                    type="email"
                    required
                    placeholder="client@example.com"
                    className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-agency-green transition-colors"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-agency-slate mb-2">Total Project Value ($)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="1000.00"
                    className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-agency-green transition-colors"
                    value={newTotalValue}
                    onChange={(e) => setNewTotalValue(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-agency-slate mb-2">Start Date</label>
                  <input
                    type="date"
                    className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-agency-green transition-colors"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-agency-black text-white px-6 py-3 rounded-sm font-bold uppercase tracking-widest text-xs hover:bg-agency-green transition-all"
                  >
                    {isLoading ? 'Creating...' : 'Create Project'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-6 py-3 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-agency-black transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Projects List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-agency-slate text-sm font-mono">Loading projects...</div>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-sm">
              <FolderKanban size={40} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-400 mb-2">No Projects Yet</h3>
              <p className="text-sm text-slate-400">
                {userRole === 'Agency' 
                  ? 'Create your first project to get started.' 
                  : 'No projects have been assigned to you yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => {
                const improvements = project.improvements || [];
                const completedRevisions = improvements.filter(i => i.agencyApproved && i.clientApproved).length;
                const totalRevisions = improvements.length;
                const progress = totalRevisions > 0 ? Math.round((completedRevisions / totalRevisions) * 100) : 0;
                
                return (
                  <button
                    key={project.id}
                    onClick={() => handleSelectProject(project.id)}
                    className="text-left bg-white border border-slate-200 rounded-sm p-6 hover:border-agency-green hover:shadow-lg transition-all group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-agency-black text-base truncate">{project.name}</h3>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{project.description}</p>
                      </div>
                      <ExternalLink size={14} className="text-slate-300 group-hover:text-agency-green transition-colors shrink-0 ml-2" />
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <Users size={12} />
                        <span className="truncate">{project.clientEmail}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <Calendar size={12} />
                        <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-slate-400">Progress</span>
                          <span className={cn(
                            "font-bold",
                            progress === 100 ? "text-agency-green" : "text-agency-black"
                          )}>{progress}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              progress === 100 ? "bg-agency-green" : "bg-agency-black"
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {project.isApproved && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-agency-green uppercase tracking-widest">
                          <ShieldCheck size={12} />
                          Approved
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </main>

        <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-black/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 grayscale opacity-40">
            <div className="w-5 h-5 bg-agency-black flex items-center justify-center rounded-sm">
              <span className="text-white font-black text-[10px] tracking-tighter">L</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-agency-black">Labinitial</span>
          </div>
          <div className="text-[10px] font-mono text-agency-slate uppercase tracking-widest">
            © 2024 Labinitial Agency — All Rights Reserved — Performance Protocol ACTIVE
          </div>
        </footer>
      </div>
    );
  }

  // Project Detail View
  if (currentView === 'project' && selectedProject) {
    const improvements = selectedProject.improvements || [];
    const completedCount = improvements.filter(i => i.agencyApproved && i.clientApproved).length;
    const totalCount = improvements.length;

    return (
      <div className="min-h-screen bg-white">
        <Header projectName={selectedProject.name} />
        
        {/* Role Indicator */}
        <div className="sticky top-20 z-30 bg-slate-50 border-b border-slate-200 py-2 px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToDashboard}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-agency-black transition-all mr-2"
              >
                <ChevronRight size={12} className="rotate-180" />
                Back
              </button>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Authenticated As:</span>
              <div className="flex items-center gap-3 bg-white border border-slate-200 px-3 py-1.5 rounded-sm">
                {userRole === 'Agency' ? (
                  <ShieldHalf size={14} className="text-blue-600" />
                ) : (
                  <UserCircle2 size={14} className="text-purple-600" />
                )}
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  userRole === 'Agency' ? "text-blue-600" : "text-purple-600"
                )}>
                  {userRole}
                </span>
                <span className="text-[9px] text-slate-400 font-mono">|</span>
                <span className="text-[9px] text-slate-500 font-mono">{email}</span>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-sm transition-all"
            >
              <LogOut size={12} />
              Sign Out
            </button>
          </div>
        </div>
        
        <main className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left Column: Scope & Progress */}
            <div className="lg:col-span-8 space-y-16">
              {/* Project Overview */}
              <section className="space-y-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full">
                      <Rocket size={14} className="text-emerald-600" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">{selectedProject.name}</span>
                    </div>
                    {userRole === 'Agency' && (
                      <button
                        onClick={handleOpenEditForm}
                        className="p-1.5 bg-slate-100 border border-slate-200 rounded-sm hover:bg-agency-black hover:text-white hover:border-agency-black transition-all"
                        title="Edit Project"
                      >
                        <Edit3 size={12} />
                      </button>
                    )}
                  </div>
                  <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.9] text-agency-black">
                    Scope & <br />
                    <span className="text-emerald-600">Architecture.</span>
                  </h1>
                  <p className="text-agency-slate text-sm max-w-xl">{selectedProject.description}</p>
                </div>
                
                <ProgressBar current={completedCount} total={totalCount} />
              </section>

              {/* Proposed Improvements Section */}
              <div className="mt-20 pt-20 border-t-2 border-slate-100">
                <ProposedImprovements 
                  improvements={selectedProject.improvements || []}
                  onAddPoint={handleAddImprovement}
                  onApprove={handleApproveImprovement}
                  userRole={userRole}
                />
              </div>
              
              {/* Final Approval */}
              {!selectedProject.isApproved ? (
                <section className="bg-black/5 border border-dashed border-black/10 p-8 md:p-12 rounded-sm text-center space-y-8 mt-20">
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold tracking-tight text-agency-black">Ready to initiate build protocol?</h3>
                    <p className="text-agency-slate max-w-md mx-auto text-sm leading-relaxed">
                      By clicking approve, you confirm the {totalCount} technical points outlined above 
                      as the immutable scope for this milestone.
                    </p>
                  </div>
                  
                  <button
                    onClick={handleApprove}
                    className="group relative inline-flex items-center gap-4 bg-agency-green text-white px-10 py-5 rounded-sm font-bold uppercase tracking-[0.2em] text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_50px_rgba(39,174,96,0.3)]"
                  >
                    Approve Project Scope
                    <CheckCircle2 size={20} className="group-hover:rotate-12 transition-transform" />
                  </button>
                </section>
              ) : (
                <section className="bg-agency-green/5 border border-agency-green/20 p-8 rounded-sm flex flex-col md:flex-row items-center gap-6 justify-between mt-20">
                  <div className="flex items-center gap-4 text-center md:text-left">
                    <div className="w-12 h-12 rounded-full bg-agency-green/20 flex items-center justify-center text-agency-green shrink-0">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-agency-black">Project Scope Approved</h4>
                      <p className="text-agency-green text-sm font-mono font-medium">Verified: {selectedProject.approvedAt?.split('T')[0]}</p>
                    </div>
                  </div>
                  <div className="text-[10px] uppercase font-bold tracking-widest px-4 py-2 bg-agency-green text-white rounded-full">
                    Immutability Lock Active
                  </div>
                </section>
              )}
            </div>

            {/* Right Column: Cards & Meta */}
            <aside className="lg:col-span-4 space-y-8">
              <FinanceCard 
                totalValue={selectedProject.totalValue || 0} 
                milestones={selectedProject.milestones || []} 
              />
              
              {/* Milestones */}
              {selectedProject.milestones && selectedProject.milestones.length > 0 && (
                <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-sm space-y-6">
                  <h3 className="font-mono text-[11px] uppercase tracking-widest text-agency-black border-b border-emerald-100 pb-4 flex justify-between items-center font-bold">
                    Production Timeline
                    <ChevronRight size={14} className="text-emerald-500" />
                  </h3>
                  
                  <div className="space-y-4">
                    {selectedProject.milestones.map((item, idx) => (
                      <div key={idx} className={cn(
                        "flex items-center justify-between border-l-4 pl-4 py-1",
                        item.current ? "border-agency-green" : "border-slate-200"
                      )}>
                        <span className={cn("text-xs font-black uppercase tracking-tight", item.current ? "text-agency-black" : "text-slate-400")}>{item.label}</span>
                        <span className={cn("text-[10px] font-bold font-mono", item.current ? "text-agency-green" : "text-slate-400")}>{item.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-6 border border-black/5 rounded-sm bg-white group shadow-sm">
                <div className="text-[10px] uppercase tracking-widest text-agency-slate mb-3">Priority Support</div>
                <p className="text-xs text-agency-black/60 leading-relaxed mb-4">
                  Have questions about the technical roadmap? Direct line to your Lead Engineer is active.
                </p>
                <a 
                  href="mailto:support@labinitial.com"
                  className="text-[11px] font-bold uppercase tracking-widest border-b border-black/20 hover:border-agency-green transition-colors pb-1 text-agency-black"
                >
                  Contact Lead Engineer
                </a>
              </div>
            </aside>
          </div>
          {/* Edit Project Modal */}
          {showEditForm && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6 overflow-y-auto">
              <div className="bg-white w-full max-w-2xl rounded-sm shadow-2xl my-8">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                  <h2 className="text-sm font-black uppercase tracking-widest text-agency-black">Edit Project</h2>
                  <button
                    onClick={() => setShowEditForm(false)}
                    className="p-1 hover:bg-slate-100 rounded-sm transition-colors"
                  >
                    <X size={16} className="text-slate-400" />
                  </button>
                </div>
                <form onSubmit={handleUpdateProject} className="p-6 space-y-5">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-agency-slate mb-2">Project Name</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-agency-green transition-colors"
                      value={editProjectName}
                      onChange={(e) => setEditProjectName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-agency-slate mb-2">Description</label>
                    <textarea
                      required
                      rows={3}
                      className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-agency-green transition-colors resize-none"
                      value={editProjectDesc}
                      onChange={(e) => setEditProjectDesc(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-agency-slate mb-2">Client Email</label>
                    <input
                      type="email"
                      required
                      className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-agency-green transition-colors"
                      value={editClientEmail}
                      onChange={(e) => setEditClientEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-agency-slate mb-2">Total Project Value ($)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-agency-green transition-colors"
                      value={editTotalValue}
                      onChange={(e) => setEditTotalValue(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-agency-slate mb-2">Start Date</label>
                    <input
                      type="date"
                      className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-agency-green transition-colors"
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                    />
                  </div>

                  {/* Milestones Section */}
                  <div className="border-t border-slate-200 pt-6 mt-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-agency-black mb-4">Milestones & Budget</h3>
                    
                    {/* Existing Milestones */}
                    <div className="space-y-3 mb-6">
                      {(selectedProject?.milestones || []).map((ms) => (
                        <div key={ms.id} className="bg-slate-50 border border-slate-200 rounded-sm p-4">
                          {editingMilestoneId === ms.id ? (
                            <div className="space-y-3">
                              <input
                                type="text"
                                className="w-full bg-white border border-black/10 rounded-sm px-3 py-2 text-xs focus:outline-none focus:border-agency-green transition-colors"
                                value={editMilestoneLabel}
                                onChange={(e) => setEditMilestoneLabel(e.target.value)}
                                placeholder="Milestone label"
                              />
                              <div className="flex gap-2">
                                <input
                                  type="date"
                                  className="flex-1 bg-white border border-black/10 rounded-sm px-3 py-2 text-xs focus:outline-none focus:border-agency-green transition-colors"
                                  value={editMilestoneDate}
                                  onChange={(e) => setEditMilestoneDate(e.target.value)}
                                />
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="flex-1 bg-white border border-black/10 rounded-sm px-3 py-2 text-xs focus:outline-none focus:border-agency-green transition-colors"
                                  value={editMilestoneAmount}
                                  onChange={(e) => setEditMilestoneAmount(e.target.value)}
                                  placeholder="Amount ($)"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!selectedProject) return;
                                    await updateMilestone(selectedProject.id, ms.id, {
                                      label: editMilestoneLabel,
                                      date: editMilestoneDate,
                                      amount: parseFloat(editMilestoneAmount) || 0,
                                    });
                                    setSelectedProject(prev => prev ? {
                                      ...prev,
                                      milestones: prev.milestones.map(m => 
                                        m.id === ms.id ? { ...m, label: editMilestoneLabel, date: editMilestoneDate, amount: parseFloat(editMilestoneAmount) || 0 } : m
                                      )
                                    } : null);
                                    setEditingMilestoneId(null);
                                  }}
                                  className="text-[10px] font-bold uppercase tracking-widest bg-agency-green text-white px-3 py-1.5 rounded-sm hover:bg-agency-black transition-all"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingMilestoneId(null)}
                                  className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-3 py-1.5 hover:text-agency-black transition-all"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-agency-black">{ms.label}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">{ms.date}</span>
                                </div>
                                <span className="text-[10px] font-mono text-agency-green font-bold">${(ms.amount || 0).toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMilestoneId(ms.id);
                                    setEditMilestoneLabel(ms.label);
                                    setEditMilestoneDate(ms.date);
                                    setEditMilestoneAmount(String(ms.amount));
                                  }}
                                  className="p-1 hover:bg-slate-200 rounded-sm transition-colors"
                                >
                                  <Edit3 size={12} className="text-slate-400" />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!selectedProject) return;
                                    await deleteMilestone(selectedProject.id, ms.id);
                                    setSelectedProject(prev => prev ? {
                                      ...prev,
                                      milestones: prev.milestones.filter(m => m.id !== ms.id)
                                    } : null);
                                  }}
                                  className="p-1 hover:bg-red-50 rounded-sm transition-colors"
                                >
                                  <X size={12} className="text-red-400" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add New Milestone */}
                    <div className="bg-agency-green/5 border border-dashed border-agency-green/20 rounded-sm p-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-agency-green mb-3">Add Milestone</h4>
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Milestone label (e.g. Design Phase)"
                          className="w-full bg-white border border-black/10 rounded-sm px-3 py-2 text-xs focus:outline-none focus:border-agency-green transition-colors"
                          value={newMilestoneLabel}
                          onChange={(e) => setNewMilestoneLabel(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <input
                            type="date"
                            className="flex-1 bg-white border border-black/10 rounded-sm px-3 py-2 text-xs focus:outline-none focus:border-agency-green transition-colors"
                            value={newMilestoneDate}
                            onChange={(e) => setNewMilestoneDate(e.target.value)}
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Amount ($)"
                            className="flex-1 bg-white border border-black/10 rounded-sm px-3 py-2 text-xs focus:outline-none focus:border-agency-green transition-colors"
                            value={newMilestoneAmount}
                            onChange={(e) => setNewMilestoneAmount(e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!selectedProject || !newMilestoneLabel || !newMilestoneDate) return;
                            const newMs = {
                              id: crypto.randomUUID(),
                              label: newMilestoneLabel,
                              date: newMilestoneDate,
                              current: false,
                              completed: false,
                              amount: parseFloat(newMilestoneAmount) || 0,
                            };
                            await addMilestone(selectedProject.id, newMs);
                            setSelectedProject(prev => prev ? {
                              ...prev,
                              milestones: [...prev.milestones, newMs]
                            } : null);
                            setNewMilestoneLabel('');
                            setNewMilestoneDate('');
                            setNewMilestoneAmount('');
                          }}
                          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-agency-green text-white px-4 py-2 rounded-sm hover:bg-agency-black transition-all"
                        >
                          <Plus size={12} />
                          Add Milestone
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2 border-t border-slate-200">
                    <button
                      type="submit"
                      className="flex items-center gap-2 bg-agency-black text-white px-6 py-3 rounded-sm font-bold uppercase tracking-widest text-xs hover:bg-agency-green transition-all"
                    >
                      <Save size={14} />
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEditForm(false)}
                      className="px-6 py-3 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-agency-black transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
        
        <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-black/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 grayscale opacity-40">
            <div className="w-5 h-5 bg-agency-black flex items-center justify-center rounded-sm">
              <span className="text-white font-black text-[10px] tracking-tighter">L</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-agency-black">Labinitial</span>
          </div>
          <div className="text-[10px] font-mono text-agency-slate uppercase tracking-widest">
            © 2024 Labinitial Agency — All Rights Reserved — Performance Protocol ACTIVE
          </div>
        </footer>
      </div>
    );
  }

  return null;
}
