import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ShieldCheck, Rocket, Lock, ArrowRight, CheckCircle2, ChevronRight, UserCircle2, ShieldHalf, LogOut, Eye, EyeOff, Plus, FolderKanban, ExternalLink, Calendar, Clock, Users, Edit3, X, Save, Download, Filter } from 'lucide-react';
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
  completeImprovement,
  addMilestone,
  updateMilestone,
  deleteMilestone,
  updateTotalEstimatedDays,
  updatePopupClosedAt,
  updateLastLoginAt
} from './lib/projectService';
import * as XLSX from 'xlsx';
import { estimateTaskDays } from './lib/aiService';

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

function formatEstimate(days: number): string {
  if (!days || days <= 0) return '';
  const totalMinutes = Math.round(days * 8 * 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours < 8) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  const d = days;
  return `${d.toFixed(1)} day${d > 1 ? 's' : ''}`;
}

function formatDate(isoString: string): string {
  if (!isoString) return 'N/A';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'N/A';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
}

function formatDateTime(isoString: string): string {
  if (!isoString) return 'N/A';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'N/A';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()} at ${hour12}:${minutes} ${ampm}`;
}

function getImprovementStatus(point: ImprovementPoint): string {
  const parts: string[] = [];
  parts.push(`"${point.title}"`);
  if (point.agencyApproved && point.clientApproved) {
    parts.push('Dual Approved');
  } else if (point.agencyApproved) {
    parts.push('Agency Approved');
  } else if (point.clientApproved) {
    parts.push('Client Approved');
  } else {
    parts.push('Pending Approval');
  }
  if (point.completed) {
    parts.push('Completed');
  } else {
    parts.push('Not Completed');
  }
  parts.push(`Created: ${formatDate(point.createdAt)}`);
  if (point.estimatedDays) {
    parts.push(`Est: ${formatEstimate(point.estimatedDays)}`);
  }
  return parts.join(' | ');
}

function buildCurrentWebsiteUpdates(improvements: ImprovementPoint[]): string {
  if (improvements.length === 0) return 'No agreements yet';
  return improvements.map((point, idx) => {
    return `${idx + 1}. ${getImprovementStatus(point)}`;
  }).join('\n                    .\n');
}

function exportToExcel(project: Project) {
  const improvements = project.improvements || [];
  
  const row = {
    'First Name': project.clientFirstName || '',
    'Last Name': project.clientLastName || '',
    'Company': project.clientCompany || '',
    'Website': project.clientWebsite || '',
    'Email': project.clientEmail,
    'Current Website Updates': buildCurrentWebsiteUpdates(improvements),
  };

  const ws = XLSX.utils.json_to_sheet([row]);
  ws['!cols'] = [
    { wch: 15 },
    { wch: 15 },
    { wch: 25 },
    { wch: 30 },
    { wch: 30 },
    { wch: 120 },
  ];

  // Enable text wrapping for the Current Website Updates column
  ws['!rows'] = [{ hpx: 200 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Website Updates');
  
  const dateStr = new Date().toISOString().split('T')[0];
  const safeName = project.name.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `${safeName}_${dateStr}.xlsx`);
}

function exportToExcelWithFilter(project: Project, dateFrom: string, dateTo: string) {
  const improvements = project.improvements || [];
  
  const filtered = improvements.filter(point => {
    if (!dateFrom && !dateTo) return true;
    const created = new Date(point.createdAt).getTime();
    if (dateFrom && created < new Date(dateFrom).getTime()) return false;
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      if (created > endDate.getTime()) return false;
    }
    return true;
  });

  const row = {
    'First Name': project.clientFirstName || '',
    'Last Name': project.clientLastName || '',
    'Company': project.clientCompany || '',
    'Website': project.clientWebsite || '',
    'Email': project.clientEmail,
    'Current Website Updates': buildCurrentWebsiteUpdates(filtered),
  };

  const ws = XLSX.utils.json_to_sheet([row]);
  ws['!cols'] = [
    { wch: 15 },
    { wch: 15 },
    { wch: 25 },
    { wch: 30 },
    { wch: 30 },
    { wch: 120 },
  ];

  ws['!rows'] = [{ hpx: 200 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Website Updates');
  
  const dateStr = new Date().toISOString().split('T')[0];
  const safeName = project.name.replace(/[^a-zA-Z0-9]/g, '_');
  const filterStr = dateFrom || dateTo ? `_filtered_${dateFrom || ''}_${dateTo || ''}` : '';
  XLSX.writeFile(wb, `${safeName}${filterStr}_${dateStr}.xlsx`);
}

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
  const [newClientFirstName, setNewClientFirstName] = useState('');
  const [newClientLastName, setNewClientLastName] = useState('');
  const [newClientCompany, setNewClientCompany] = useState('');
  const [newClientWebsite, setNewClientWebsite] = useState('');
  const [newTotalValue, setNewTotalValue] = useState('1000');
  const [newStartDate, setNewStartDate] = useState('');

  // Edit project form state
  const [showEditForm, setShowEditForm] = useState(false);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDesc, setEditProjectDesc] = useState('');
  const [editClientEmail, setEditClientEmail] = useState('');
  const [editClientFirstName, setEditClientFirstName] = useState('');
  const [editClientLastName, setEditClientLastName] = useState('');
  const [editClientCompany, setEditClientCompany] = useState('');
  const [editClientWebsite, setEditClientWebsite] = useState('');
  const [editTotalValue, setEditTotalValue] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editPopupDelayDays, setEditPopupDelayDays] = useState('1');

  // Milestone management state
  const [newMilestoneLabel, setNewMilestoneLabel] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');
  const [newMilestoneAmount, setNewMilestoneAmount] = useState('');
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editMilestoneLabel, setEditMilestoneLabel] = useState('');
  const [editMilestoneDate, setEditMilestoneDate] = useState('');
  const [editMilestoneAmount, setEditMilestoneAmount] = useState('');

  // Export filter state
  const [showExportFilter, setShowExportFilter] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');

  // Payment reminder popup state
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  // Completion celebration popup state
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);

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
      const projectId = await createProject(
        newProjectName, 
        newProjectDesc, 
        newClientEmail, 
        email, 
        totalValue, 
        newStartDate || undefined,
        newClientFirstName || undefined,
        newClientLastName || undefined,
        newClientCompany || undefined,
        newClientWebsite || undefined
      );
      const updatedProjects = await getProjectsForAgency(email);
      setProjects(updatedProjects);
      setShowCreateForm(false);
      setNewProjectName('');
      setNewProjectDesc('');
      setNewClientEmail('');
      setNewClientFirstName('');
      setNewClientLastName('');
      setNewClientCompany('');
      setNewClientWebsite('');
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
        // If client is viewing, update last login timestamp
        if (userRole === 'Client') {
          updateLastLoginAt(projectId).catch(err => {
            console.error('Error updating last login:', err);
          });
        }
      }
    } catch (err) {
      console.error('Error loading project:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if payment reminder popup should show (once per 24 hours)
  useEffect(() => {
    if (!selectedProject || userRole !== 'Client') {
      setShowPaymentPopup(false);
      return;
    }

    const milestones = selectedProject.milestones || [];
    const allPaid = milestones.length > 0 && milestones.every(m => m.completed);
    
    // If all milestones are paid (or no milestones but nothing is due), don't show
    if (allPaid) {
      setShowPaymentPopup(false);
      return;
    }

    // Check cooldown based on popupDelayDays (default 1 day)
    const delayDays = selectedProject.popupDelayDays ?? 1;
    const popupClosedAt = selectedProject.popupClosedAt;
    if (popupClosedAt) {
      const closedTime = new Date(popupClosedAt).getTime();
      const now = Date.now();
      const hoursSinceClosed = (now - closedTime) / (1000 * 60 * 60);
      const requiredHours = delayDays * 24;
      if (hoursSinceClosed < requiredHours) {
        setShowPaymentPopup(false);
        return;
      }
    }

    // Show the popup
    setShowPaymentPopup(true);
  }, [selectedProject?.id, userRole]);

  // Check if all tasks are completed — show celebration popup
  useEffect(() => {
    if (!selectedProject) {
      setShowCompletionPopup(false);
      return;
    }
    const improvements = selectedProject.improvements || [];
    const allDone = improvements.length > 0 && improvements.every(i => i.completed);
    if (allDone) {
      setShowCompletionPopup(true);
      // Fire confetti for celebration
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444']
      });
    } else {
      setShowCompletionPopup(false);
    }
  }, [selectedProject?.improvements]);

  const handleClosePaymentPopup = async () => {
    if (!selectedProject) return;
    setShowPaymentPopup(false);
    // Store the close timestamp in Firestore
    await updatePopupClosedAt(selectedProject.id);
    // Update local state
    setSelectedProject(prev => prev ? { ...prev, popupClosedAt: new Date().toISOString() } : null);
  };

  const handleCloseCompletionPopup = () => {
    setShowCompletionPopup(false);
  };

  const handleBackToDashboard = () => {
    setSelectedProject(null);
    setCurrentView('dashboard');
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
      ...(imageUrl ? { imageUrl } : {}),
      suggestedBy: userRole,
      agencyApproved: userRole === 'Agency',
      clientApproved: userRole === 'Client',
      completed: false,
      createdAt: new Date().toISOString(),
    };

    // AI estimate the task duration
    estimateTaskDays(title, description).then(estimatedDays => {
      newPoint.estimatedDays = estimatedDays;
      // Update Firestore with the estimate
      updateImprovement(selectedProject.id, newPoint.id, { estimatedDays }).catch(err => {
        console.error('Error updating estimate:', err);
      });
      // Update local state and recalculate total
      setSelectedProject(prev => {
        if (!prev) return null;
        const updatedImprovements = (prev.improvements || []).map(p =>
          p.id === newPoint.id ? { ...p, estimatedDays } : p
        );
        // Exclude completed tasks from total estimate
        const newTotal = updatedImprovements.reduce((sum, p) => sum + (p.completed ? 0 : (p.estimatedDays || 0)), 0);
        // Also update the total in Firestore
        updateTotalEstimatedDays(prev.id, newTotal).catch(err => {
          console.error('Error updating total estimate:', err);
        });
        return {
          ...prev,
          improvements: updatedImprovements,
          totalEstimatedDays: newTotal
        };
      });
    });

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

  const handleCompleteImprovement = async (id: string) => {
    if (!selectedProject) return;
    
    try {
      await completeImprovement(selectedProject.id, id);
      setSelectedProject(prev => {
        if (!prev) return null;
        const updatedImprovements = (prev.improvements || []).map(p => {
          if (p.id === id) {
            return { ...p, completed: true, completedAt: new Date().toISOString() };
          }
          return p;
        });
        // Recalculate total excluding completed tasks
        const newTotal = updatedImprovements.reduce((sum, p) => sum + (p.completed ? 0 : (p.estimatedDays || 0)), 0);
        updateTotalEstimatedDays(prev.id, newTotal).catch(err => {
          console.error('Error updating total estimate:', err);
        });
        return { ...prev, improvements: updatedImprovements, totalEstimatedDays: newTotal };
      });
    } catch (err) {
      console.error('Error completing improvement:', err);
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
    setEditClientFirstName(selectedProject.clientFirstName || '');
    setEditClientLastName(selectedProject.clientLastName || '');
    setEditClientCompany(selectedProject.clientCompany || '');
    setEditClientWebsite(selectedProject.clientWebsite || '');
    setEditTotalValue(String(selectedProject.totalValue || 0));
    setEditStartDate(selectedProject.startDate || '');
    setEditPopupDelayDays(String(selectedProject.popupDelayDays ?? 1));
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
        clientFirstName: editClientFirstName || '',
        clientLastName: editClientLastName || '',
        clientCompany: editClientCompany || '',
        clientWebsite: editClientWebsite || '',
        totalValue: parseFloat(editTotalValue) || 0,
        startDate: editStartDate || undefined,
        popupDelayDays: parseInt(editPopupDelayDays) || 1,
      };
      
      await updateProject(selectedProject.id, updates);
      setSelectedProject(prev => prev ? { ...prev, ...updates } : null);
      setShowEditForm(false);
    } catch (err) {
      console.error('Error updating project:', err);
    }
  };

  const handleExportAll = () => {
    if (!selectedProject) return;
    exportToExcel(selectedProject);
  };

  const handleExportFiltered = () => {
    if (!selectedProject) return;
    exportToExcelWithFilter(selectedProject, exportDateFrom, exportDateTo);
    setShowExportFilter(false);
    setExportDateFrom('');
    setExportDateTo('');
  };

  const [isEstimating, setIsEstimating] = useState(false);

  const handleGenerateEstimate = async () => {
    if (!selectedProject) return;
    setIsEstimating(true);
    try {
      const improvements = selectedProject.improvements || [];
      // Find tasks that don't have estimates yet
      const unestimated = improvements.filter(p => !p.estimatedDays);
      
      // Estimate all unestimated tasks in parallel
      const estimates = await Promise.all(
        unestimated.map(p => estimateTaskDays(p.title, p.description))
      );
      
      // Update each task with its estimate
      const updatedImprovements = improvements.map(p => {
        if (!p.estimatedDays) {
          const idx = unestimated.indexOf(p);
          return { ...p, estimatedDays: estimates[idx] };
        }
        return p;
      });
      
      // Calculate total (exclude completed tasks)
      const totalDays = updatedImprovements.reduce((sum, p) => sum + (p.completed ? 0 : (p.estimatedDays || 0)), 0);
      
      // Save to Firestore
      await updateTotalEstimatedDays(selectedProject.id, totalDays);
      
      // Update all unestimated tasks in Firestore
      await Promise.all(
        unestimated.map((p, idx) => 
          updateImprovement(selectedProject.id, p.id, { estimatedDays: estimates[idx] })
        )
      );
      
      // Update local state
      setSelectedProject(prev => prev ? {
        ...prev,
        improvements: updatedImprovements,
        totalEstimatedDays: totalDays
      } : null);
    } catch (err) {
      console.error('Error generating estimate:', err);
    } finally {
      setIsEstimating(false);
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-agency-slate mb-2">Client First Name</label>
                    <input
                      type="text"
                      placeholder="John"
                      className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-agency-green transition-colors"
                      value={newClientFirstName}
                      onChange={(e) => setNewClientFirstName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-agency-slate mb-2">Client Last Name</label>
                    <input
                      type="text"
                      placeholder="Doe"
                      className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-agency-green transition-colors"
                      value={newClientLastName}
                      onChange={(e) => setNewClientLastName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-agency-slate mb-2">Client Company</label>
                    <input
                      type="text"
                      placeholder="Acme Inc."
                      className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-agency-green transition-colors"
                      value={newClientCompany}
                      onChange={(e) => setNewClientCompany(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-agency-slate mb-2">Client Website</label>
                    <input
                      type="text"
                      placeholder="https://acme.com"
                      className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-agency-green transition-colors"
                      value={newClientWebsite}
                      onChange={(e) => setNewClientWebsite(e.target.value)}
                    />
                  </div>
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

          {/* Project List */}
          {isLoading ? (
            <div className="grid gap-4">
              {[1,2,3].map(i => (
                <div key={i} className="bg-slate-50 border border-slate-100 p-8 rounded-sm animate-pulse">
                  <div className="h-6 bg-slate-200 rounded w-1/3 mb-3" />
                  <div className="h-4 bg-slate-100 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4">
              {projects.map(project => (
                <button
                  key={project.id}
                  onClick={() => handleSelectProject(project.id)}
                  className="group bg-white border-2 border-slate-100 p-8 rounded-sm hover:border-agency-black transition-all text-left shadow-sm hover:shadow-[8px_8px_0px_rgba(15,23,42,0.05)]"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-black tracking-tight text-agency-black uppercase">
                          {project.name}
                        </h3>
                        {project.isApproved && (
                          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full">
                            Approved
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-bold">{project.description}</p>
                      <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
                        <span>{project.clientEmail}</span>
                        {project.clientFirstName && <span>{project.clientFirstName} {project.clientLastName}</span>}
                        {project.clientCompany && <span>{project.clientCompany}</span>}
                        <span>${project.totalValue?.toLocaleString()}</span>
                        <span>{formatDate(project.createdAt)}</span>
                        {userRole === 'Agency' && project.lastLoginAt && (
                          <span className="text-amber-600" title="Client last login">
                            Last login: {formatDateTime(project.lastLoginAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-slate-200 group-hover:text-agency-black transition-colors" />
                  </div>
                </button>
              ))}
              {projects.length === 0 && (
                <div className="text-center py-20 border border-slate-100 rounded-sm bg-white">
                  <FolderKanban size={40} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {userRole === 'Agency' ? 'No projects yet. Create your first project.' : 'No projects assigned yet.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  // Project View
  if (!selectedProject) return null;

  const improvements = selectedProject.improvements || [];
  const completedCount = improvements.filter(i => i.agencyApproved && i.clientApproved).length;
  const doneCount = improvements.filter(i => i.completed).length;
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
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-agency-black transition-colors"
            >
              <ChevronRight size={14} className="rotate-180" />
              Back to Dashboard
            </button>
            <span className="text-[9px] text-slate-200">|</span>
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
          <div className="flex items-center gap-3">
            {userRole === 'Agency' && (
              <button
                onClick={handleOpenEditForm}
                className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-agency-black hover:bg-slate-100 rounded-sm transition-all"
              >
                <Edit3 size={12} />
                Edit Project
              </button>
            )}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-sm transition-all"
            >
              <LogOut size={12} />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        {/* Project Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-agency-black uppercase">
                {selectedProject.name}
              </h1>
              {selectedProject.isApproved && (
                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full">
                  Approved
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 font-bold">{selectedProject.description}</p>
            <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
              <span>{selectedProject.clientEmail}</span>
              {selectedProject.clientFirstName && <span>{selectedProject.clientFirstName} {selectedProject.clientLastName}</span>}
              {selectedProject.clientCompany && <span>{selectedProject.clientCompany}</span>}
              {selectedProject.clientWebsite && <span>{selectedProject.clientWebsite}</span>}
              <span>${selectedProject.totalValue?.toLocaleString()}</span>
              <span>Created {formatDate(selectedProject.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Export buttons */}
            <div className="relative">
              <button
                onClick={() => setShowExportFilter(!showExportFilter)}
                className="flex items-center gap-2 px-4 py-2 border-2 border-slate-200 text-xs font-black uppercase tracking-widest rounded-sm hover:border-agency-black transition-all"
              >
                <Download size={14} />
                Export
              </button>
              {showExportFilter && (
                <div className="absolute right-0 top-full mt-2 bg-white border-2 border-agency-black p-4 rounded-sm shadow-xl z-50 min-w-[280px]">
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-agency-black">Export with Date Filter</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest text-slate-400 mb-1">From</label>
                        <input
                          type="date"
                          className="w-full border border-slate-200 px-2 py-1.5 text-xs rounded-sm focus:border-agency-black outline-none"
                          value={exportDateFrom}
                          onChange={(e) => setExportDateFrom(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase tracking-widest text-slate-400 mb-1">To</label>
                        <input
                          type="date"
                          className="w-full border border-slate-200 px-2 py-1.5 text-xs rounded-sm focus:border-agency-black outline-none"
                          value={exportDateTo}
                          onChange={(e) => setExportDateTo(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleExportFiltered}
                        className="flex-1 bg-agency-black text-white px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-sm hover:bg-emerald-600 transition-all"
                      >
                        Export Filtered
                      </button>
                      <button
                        onClick={handleExportAll}
                        className="flex-1 border-2 border-slate-200 px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-sm hover:border-agency-black transition-all"
                      >
                        Export All
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {!selectedProject.isApproved && userRole === 'Client' && (
              <button
                onClick={handleApprove}
                className="flex items-center gap-2 bg-emerald-500 text-white px-5 py-3 rounded-sm font-bold uppercase tracking-widest text-xs hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
              >
                <ShieldCheck size={16} />
                Approve Project
              </button>
            )}
          </div>
        </div>

        {/* AI Estimated Completion Board */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-sm p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <Clock size={24} className="text-amber-600" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-amber-700 font-black mb-1">
                  AI Estimated Completion
                </div>
                {selectedProject.totalEstimatedDays ? (
                  <div className="space-y-1">
                    {(() => {
                      const totalDays = selectedProject.totalEstimatedDays!;
                      const totalHours = totalDays * 8;
                      const display = totalDays < 1
                        ? `${Math.round(totalHours)} hour${Math.round(totalHours) > 1 ? 's' : ''}`
                        : `${totalDays.toFixed(1)} working day${totalDays > 1 ? 's' : ''}`;
                      return (
                        <div className="text-2xl font-black text-amber-900">
                          {display}
                        </div>
                      );
                    })()}
                    <div className="text-[11px] font-bold text-amber-700">
                      No sleep, no breaks, no rest — pure active work only
                    </div>
                    <div className="text-[10px] font-mono text-amber-500">
                      Based on {improvements.length} agreement{improvements.length > 1 ? 's' : ''}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-amber-700 font-bold">
                    {improvements.length === 0 
                      ? 'No agreements to estimate yet'
                      : 'Click "Generate Estimate" to calculate'}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleGenerateEstimate}
              disabled={isEstimating || improvements.length === 0}
              className={cn(
                "flex items-center gap-2 px-5 py-3 rounded-sm font-bold uppercase tracking-widest text-xs transition-all",
                isEstimating || improvements.length === 0
                  ? "bg-amber-200 text-amber-400 cursor-not-allowed"
                  : "bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-600/20"
              )}
            >
              <Clock size={14} className={isEstimating ? "animate-spin" : ""} />
              {isEstimating ? 'Estimating...' : selectedProject.totalEstimatedDays ? 'Re-Generate' : 'Generate Estimate'}
            </button>
          </div>
        </div>

        {/* Edit Project Form */}
        {showEditForm && (
          <div className="bg-slate-50 border border-slate-200 p-8 rounded-sm">
            <h2 className="text-lg font-bold text-agency-black mb-6 uppercase tracking-widest">Edit Project</h2>
            <form onSubmit={handleUpdateProject} className="space-y-5">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-agency-slate mb-2">Client First Name</label>
                  <input
                    type="text"
                    className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-agency-green transition-colors"
                    value={editClientFirstName}
                    onChange={(e) => setEditClientFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-agency-slate mb-2">Client Last Name</label>
                  <input
                    type="text"
                    className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-agency-green transition-colors"
                    value={editClientLastName}
                    onChange={(e) => setEditClientLastName(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-agency-slate mb-2">Client Company</label>
                  <input
                    type="text"
                    className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-agency-green transition-colors"
                    value={editClientCompany}
                    onChange={(e) => setEditClientCompany(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-agency-slate mb-2">Client Website</label>
                  <input
                    type="text"
                    className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-agency-green transition-colors"
                    value={editClientWebsite}
                    onChange={(e) => setEditClientWebsite(e.target.value)}
                  />
                </div>
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
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-agency-slate mb-2">
                  Payment Reminder Frequency (days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  className="w-full bg-white border border-black/10 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-agency-green transition-colors"
                  value={editPopupDelayDays}
                  onChange={(e) => setEditPopupDelayDays(e.target.value)}
                />
                <p className="text-[9px] text-slate-400 mt-1 font-mono">
                  How often the payment reminder popup appears for the client (default: 1 day)
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="bg-agency-black text-white px-6 py-3 rounded-sm font-bold uppercase tracking-widest text-xs hover:bg-agency-green transition-all"
                >
                  <Save size={14} className="inline mr-2" />
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
                  className="px-6 py-3 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-agency-black transition-all"
                >
                  <X size={14} className="inline mr-2" />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Progress Bar */}
        <ProgressBar current={completedCount} total={totalCount} doneCount={doneCount} />

        {/* Finance Card */}
        <FinanceCard
          milestones={selectedProject.milestones || []}
          totalValue={selectedProject.totalValue || 0}
          onAddMilestone={async (label, date, amount) => {
            if (!selectedProject) return;
            const newMs = {
              id: crypto.randomUUID(),
              label,
              date,
              current: false,
              completed: false,
              amount,
            };
            await addMilestone(selectedProject.id, newMs);
            setSelectedProject(prev => prev ? {
              ...prev,
              milestones: [...(prev.milestones || []), newMs]
            } : null);
          }}
          onUpdateMilestone={async (id, updates) => {
            if (!selectedProject) return;
            await updateMilestone(selectedProject.id, id, updates);
            setSelectedProject(prev => {
              if (!prev) return null;
              const updatedMilestones = (prev.milestones || []).map(ms =>
                ms.id === id ? { ...ms, ...updates } : ms
              );
              return { ...prev, milestones: updatedMilestones };
            });
          }}
          onDeleteMilestone={async (id) => {
            if (!selectedProject) return;
            await deleteMilestone(selectedProject.id, id);
            setSelectedProject(prev => {
              if (!prev) return null;
              return { ...prev, milestones: (prev.milestones || []).filter(ms => ms.id !== id) };
            });
          }}
          userRole={userRole}
        />

        {/* Proposed Improvements */}
        <ProposedImprovements 
          improvements={selectedProject.improvements || []}
          onAddPoint={handleAddImprovement}
          onApprove={handleApproveImprovement}
          onComplete={handleCompleteImprovement}
          userRole={userRole}
        />
      </main>

      {/* Completion Celebration Popup */}
      {showCompletionPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white border-2 border-emerald-300 rounded-sm shadow-2xl max-w-md w-full mx-4 animate-in fade-in zoom-in-95">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-emerald-800">
                    All Tasks Completed! 🎉
                  </h3>
                  <p className="text-[10px] font-mono text-emerald-500">
                    {selectedProject.name}
                  </p>
                </div>
              </div>

              <div className="border-t border-emerald-100 pt-4 space-y-4">
                <p className="text-xs text-slate-600 font-bold leading-relaxed">
                  Great work! All {selectedProject.improvements?.length || 0} tasks have been marked as done. 
                  Your project is progressing well.
                </p>

                {/* Payment reminder section */}
                {(() => {
                  const milestones = selectedProject.milestones || [];
                  const isDefaultMilestones = milestones.length > 0 && milestones.every(m => /^ms-\d+$/.test(m.id));
                  const allPaid = milestones.length > 0 && milestones.every(m => m.completed);
                  const hasAnyPayment = milestones.some(m => m.completed);

                  if (allPaid) {
                    return (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-sm p-4">
                        <p className="text-[11px] font-black text-emerald-700 uppercase tracking-widest">
                          ✅ All payments completed
                        </p>
                      </div>
                    );
                  }

                  if (milestones.length === 0 || isDefaultMilestones) {
                    return (
                      <div className="bg-amber-50 border border-amber-200 rounded-sm p-4 space-y-2">
                        <p className="text-[11px] font-black text-amber-700 uppercase tracking-widest">
                          💰 Payment Reminder
                        </p>
                        <p className="text-xs text-slate-600 font-bold">
                          Full project value of <span className="text-agency-black">${selectedProject.totalValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> is due. No payment has been made yet.
                        </p>
                      </div>
                    );
                  }

                  const unpaidMilestones = milestones.filter(m => !m.completed);
                  if (unpaidMilestones.length > 0) {
                    return (
                      <div className="bg-amber-50 border border-amber-200 rounded-sm p-4 space-y-2">
                        <p className="text-[11px] font-black text-amber-700 uppercase tracking-widest">
                          💰 Payment Reminder
                        </p>
                        <p className="text-xs text-slate-600 font-bold">
                          {unpaidMilestones.length} milestone{unpaidMilestones.length > 1 ? 's' : ''} still unpaid. 
                          Next: <span className="text-agency-black">{unpaidMilestones[0].label}</span> — 
                          ${unpaidMilestones[0].amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    );
                  }

                  return null;
                })()}

                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-sm p-4">
                  <p className="text-[11px] font-black text-purple-700 uppercase tracking-widest mb-1">
                    🚀 Ready for more?
                  </p>
                  <p className="text-xs text-slate-600 font-bold leading-relaxed">
                    Let us know if you have any new features or improvements in mind. 
                    We're here to help your business grow further!
                  </p>
                </div>
              </div>

              <button
                onClick={handleCloseCompletionPopup}
                className="w-full py-3 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-sm hover:bg-emerald-700 transition-all"
              >
                Awesome, thanks!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Reminder Popup */}
      {showPaymentPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white border-2 border-amber-300 rounded-sm shadow-2xl max-w-md w-full mx-4 animate-in fade-in zoom-in-95">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <Clock size={20} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-amber-800">
                    Payment Reminder
                  </h3>
                  <p className="text-[10px] font-mono text-amber-500">
                    {selectedProject.name}
                  </p>
                </div>
              </div>

              <div className="border-t border-amber-100 pt-4">
                {(() => {
                  const milestones = selectedProject.milestones || [];
                  const unpaidMilestones = milestones.filter(m => !m.completed);
                  // Check if milestones are auto-generated defaults (ids like "ms-1", "ms-2", etc.)
                  const isDefaultMilestones = milestones.length > 0 && milestones.every(m => /^ms-\d+$/.test(m.id));
                  
                  // Show full payment if: no milestones, OR all are auto-generated defaults
                  if (milestones.length === 0 || isDefaultMilestones) {
                    return (
                      <div className="space-y-3">
                        <div className="text-lg font-black text-amber-900">
                          Full Payment Due
                        </div>
                        <div className="text-3xl font-black text-agency-black">
                          ${selectedProject.totalValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-slate-600 font-bold leading-relaxed">
                          No payment plan has been set up for this project yet. Please arrange the full payment at your earliest convenience.
                        </p>
                      </div>
                    );
                  }

                  // Show next unpaid milestone
                  const nextMilestone = unpaidMilestones[0];
                  const paidCount = milestones.filter(m => m.completed).length;
                  
                  return (
                    <div className="space-y-3">
                      <div className="text-lg font-black text-amber-900">
                        Upcoming Payment
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-sm p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                            {nextMilestone.label}
                          </span>
                          <span className="text-lg font-black text-agency-black">
                            ${nextMilestone.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-amber-600">
                          Due: {nextMilestone.date}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <span>Progress:</span>
                        <div className="flex items-center gap-1">
                          {milestones.map((m, i) => (
                            <div
                              key={i}
                              className={cn(
                                "w-3 h-3 rounded-full border",
                                m.completed
                                  ? "bg-emerald-500 border-emerald-500"
                                  : "bg-slate-100 border-slate-200"
                              )}
                            />
                          ))}
                        </div>
                        <span>{paidCount} of {milestones.length} paid</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <button
                onClick={handleClosePaymentPopup}
                className="w-full py-3 bg-amber-600 text-white text-xs font-black uppercase tracking-widest rounded-sm hover:bg-amber-700 transition-all"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
                 