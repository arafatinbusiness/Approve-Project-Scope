export interface ProjectTask {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completedAt?: string;
  note?: string;
  agencyApproved: boolean;
  clientApproved: boolean;
}

export interface ImprovementPoint {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  suggestedBy: 'Agency' | 'Client';
  agencyApproved: boolean;
  clientApproved: boolean;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  estimatedDays?: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  clientEmail: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientCompany?: string;
  clientWebsite?: string;
  createdBy: string;
  createdAt: string;
  startDate?: string;
  isApproved: boolean;
  approvedAt?: string;
  totalValue: number;
  tasks: ProjectTask[];
  improvements: ImprovementPoint[];
  milestones: Milestone[];
  totalEstimatedDays?: number;
  popupClosedAt?: string;
  popupDelayDays?: number;
}

export interface Milestone {
  id: string;
  label: string;
  date: string;
  current: boolean;
  completed: boolean;
  amount: number;
}

export interface ProjectState {
  isApproved: boolean;
  approvedAt?: string;
  tasks: ProjectTask[];
  improvements: ImprovementPoint[];
}
