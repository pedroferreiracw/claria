export type MetricType = 'score' | 'evaluations' | 'conversions' | 'custom';
export type GoalStatus = 'active' | 'completed' | 'cancelled';

export interface Goal {
  id: string;
  sdrId?: string;
  squad?: string;
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  metricType: MetricType;
  startDate: Date;
  endDate: Date;
  status: GoalStatus;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PDIStatus = 'pending' | 'in_progress' | 'completed';
export type PDIPriority = 'high' | 'medium' | 'low';

export interface DevelopmentPlan {
  id: string;
  sdrId: string;
  evaluationId?: string;
  weakArea: string;
  recommendation: string;
  priority: PDIPriority;
  status: PDIStatus;
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BestPractice {
  id: string;
  evaluationId: string;
  sdrId: string;
  title: string;
  description?: string;
  category: string;
  highlightText?: string;
  finalScore: number;
  isFeatured: boolean;
  createdBy?: string;
  createdAt: Date;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  criteria: Record<string, any>;
  points: number;
  createdAt: Date;
}

export interface SDRBadge {
  id: string;
  sdrId: string;
  badgeId: string;
  earnedAt: Date;
  badge?: Badge;
}

export interface SDRStreak {
  id: string;
  sdrId: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: Date;
  streakType: 'daily' | 'weekly';
  updatedAt: Date;
}

export interface MonthlyScore {
  id: string;
  sdrId: string;
  month: number;
  year: number;
  totalPoints: number;
  evaluationsCount: number;
  averageScore: number;
  conversionRate: number;
  rankPosition?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PipedriveConfig {
  id: string;
  apiToken?: string;
  domain?: string;
  isConnected: boolean;
  lastSyncAt?: Date;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PipedriveDeal {
  id: string;
  pipedriveId: number;
  sdrId?: string;
  title: string;
  value?: number;
  currency: string;
  stageName?: string;
  status: 'open' | 'won' | 'lost';
  wonTime?: Date;
  lostTime?: Date;
  createdAt: Date;
  syncedAt: Date;
}
