import { db, auth } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  doc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
} from 'firebase/firestore';
import { Project, ProjectTask, ImprovementPoint, Milestone } from '../types';

const PROJECTS_COLLECTION = 'projects';

/**
 * Removes all keys with undefined values from an object.
 * Firestore does not accept undefined values.
 */
function removeUndefined<T extends Record<string, any>>(obj: T): T {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned as T;
}

function generateDefaultMilestones(totalValue: number, startDate?: string): Milestone[] {
  const now = startDate ? new Date(startDate) : new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const threeWeeks = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
  const fourWeeks = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);

  const formatDate = (d: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`;
  };

  const halfAmount = Math.round(totalValue / 2);

  return [
    { id: 'ms-1', label: 'Architectural Review', date: formatDate(now), current: true, completed: false, amount: halfAmount },
    { id: 'ms-2', label: 'Component Factory', date: formatDate(weekFromNow), current: false, completed: false, amount: 0 },
    { id: 'ms-3', label: 'Logic Integration', date: formatDate(twoWeeks), current: false, completed: false, amount: 0 },
    { id: 'ms-4', label: 'Beta Handover', date: formatDate(threeWeeks), current: false, completed: false, amount: 0 },
    { id: 'ms-5', label: 'Final Delivery', date: formatDate(fourWeeks), current: false, completed: false, amount: totalValue - halfAmount },
  ];
}

export async function createProject(
  name: string, 
  description: string, 
  clientEmail: string, 
  createdBy: string,
  totalValue: number = 1000,
  startDate?: string,
  clientFirstName?: string,
  clientLastName?: string,
  clientCompany?: string,
  clientWebsite?: string
): Promise<string> {
  const lowerEmail = clientEmail.toLowerCase();
  
  const project = {
    name,
    description,
    clientEmail: lowerEmail,
    clientFirstName: clientFirstName || '',
    clientLastName: clientLastName || '',
    clientCompany: clientCompany || '',
    clientWebsite: clientWebsite || '',
    createdBy,
    createdAt: new Date().toISOString(),
    startDate: startDate || new Date().toISOString().split('T')[0],
    isApproved: false,
    totalValue,
    tasks: [] as ProjectTask[],
    improvements: [] as ImprovementPoint[],
    milestones: generateDefaultMilestones(totalValue, startDate),
  };

  const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), project);

  return docRef.id;
}

function hasOldTasks(tasks: any[]): boolean {
  return tasks && tasks.length > 0 && 'category' in tasks[0];
}

export async function getProjectsForClient(clientEmail: string): Promise<Project[]> {
  const q = query(
    collection(db, PROJECTS_COLLECTION),
    where('clientEmail', '==', clientEmail.toLowerCase()),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    if (hasOldTasks(data.tasks)) {
      updateDoc(doc.ref, { tasks: [] }).catch(() => {});
      data.tasks = [];
    }
    return {
      id: doc.id,
      ...data,
    } as Project;
  });
}

export async function getProjectsForAgency(agencyEmail: string): Promise<Project[]> {
  const q = query(
    collection(db, PROJECTS_COLLECTION),
    where('createdBy', '==', agencyEmail.toLowerCase()),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    if (hasOldTasks(data.tasks)) {
      updateDoc(doc.ref, { tasks: [] }).catch(() => {});
      data.tasks = [];
    }
    return {
      id: doc.id,
      ...data,
    } as Project;
  });
}

export async function getProjectById(projectId: string): Promise<Project | null> {
  const docRef = doc(db, PROJECTS_COLLECTION, projectId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  const data = docSnap.data();
  
  // Migration: Clear old hardcoded tasks that have a 'category' field
  if (data.tasks && Array.isArray(data.tasks) && data.tasks.length > 0 && 'category' in data.tasks[0]) {
    await updateDoc(docRef, { tasks: [] });
    data.tasks = [];
  }
  
  // Migration: Add missing agencyApproved/clientApproved fields to tasks
  if (data.tasks && Array.isArray(data.tasks) && data.tasks.length > 0) {
    let needsUpdate = false;
    const migratedTasks = data.tasks.map((task: any) => {
      if (task.agencyApproved === undefined || task.clientApproved === undefined) {
        needsUpdate = true;
        return { ...task, agencyApproved: task.agencyApproved || false, clientApproved: task.clientApproved || false };
      }
      return task;
    });
    if (needsUpdate) {
      await updateDoc(docRef, { tasks: migratedTasks });
      data.tasks = migratedTasks;
    }
  }
  
  return {
    id: docSnap.id,
    ...data,
  } as Project;
}

export async function updateProject(projectId: string, data: Partial<Project>): Promise<void> {
  const docRef = doc(db, PROJECTS_COLLECTION, projectId);
  await updateDoc(docRef, { ...data });
}

export async function approveProject(projectId: string): Promise<void> {
  const docRef = doc(db, PROJECTS_COLLECTION, projectId);
  await updateDoc(docRef, {
    isApproved: true,
    approvedAt: new Date().toISOString(),
  });
}

export async function addImprovement(
  projectId: string, 
  improvement: ImprovementPoint
): Promise<void> {
  const project = await getProjectById(projectId);
  if (!project) throw new Error('Project not found');
  
  const improvements = [...(project.improvements || []), improvement].map(removeUndefined);
  await updateDoc(doc(db, PROJECTS_COLLECTION, projectId), { improvements });
}

export async function updateImprovement(
  projectId: string, 
  improvementId: string, 
  updates: Partial<ImprovementPoint>
): Promise<void> {
  const project = await getProjectById(projectId);
  if (!project) throw new Error('Project not found');
  
  const improvements = (project.improvements || []).map(imp => 
    imp.id === improvementId ? { ...imp, ...updates } : imp
  ).map(removeUndefined);
  
  await updateDoc(doc(db, PROJECTS_COLLECTION, projectId), { improvements });
}

export async function addTask(
  projectId: string, 
  task: ProjectTask
): Promise<void> {
  const project = await getProjectById(projectId);
  if (!project) throw new Error('Project not found');
  
  const tasks = [...(project.tasks || []), task].map(removeUndefined);
  await updateDoc(doc(db, PROJECTS_COLLECTION, projectId), { tasks });
}

export async function updateTask(
  projectId: string, 
  taskId: string, 
  updates: { completed?: boolean; completedAt?: string; agencyApproved?: boolean; clientApproved?: boolean }
): Promise<void> {
  const project = await getProjectById(projectId);
  if (!project) throw new Error('Project not found');
  
  const tasks = project.tasks.map(task => 
    task.id === taskId 
      ? { ...task, ...updates }
      : task
  ).map(removeUndefined);
  
  await updateDoc(doc(db, PROJECTS_COLLECTION, projectId), { tasks });
}

export async function addMilestone(
  projectId: string, 
  milestone: Milestone
): Promise<void> {
  const project = await getProjectById(projectId);
  if (!project) throw new Error('Project not found');
  
  const milestones = [...(project.milestones || []), milestone].map(removeUndefined);
  await updateDoc(doc(db, PROJECTS_COLLECTION, projectId), { milestones });
}

export async function updateMilestone(
  projectId: string, 
  milestoneId: string, 
  updates: Partial<Milestone>
): Promise<void> {
  const project = await getProjectById(projectId);
  if (!project) throw new Error('Project not found');
  
  const milestones = (project.milestones || []).map(ms => 
    ms.id === milestoneId ? { ...ms, ...updates } : ms
  ).map(removeUndefined);
  
  await updateDoc(doc(db, PROJECTS_COLLECTION, projectId), { milestones });
}

export async function completeImprovement(
  projectId: string, 
  improvementId: string
): Promise<void> {
  const project = await getProjectById(projectId);
  if (!project) throw new Error('Project not found');
  
  const improvements = (project.improvements || []).map(imp => 
    imp.id === improvementId 
      ? { ...imp, completed: true, completedAt: new Date().toISOString() }
      : imp
  ).map(removeUndefined);
  
  await updateDoc(doc(db, PROJECTS_COLLECTION, projectId), { improvements });
}

export async function deleteMilestone(
  projectId: string, 
  milestoneId: string
): Promise<void> {
  const project = await getProjectById(projectId);
  if (!project) throw new Error('Project not found');
  
  const milestones = (project.milestones || []).filter(ms => ms.id !== milestoneId).map(removeUndefined);
  await updateDoc(doc(db, PROJECTS_COLLECTION, projectId), { milestones });
}

export async function updateTotalEstimatedDays(
  projectId: string,
  totalDays: number
): Promise<void> {
  const docRef = doc(db, PROJECTS_COLLECTION, projectId);
  await updateDoc(docRef, { totalEstimatedDays: totalDays });
}

export async function updatePopupClosedAt(
  projectId: string
): Promise<void> {
  const docRef = doc(db, PROJECTS_COLLECTION, projectId);
  await updateDoc(docRef, { popupClosedAt: new Date().toISOString() });
}

export async function updateLastLoginAt(
  projectId: string
): Promise<void> {
  const docRef = doc(db, PROJECTS_COLLECTION, projectId);
  await updateDoc(docRef, { lastLoginAt: new Date().toISOString() });
}
