import type { AgentTask } from '@affiliate-factory/sdk';
import { BaseAgent, type AgentDependencies, type AgentResult, type Goal, type Sprint, type SprintTask, type Insight } from './base';

interface OrchestratorInput {
  tenantId: string;
  action: 'plan_sprint' | 'review_goals' | 'generate_insights' | 'update_calendar' | 'assign_tasks' | 'weekly_report';
  goals?: Goal[];
  currentWeek?: string;
  forceReplan?: boolean;
}

export class OrchestratorAgent extends BaseAgent {
  name = 'OrchestratorAgent';
  description = 'Manages goals, plans weekly sprints, assigns tasks, reviews insights, and updates calendar';
  version = '1.0.0';

  async execute(task: AgentTask, deps: AgentDependencies): Promise<AgentResult> {
    this.validateRequiredEnv(deps, ['supabase']);
    
    return this.withErrorHandling(async () => {
      const input = task.input as OrchestratorInput;
      
      switch (input.action) {
        case 'plan_sprint':
          return await this.planWeeklySprint(input.tenantId, input.currentWeek, deps);
        case 'review_goals':
          return await this.reviewGoals(input.tenantId, deps);
        case 'generate_insights':
          return await this.generateInsights(input.tenantId, deps);
        case 'update_calendar':
          return await this.updateCalendar(input.tenantId, deps);
        case 'assign_tasks':
          return await this.assignTasks(input.tenantId, deps);
        case 'weekly_report':
          return await this.generateWeeklyReport(input.tenantId, deps);
        default:
          throw new Error(`Unknown action: ${input.action}`);
      }
    }, `execute ${task.input?.action || 'unknown'}`);
  }

