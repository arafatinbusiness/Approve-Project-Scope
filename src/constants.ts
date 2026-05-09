import { ProjectTask } from './types';

export const INITIAL_TASKS: ProjectTask[] = [
  // UI/UX
  { id: 'ux-1', category: 'UI/UX', title: 'Responsive Layout System', description: 'Fluid grid implementation across 5 breakpoints.', completed: true, completedAt: '2024-05-01 10:00' },
  { id: 'ux-2', category: 'UI/UX', title: 'Typography Hierarchy', description: 'Implementation of Inter & JetBrains Mono scale.', completed: true, completedAt: '2024-05-01 11:30' },
  { id: 'ux-3', category: 'UI/UX', title: 'Color Palette Mapping', description: 'Deep Black and Action Green semantic mapping.', completed: false },
  { id: 'ux-4', category: 'UI/UX', title: 'Micro-interaction Core', description: 'Hover states and transition logic for buttons.', completed: false },
  { id: 'ux-5', category: 'UI/UX', title: 'Navigation Architecture', description: 'Global header and mobile drawer system.', completed: false },
  { id: 'ux-6', category: 'UI/UX', title: 'Form Design System', description: 'Standardized input and validation styling.', completed: false },
  { id: 'ux-7', category: 'UI/UX', title: 'Accessibility Audit', description: 'WCAG 2.1 Level AA compliance check.', completed: false },
  { id: 'ux-8', category: 'UI/UX', title: 'Visual Hierarchy Optimization', description: 'Information density and scanning patterns.', completed: false },

  // Admin Logic
  { id: 'adm-1', category: 'Admin Logic', title: 'Magic Link Auth Flow', description: 'Passwordless entry system implementation.', completed: true, completedAt: '2024-05-02 09:00' },
  { id: 'adm-2', category: 'Admin Logic', title: 'Firestore Schema Design', description: 'Relational data mapping and indexing.', completed: true, completedAt: '2024-05-02 14:00' },
  { id: 'adm-3', category: 'Admin Logic', title: 'Security Rules Protocol', description: 'Attribute-Based Access Control implementation.', completed: false },
  { id: 'adm-4', category: 'Admin Logic', title: 'Project State Engine', description: 'Approval logic and status synchronization.', completed: false },
  { id: 'adm-5', category: 'Admin Logic', title: 'Activity Logging', description: 'Audit trail for client and agency actions.', completed: false },
  { id: 'adm-6', category: 'Admin Logic', title: 'Financial Calculation Engine', description: 'Milestone tracking and payment logic.', completed: false },
  { id: 'adm-7', category: 'Admin Logic', title: 'Notification System', description: 'Real-time updates for project milestones.', completed: false },
  { id: 'adm-8', category: 'Admin Logic', title: 'Data Export Module', description: 'CSV/JSON project data extraction.', completed: false },

  // Media Assets
  { id: 'med-1', category: 'Media Assets', title: 'Icon Library Integration', description: 'Lucide-React suite implementation.', completed: true, completedAt: '2024-05-03 16:00' },
  { id: 'med-2', category: 'Media Assets', title: 'Optimized Brand Assets', description: 'Vector logo and brand mark variations.', completed: true, completedAt: '2024-05-04 10:00' },
  { id: 'med-2', category: 'Media Assets', title: 'Image Compression Pipeline', description: 'Next-gen format (WebP) auto-conversion.', completed: false },
  { id: 'med-4', category: 'Media Assets', title: 'Custom SVG Illustrations', description: 'Thematic visual elements for onboarding.', completed: false },
  { id: 'med-5', category: 'Media Assets', title: 'Dynamic Asset Loader', description: 'Lazy-loading and placeholder strategies.', completed: false },
  { id: 'med-6', category: 'Media Assets', title: 'Color Inversion Assets', description: 'High-contrast mode asset variations.', completed: false },
  { id: 'med-7', category: 'Media Assets', title: 'Social Graph Metadata', description: 'OpenGraph and Twitter card asset generation.', completed: false },
  { id: 'med-8', category: 'Media Assets', title: 'Video Optimization Protocol', description: 'Bitrate management for background loops.', completed: false },
];
