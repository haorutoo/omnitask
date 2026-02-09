
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  DECLINED = 'declined',
  WAITING_APPROVAL = 'waiting-approval'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'assignee' | 'approver';
  status: 'pending' | 'accepted' | 'declined';
  avatar?: string;
}

export interface RecurrenceConfig {
  frequency: 'minutely' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // e.g., 1 for "every day", 2 for "every 2 days"
  streak: number;
  startDate: string; // ISO String for when the recurrence logic started
  endDate?: string; // ISO String for when the recurrence should end
}

export interface CompletionRecord {
  completedAt: string;
  wasSuccessful: boolean;
}

export interface OmniTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  collaborators: Collaborator[];
  
  // Progress & Recurrence
  completionPercentage: number; // 0-100
  recurrence?: RecurrenceConfig;
  completionHistory?: CompletionRecord[];

  // Scoring & Tracking
  isAiGenerated: boolean;
  originalAiData?: {
    title: string;
    description: string;
  };
  alignmentScore?: number; // 0 to 1 based on text edits

  metadata: {
    quantity?: string;
    brand?: string;
    itemType?: string;
    location?: string;
    contactInfo?: string;
    ingredients?: string[];
    recipe?: string;
    startTime?: string;
    attendees?: string[];
    confirmations?: Record<string, boolean>;
    customFields?: Record<string, any>;
  };

  parentId?: string;
  subTaskIds: string[];
  overdueExplanation?: string;
  aiReassigned?: boolean;
}

export interface OpikTrace {
  id: string;
  timestamp: string;
  inputPrompt: string;
  systemPromptUsed: string;
  aiResponse: string;
  thinkingSteps?: string;
  heuristicScores: {
    completeness: number;
    specificity: number;
    relevance: number;
  };
  llmCritique?: string;
  isOptimized: boolean;
}

export interface Experiment {
  id: string;
  timestamp: string;
  userPrompt: string;
  associatedTaskIds?: string[];
  // Snapshots of the AI's exact output at creation time to compare deletions
  originalTaskSnapshots: {
    id: string;
    title: string;
    description: string;
  }[];
  variants: {
    baseline: OpikTrace;
    optimized?: OpikTrace;
  };
}

export interface ConsistencyMetrics {
  score: number; // Percentage score
  actual: number; // Number of successful completions for the period (capped by expected)
  missed: number; // Number of missed completions for the period (capped by expected)
  expected: number; // Number of expected cycles up to now/endDate
  isFinished: boolean; // If the recurrence has ended
  totalAttemptsLogged: number; // Total number of completion records (successful + missed)
}