  private async planWeeklySprint(tenantId: string, currentWeek?: string, deps?: AgentDependencies): Promise<any> {
    const week = currentWeek || this.getCurrentWeek();
    
    // Get current goals
    const { data: goals } = await deps!.supabase
      .from('insights')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('window', 'weekly')
      .order('computed_at', { ascending: false })
      .limit(10);

    // Get past performance
    const { data: pastPerformance } = await deps!.supabase
      .from('insights')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('computed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    // Create sprint plan
    const sprint: Sprint = {
      id: `${tenantId}-${week}`,
      tenantId,
      week,
      goals: await this.deriveGoalsFromInsights(goals || [], tenantId, deps!),
      tasks: await this.generateSprintTasks(tenantId, goals || [], deps!),
      status: 'planning',
      startDate: this.getWeekStart(week),
      endDate: this.getWeekEnd(week)
    };

    // Save sprint
    await deps!.supabase
      .from('agent_tasks')
      .insert({
        tenant_id: tenantId,
        agent: this.name,
        input: { action: 'sprint_created', sprint },
        status: 'done',
        result: sprint,
        completed_at: new Date().toISOString()
      });

    return { sprint, tasksGenerated: sprint.tasks.length };
  }

  private async reviewGoals(tenantId: string, deps: AgentDependencies): Promise<any> {
    // Get current goals and metrics
    const { data: currentInsights } = await deps.supabase
      .from('insights')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('computed_at', { ascending: false })
      .limit(20);

    const goalReview = {
      totalGoals: 0,
      activeGoals: 0,
      completedGoals: 0,
      atRiskGoals: 0,
      recommendations: [] as string[]
    };

    if (currentInsights) {
      goalReview.totalGoals = currentInsights.length;
      
      // Analyze goal performance
      for (const insight of currentInsights) {
        const value = insight.value || 0;
        const kpi = insight.kpi;
        
        if (kpi === 'clicks' && value < 100) {
          goalReview.atRiskGoals++;
          goalReview.recommendations.push('Increase content publishing frequency to boost clicks');
        } else if (kpi === 'ctr' && value < 0.02) {
          goalReview.atRiskGoals++;
          goalReview.recommendations.push('Optimize CTAs and product placement to improve CTR');
        } else if (kpi === 'traffic' && value < 1000) {
          goalReview.atRiskGoals++;
          goalReview.recommendations.push('Focus on SEO optimization and trending topics');
        } else {
          goalReview.activeGoals++;
        }
      }
    }

    return goalReview;
  }

  private async generateInsights(tenantId: string, deps: AgentDependencies): Promise<any> {
    // Get recent performance data
    const { data: recentInsights } = await deps.supabase
      .from('insights')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('computed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('computed_at', { ascending: false });

    // Get top performing content
    const { data: topPosts } = await deps.supabase
      .from('posts')
      .select('id, title, type, published_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(10);

    // Generate actionable insights
    const insights: Insight[] = [];

    // Traffic insights
    if (recentInsights && recentInsights.length > 0) {
      const trafficData = recentInsights.filter(i => i.kpi === 'traffic');
      if (trafficData.length > 1) {
        const current = trafficData[0].value;
        const previous = trafficData[1].value;
        const change = ((current - previous) / previous) * 100;

        insights.push({
          id: `traffic-${Date.now()}`,
          tenantId,
          type: change > 0 ? 'performance' : 'issue',
          title: `Traffic ${change > 0 ? 'Growth' : 'Decline'} Detected`,
          description: `Traffic has ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}% this week`,
          severity: Math.abs(change) > 20 ? 'critical' : 'warning',
          actionable: true,
          suggestedActions: change < 0 ? [
            {
              description: 'Create trending topic posts',
              agentName: 'TrendsAgent',
              input: { action: 'analyze_trends', count: 5 }
            },
            {
              description: 'Generate SEO-optimized content',
              agentName: 'EditorialAgent',
              input: { action: 'generate_posts', type: 'seo_focused', count: 3 }
            }
          ] : [
            {
              description: 'Analyze successful content patterns',
              agentName: 'EditorialAgent',
              input: { action: 'analyze_top_content' }
            }
          ],
          createdAt: new Date()
        });
      }
    }

    // Content performance insights
    if (topPosts && topPosts.length > 0) {
      const contentTypes = topPosts.reduce((acc, post) => {
        acc[post.type] = (acc[post.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topType = Object.entries(contentTypes)
        .sort(([,a], [,b]) => b - a)[0];

      if (topType) {
        insights.push({
          id: `content-${Date.now()}`,
          tenantId,
          type: 'opportunity',
          title: 'Content Type Performance Pattern',
          description: `${topType[0]} posts are performing well (${topType[1]} in top 10)`,
          severity: 'info',
          actionable: true,
          suggestedActions: [
            {
              description: `Create more ${topType[0]} content`,
              agentName: 'EditorialAgent',
              input: { action: 'generate_posts', type: topType[0], count: 3 }
            }
          ],
          createdAt: new Date()
        });
      }
    }

    // Save insights
    for (const insight of insights) {
      await deps.supabase
        .from('insights')
        .insert({
          tenant_id: insight.tenantId,
          kpi: insight.type,
          value: insight.severity === 'critical' ? 3 : insight.severity === 'warning' ? 2 : 1,
          window: 'weekly',
          meta: {
            title: insight.title,
            description: insight.description,
            actionable: insight.actionable,
            suggestedActions: insight.suggestedActions
          },
          computed_at: new Date().toISOString()
        });
    }

    return { insightsGenerated: insights.length, insights };
  }

  private async updateCalendar(tenantId: string, deps: AgentDependencies): Promise<any> {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Get upcoming calendar items
    const { data: upcomingItems } = await deps.supabase
      .from('calendar')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('run_at', now.toISOString())
      .lte('run_at', nextWeek.toISOString())
      .order('run_at', { ascending: true });

    // Schedule regular content if missing
    const scheduledPosts = upcomingItems?.filter(item => item.item_type === 'post') || [];
    const postsNeeded = 7 - scheduledPosts.length; // Target: 1 post per day

    const newItems = [];
    
    if (postsNeeded > 0) {
      for (let i = 0; i < postsNeeded; i++) {
        const runAt = new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
        
        newItems.push({
          tenant_id: tenantId,
          item_type: 'post',
          title: `Daily Content - ${runAt.toDateString()}`,
          status: 'planned',
          run_at: runAt.toISOString(),
          meta: {
            agent: 'EditorialAgent',
            action: 'generate_daily_post'
          }
        });
      }
    }

    // Schedule weekly newsletter if missing
    const newsletters = upcomingItems?.filter(item => item.item_type === 'newsletter') || [];
    if (newsletters.length === 0) {
      const fridayNext = new Date(now);
      fridayNext.setDate(now.getDate() + (5 - now.getDay() + 7) % 7);
      fridayNext.setHours(10, 0, 0, 0);

      newItems.push({
        tenant_id: tenantId,
        item_type: 'newsletter',
        title: `Weekly Newsletter - ${fridayNext.toDateString()}`,
        status: 'planned',
        run_at: fridayNext.toISOString(),
        meta: {
          agent: 'NewsletterAgent',
          action: 'generate_weekly_roundup'
        }
      });
    }

    // Insert new calendar items
    if (newItems.length > 0) {
      await deps.supabase
        .from('calendar')
        .insert(newItems);
    }

    return { 
      calendarUpdated: true, 
      itemsScheduled: newItems.length,
      upcomingItems: upcomingItems?.length || 0 
    };
  }

  private async assignTasks(tenantId: string, deps: AgentDependencies): Promise<any> {
    // Get pending calendar items that need agent execution
    const { data: pendingItems } = await deps.supabase
      .from('calendar')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'planned')
      .lte('run_at', new Date().toISOString())
      .order('run_at', { ascending: true })
      .limit(10);

    const tasksCreated = [];

    for (const item of pendingItems || []) {
      const meta = item.meta as any;
      
      if (meta?.agent && meta?.action) {
        // Create agent task
        const { data: task } = await deps.supabase
          .from('agent_tasks')
          .insert({
            tenant_id: tenantId,
            agent: meta.agent,
            input: {
              action: meta.action,
              calendarItemId: item.id,
              ...meta
            },
            status: 'queued'
          })
          .select()
          .single();

        if (task) {
          tasksCreated.push(task);
          
          // Update calendar item status
          await deps.supabase
            .from('calendar')
            .update({ status: 'scheduled' })
            .eq('id', item.id);
        }
      }
    }

    return { tasksAssigned: tasksCreated.length, tasks: tasksCreated };
  }

  private async generateWeeklyReport(tenantId: string, deps: AgentDependencies): Promise<any> {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Get week performance
    const { data: weekInsights } = await deps.supabase
      .from('insights')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('computed_at', weekStart.toISOString())
      .lte('computed_at', weekEnd.toISOString());

    // Get completed tasks
    const { data: completedTasks } = await deps.supabase
      .from('agent_tasks')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'done')
      .gte('completed_at', weekStart.toISOString())
      .lte('completed_at', weekEnd.toISOString());

    // Get published content
    const { data: publishedPosts } = await deps.supabase
      .from('posts')
      .select('id, title, type, published_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'published')
      .gte('published_at', weekStart.toISOString())
      .lte('published_at', weekEnd.toISOString());

    const report = {
      week: this.getCurrentWeek(),
      period: `${weekStart.toDateString()} - ${weekEnd.toDateString()}`,
      summary: {
        postsPublished: publishedPosts?.length || 0,
        tasksCompleted: completedTasks?.length || 0,
        insightsGenerated: weekInsights?.length || 0
      },
      performance: this.analyzeWeekPerformance(weekInsights || []),
      achievements: this.extractAchievements(completedTasks || []),
      nextWeekPlanning: await this.generateNextWeekPlan(tenantId, deps)
    };

    return report;
  }

  // Helper methods
  private getCurrentWeek(): string {
    const now = new Date();
    const year = now.getFullYear();
    const week = this.getWeekNumber(now);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  private getWeekStart(week: string): Date {
    const [year, weekNum] = week.split('-W').map(Number);
    const firstDay = new Date(year, 0, 1);
    const weekStart = new Date(firstDay);
    weekStart.setDate(firstDay.getDate() + (weekNum - 1) * 7 - firstDay.getDay());
    return weekStart;
  }

  private getWeekEnd(week: string): Date {
    const start = this.getWeekStart(week);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end;
  }

  private async deriveGoalsFromInsights(insights: any[], tenantId: string, deps: AgentDependencies): Promise<Goal[]> {
    const goals: Goal[] = [];
    
    // Default goals based on insights
    goals.push({
      id: `${tenantId}-clicks-weekly`,
      type: 'clicks',
      target: 500,
      current: insights.find(i => i.kpi === 'clicks')?.value || 0,
      period: 'weekly',
      deadline: this.getWeekEnd(this.getCurrentWeek()),
      status: 'active'
    });

    goals.push({
      id: `${tenantId}-ctr-weekly`,
      type: 'ctr',
      target: 0.025,
      current: insights.find(i => i.kpi === 'ctr')?.value || 0,
      period: 'weekly',
      deadline: this.getWeekEnd(this.getCurrentWeek()),
      status: 'active'
    });

    return goals;
  }

  private async generateSprintTasks(tenantId: string, goals: any[], deps: AgentDependencies): Promise<SprintTask[]> {
    const tasks: SprintTask[] = [];
    
    // Content generation tasks
    tasks.push({
      id: `${tenantId}-content-daily`,
      agentName: 'EditorialAgent',
      priority: 'high',
      description: 'Generate daily content posts',
      input: { action: 'generate_posts', count: 5, type: 'mixed' },
      status: 'pending',
      assignedAt: new Date(),
      estimatedEffort: 4
    });

    // Product research tasks
    tasks.push({
      id: `${tenantId}-products-research`,
      agentName: 'ProductAgent',
      priority: 'medium',
      description: 'Research and add new products',
      input: { action: 'research_products', count: 10 },
      status: 'pending',
      assignedAt: new Date(),
      estimatedEffort: 2
    });

    // Trends analysis
    tasks.push({
      id: `${tenantId}-trends-analysis`,
      agentName: 'TrendsAgent',
      priority: 'medium',
      description: 'Analyze trending topics',
      input: { action: 'analyze_trends' },
      status: 'pending',
      assignedAt: new Date(),
      estimatedEffort: 1
    });

    return tasks;
  }

  private analyzeWeekPerformance(insights: any[]): Record<string, any> {
    const performance = {
      clicks: { current: 0, target: 500, percentage: 0 },
      ctr: { current: 0, target: 0.025, percentage: 0 },
      traffic: { current: 0, target: 1000, percentage: 0 }
    };

    for (const insight of insights) {
      if (insight.kpi in performance) {
        performance[insight.kpi as keyof typeof performance].current = insight.value;
        performance[insight.kpi as keyof typeof performance].percentage = 
          (insight.value / performance[insight.kpi as keyof typeof performance].target) * 100;
      }
    }

    return performance;
  }

  private extractAchievements(tasks: any[]): string[] {
    const achievements = [];
    
    const tasksByAgent = tasks.reduce((acc, task) => {
      acc[task.agent] = (acc[task.agent] || 0) + 1;
      return acc;
    }, {});

    for (const [agent, count] of Object.entries(tasksByAgent)) {
      achievements.push(`${agent} completed ${count} tasks`);
    }

    return achievements;
  }

  private async generateNextWeekPlan(tenantId: string, deps: AgentDependencies): Promise<any> {
    return {
      focusAreas: ['Content optimization', 'Product expansion', 'Trend analysis'],
      estimatedTasks: 8,
      priorityGoals: ['Increase CTR', 'Add seasonal products']
    };
  }
}

export const orchestratorAgent = new OrchestratorAgent();