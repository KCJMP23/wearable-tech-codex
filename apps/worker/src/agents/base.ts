import type { AgentTask } from '@affiliate-factory/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface AgentDependencies {
  supabase: SupabaseClient;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  tavilyApiKey?: string;
  redditApiKey?: string;
  amazonPartnerTag?: string;
}

export interface Agent {
  name: string;
  description: string;
  version: string;
  execute: (task: AgentTask, deps: AgentDependencies) => Promise<AgentResult>;
}

export interface AgentResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  metadata?: {
    executionTime?: number;
    resourcesUsed?: string[];
    nextActions?: string[];
  };
}

export interface Goal {
  id: string;
  type: 'clicks' | 'ctr' | 'traffic' | 'revenue' | 'engagement';
  target: number;
  current: number;
  period: 'daily' | 'weekly' | 'monthly';
  deadline: Date;
  status: 'active' | 'completed' | 'paused' | 'failed';
}

export interface Sprint {
  id: string;
  tenantId: string;
  week: string; // ISO week format: 2024-W01
  goals: Goal[];
  tasks: SprintTask[];
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  startDate: Date;
  endDate: Date;
  retrospective?: {
    achievements: string[];
    challenges: string[];
    improvements: string[];
  };
}

export interface SprintTask {
  id: string;
  agentName: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  input: Record<string, unknown>;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';
  assignedAt: Date;
  completedAt?: Date;
  dependencies?: string[];
  estimatedEffort?: number; // hours
}

export interface Insight {
  id: string;
  tenantId: string;
  type: 'performance' | 'content' | 'trending' | 'opportunity' | 'issue';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  actionable: boolean;
  suggestedActions?: {
    description: string;
    agentName?: string;
    input?: Record<string, unknown>;
  }[];
  metrics?: {
    name: string;
    current: number;
    target?: number;
    trend?: 'up' | 'down' | 'stable';
  }[];
  createdAt: Date;
  resolvedAt?: Date;
}

export abstract class BaseAgent implements Agent {
  abstract name: string;
  abstract description: string;
  abstract version: string;

  protected async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<AgentResult> {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        data: result as Record<string, unknown>,
        metadata: {
          executionTime,
          resourcesUsed: [this.name]
        }
      };
    } catch (error) {
      console.error(`Error in ${this.name} - ${context}:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          executionTime: Date.now() - startTime,
          resourcesUsed: [this.name]
        }
      };
    }
  }

  protected validateRequiredEnv(deps: AgentDependencies, required: (keyof AgentDependencies)[]): void {
    const missing = required.filter(key => !deps[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  protected ensureAmazonTag(url: string, partnerTag: string = 'jmpkc01-20'): string {
    if (!url.includes('amazon.')) {
      return url;
    }

    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set('tag', partnerTag);
      return urlObj.toString();
    } catch {
      // If URL parsing fails, return original
      return url;
    }
  }

  abstract execute(task: AgentTask, deps: AgentDependencies): Promise<AgentResult>;
}