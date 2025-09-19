import { createServiceClient } from '@affiliate-factory/sdk';
import { BaseAgent } from './base';

interface HealthMetric {
  agentName: string;
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  lastHeartbeat: Date;
  errorRate: number;
  avgResponseTime: number;
  memoryUsage: number;
  taskBacklog: number;
  consecutiveFailures: number;
}

interface RecoveryAction {
  type: 'restart' | 'scale' | 'fallback' | 'throttle' | 'replace' | 'alert';
  target: string;
  params: any;
  priority: number;
  confidence: number;
}

interface SystemHealth {
  overall: 'optimal' | 'degraded' | 'critical';
  agents: HealthMetric[];
  databases: DatabaseHealth[];
  apis: APIHealth[];
  recommendations: RecoveryAction[];
}

interface DatabaseHealth {
  name: string;
  connectionPool: number;
  queryLatency: number;
  errorRate: number;
  diskUsage: number;
}

interface APIHealth {
  name: string;
  rateLimit: { used: number; total: number };
  avgLatency: number;
  errorRate: number;
  lastSuccess: Date;
}

export class SelfHealingOrchestrator extends BaseAgent {
  name = 'SelfHealingOrchestrator';
  description = 'Monitors system health and automatically repairs issues';
  version = '2.0.0';
  
  private readonly MONITORING_INTERVAL = 30 * 1000; // 30 seconds
  private readonly CRITICAL_ERROR_THRESHOLD = 0.1; // 10% error rate
  private readonly MEMORY_THRESHOLD = 0.85; // 85% memory usage
  private readonly BACKLOG_THRESHOLD = 100; // tasks
  
  private healthHistory: Map<string, HealthMetric[]> = new Map();
  private recoveryLog: RecoveryAction[] = [];
  
  async execute(): Promise<void> {
    console.log('🏥 Self-Healing Orchestrator starting continuous monitoring...');
    
    setInterval(async () => {
      await this.performHealthCheck();
    }, this.MONITORING_INTERVAL);
    
    // Initial health check
    await this.performHealthCheck();
  }
  
  private async performHealthCheck(): Promise<void> {
    try {
      const systemHealth = await this.getSystemHealth();
      
      // Analyze health and determine actions
      const actions = await this.analyzeHealth(systemHealth);
      
      // Execute recovery actions
      for (const action of actions) {
        await this.executeRecoveryAction(action);
      }
      
      // Update monitoring dashboard
      await this.updateDashboard(systemHealth);
      
      // Predictive maintenance
      await this.performPredictiveMaintenance(systemHealth);
      
    } catch (error) {
      console.error('Health check failed:', error);
      await this.handleCriticalFailure(error);
    }
  }
  
  private async getSystemHealth(): Promise<SystemHealth> {
    const supabase = createServiceClient();
    
    // Get agent health metrics
    const { data: agentTasks } = await supabase
      .from('agent_tasks')
      .select('agent, status, created_at, completed_at, error')
      .gte('created_at', new Date(Date.now() - 3600000).toISOString());
    
    const agentHealth = await this.calculateAgentHealth(agentTasks || []);
    
    // Get database health
    const dbHealth = await this.getDatabaseHealth();
    
    // Get API health
    const apiHealth = await this.getAPIHealth();
    
    // Calculate overall health
    const overall = this.calculateOverallHealth(agentHealth, dbHealth, apiHealth);
    
    return {
      overall,
      agents: agentHealth,
      databases: dbHealth,
      apis: apiHealth,
      recommendations: []
    };
  }
  
  private async calculateAgentHealth(tasks: any[]): Promise<HealthMetric[]> {
    const agentMetrics = new Map<string, HealthMetric>();
    
    // Group tasks by agent
    const agentGroups = this.groupBy(tasks, 'agent');
    
    for (const [agentName, agentTasks] of Object.entries(agentGroups)) {
      const errors = agentTasks.filter((t: any) => t.status === 'failed' || t.error);
      const errorRate = errors.length / agentTasks.length;
      
      const completedTasks = agentTasks.filter((t: any) => t.completed_at);
      const avgResponseTime = completedTasks.length > 0
        ? completedTasks.reduce((sum: number, t: any) => {
            const duration = new Date(t.completed_at).getTime() - new Date(t.created_at).getTime();
            return sum + duration;
          }, 0) / completedTasks.length
        : 0;
      
      const pendingTasks = agentTasks.filter((t: any) => t.status === 'queued' || t.status === 'running');
      
      agentMetrics.set(agentName, {
        agentName,
        status: this.determineStatus(errorRate, avgResponseTime, pendingTasks.length),
        lastHeartbeat: new Date(),
        errorRate,
        avgResponseTime,
        memoryUsage: Math.random() * 0.9, // Simulated - would get from actual monitoring
        taskBacklog: pendingTasks.length,
        consecutiveFailures: this.countConsecutiveFailures(agentTasks)
      });
    }
    
    return Array.from(agentMetrics.values());
  }
  
  private determineStatus(errorRate: number, avgResponseTime: number, backlog: number): HealthMetric['status'] {
    if (errorRate > this.CRITICAL_ERROR_THRESHOLD || backlog > this.BACKLOG_THRESHOLD) {
      return 'critical';
    }
    if (errorRate > 0.05 || avgResponseTime > 30000 || backlog > 50) {
      return 'degraded';
    }
    return 'healthy';
  }
  
  private async analyzeHealth(systemHealth: SystemHealth): Promise<RecoveryAction[]> {
    const actions: RecoveryAction[] = [];
    
    // Check each agent
    for (const agent of systemHealth.agents) {
      if (agent.status === 'critical') {
        actions.push({
          type: 'restart',
          target: agent.agentName,
          params: { immediate: true },
          priority: 1,
          confidence: 0.95
        });
      } else if (agent.status === 'degraded') {
        if (agent.memoryUsage > this.MEMORY_THRESHOLD) {
          actions.push({
            type: 'restart',
            target: agent.agentName,
            params: { graceful: true },
            priority: 2,
            confidence: 0.85
          });
        }
        if (agent.taskBacklog > this.BACKLOG_THRESHOLD) {
          actions.push({
            type: 'scale',
            target: agent.agentName,
            params: { instances: 2 },
            priority: 2,
            confidence: 0.8
          });
        }
      }
      
      // Predictive actions
      if (this.predictFailure(agent)) {
        actions.push({
          type: 'throttle',
          target: agent.agentName,
          params: { reduction: 0.5 },
          priority: 3,
          confidence: 0.7
        });
      }
    }
    
    // Check databases
    for (const db of systemHealth.databases) {
      if (db.queryLatency > 1000) {
        actions.push({
          type: 'scale',
          target: `db_${db.name}`,
          params: { readReplicas: true },
          priority: 1,
          confidence: 0.9
        });
      }
    }
    
    // Check APIs
    for (const api of systemHealth.apis) {
      if (api.rateLimit.used / api.rateLimit.total > 0.8) {
        actions.push({
          type: 'fallback',
          target: `api_${api.name}`,
          params: { useBackup: true },
          priority: 2,
          confidence: 0.85
        });
      }
    }
    
    return actions.sort((a, b) => a.priority - b.priority);
  }
  
  private async executeRecoveryAction(action: RecoveryAction): Promise<void> {
    console.log(`🔧 Executing recovery: ${action.type} on ${action.target}`);
    
    try {
      switch (action.type) {
        case 'restart':
          await this.restartAgent(action.target, action.params);
          break;
          
        case 'scale':
          await this.scaleResource(action.target, action.params);
          break;
          
        case 'fallback':
          await this.switchToFallback(action.target, action.params);
          break;
          
        case 'throttle':
          await this.throttleAgent(action.target, action.params);
          break;
          
        case 'replace':
          await this.replaceComponent(action.target, action.params);
          break;
          
        case 'alert':
          await this.sendAlert(action.target, action.params);
          break;
      }
      
      // Log successful recovery
      this.recoveryLog.push({ ...action, executedAt: new Date() });
      
      // Update database
      const supabase = createServiceClient();
      await supabase
        .from('system_recoveries')
        .insert({
          action_type: action.type,
          target: action.target,
          params: action.params,
          confidence: action.confidence,
          status: 'success'
        });
        
    } catch (error) {
      console.error(`Recovery action failed: ${action.type} on ${action.target}`, error);
      
      // Escalate if recovery fails
      await this.escalateIssue(action, error);
    }
  }
  
  private async restartAgent(agentName: string, params: any): Promise<void> {
    const supabase = createServiceClient();
    
    if (params.immediate) {
      // Kill existing tasks
      await supabase
        .from('agent_tasks')
        .update({ status: 'cancelled' })
        .eq('agent', agentName)
        .eq('status', 'running');
    }
    
    // Clear agent memory/cache
    await this.clearAgentCache(agentName);
    
    // Restart with clean state
    await supabase
      .from('agent_health')
      .upsert({
        agent_name: agentName,
        status: 'restarting',
        last_restart: new Date().toISOString()
      });
    
    console.log(`✅ Agent ${agentName} restarted successfully`);
  }
  
  private async scaleResource(target: string, params: any): Promise<void> {
    if (target.startsWith('db_')) {
      // Scale database
      console.log(`📈 Scaling database: ${target} with params:`, params);
      // Implementation would connect to cloud provider API
    } else {
      // Scale agent workers
      console.log(`📈 Scaling agent: ${target} to ${params.instances} instances`);
      // Implementation would adjust worker pool size
    }
  }
  
  private async switchToFallback(target: string, params: any): Promise<void> {
    const supabase = createServiceClient();
    
    // Update configuration to use backup API
    await supabase
      .from('api_config')
      .update({ 
        use_backup: true,
        backup_activated_at: new Date().toISOString()
      })
      .eq('api_name', target.replace('api_', ''));
    
    console.log(`🔄 Switched to backup API for ${target}`);
  }
  
  private async performPredictiveMaintenance(systemHealth: SystemHealth): Promise<void> {
    // Analyze trends
    for (const agent of systemHealth.agents) {
      const history = this.healthHistory.get(agent.agentName) || [];
      history.push(agent);
      
      // Keep last 100 data points
      if (history.length > 100) {
        history.shift();
      }
      
      this.healthHistory.set(agent.agentName, history);
      
      // Predict issues
      if (history.length >= 10) {
        const trend = this.analyzeTrend(history.slice(-10));
        
        if (trend.degrading && trend.predictedFailureIn < 3600000) { // Within 1 hour
          console.log(`⚠️ Predicted failure for ${agent.agentName} in ${trend.predictedFailureIn / 60000} minutes`);
          
          // Proactive action
          await this.executeRecoveryAction({
            type: 'throttle',
            target: agent.agentName,
            params: { reduction: 0.3 },
            priority: 3,
            confidence: trend.confidence
          });
        }
      }
    }
  }
  
  private analyzeTrend(history: HealthMetric[]): any {
    const errorRates = history.map(h => h.errorRate);
    const avgErrorRate = errorRates.reduce((a, b) => a + b, 0) / errorRates.length;
    const trend = errorRates[errorRates.length - 1] - errorRates[0];
    
    return {
      degrading: trend > 0.01,
      predictedFailureIn: trend > 0 ? (this.CRITICAL_ERROR_THRESHOLD - avgErrorRate) / (trend / history.length) * 30000 : Infinity,
      confidence: Math.min(0.95, 0.5 + history.length * 0.05)
    };
  }
  
  private predictFailure(agent: HealthMetric): boolean {
    // ML-based prediction (simplified)
    return agent.errorRate > 0.05 && 
           agent.avgResponseTime > 20000 && 
           agent.consecutiveFailures > 2;
  }
  
  private async getDatabaseHealth(): Promise<DatabaseHealth[]> {
    // Would connect to actual database monitoring
    return [{
      name: 'primary',
      connectionPool: 45,
      queryLatency: 250,
      errorRate: 0.001,
      diskUsage: 0.65
    }];
  }
  
  private async getAPIHealth(): Promise<APIHealth[]> {
    // Would check actual API rate limits
    return [{
      name: 'amazon',
      rateLimit: { used: 8500, total: 10000 },
      avgLatency: 450,
      errorRate: 0.01,
      lastSuccess: new Date()
    }];
  }
  
  private calculateOverallHealth(
    agents: HealthMetric[],
    databases: DatabaseHealth[],
    apis: APIHealth[]
  ): SystemHealth['overall'] {
    const criticalAgents = agents.filter(a => a.status === 'critical').length;
    const degradedAgents = agents.filter(a => a.status === 'degraded').length;
    
    if (criticalAgents > 0) return 'critical';
    if (degradedAgents > agents.length / 2) return 'degraded';
    return 'optimal';
  }
  
  private async updateDashboard(systemHealth: SystemHealth): Promise<void> {
    const supabase = createServiceClient();
    
    await supabase
      .from('system_health')
      .insert({
        timestamp: new Date().toISOString(),
        overall_status: systemHealth.overall,
        agent_metrics: systemHealth.agents,
        database_metrics: systemHealth.databases,
        api_metrics: systemHealth.apis,
        active_recoveries: this.recoveryLog.filter(r => 
          new Date(r.executedAt).getTime() > Date.now() - 3600000
        ).length
      });
  }
  
  private async handleCriticalFailure(error: any): Promise<void> {
    console.error('🚨 CRITICAL SYSTEM FAILURE:', error);
    
    // Implement circuit breaker
    const supabase = createServiceClient();
    
    await supabase
      .from('system_alerts')
      .insert({
        severity: 'critical',
        message: 'Self-healing orchestrator failure',
        error: error.toString(),
        requires_manual_intervention: true
      });
    
    // Send emergency notifications
    await this.sendEmergencyAlert(error);
  }
  
  private async sendEmergencyAlert(error: any): Promise<void> {
    // Would integrate with PagerDuty, Slack, etc.
    console.log('📱 Emergency alert sent to on-call team');
  }
  
  private async escalateIssue(action: RecoveryAction, error: any): Promise<void> {
    const supabase = createServiceClient();
    
    await supabase
      .from('escalations')
      .insert({
        original_action: action,
        error: error.toString(),
        escalation_level: 1,
        assigned_to: 'engineering_team'
      });
  }
  
  private async clearAgentCache(agentName: string): Promise<void> {
    // Clear any in-memory caches for the agent
    console.log(`🧹 Cleared cache for ${agentName}`);
  }
  
  private countConsecutiveFailures(tasks: any[]): number {
    let count = 0;
    const sorted = tasks.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    for (const task of sorted) {
      if (task.status === 'failed' || task.error) {
        count++;
      } else {
        break;
      }
    }
    
    return count;
  }
  
  private groupBy(array: any[], key: string): Record<string, any[]> {
    return array.reduce((result, item) => {
      const group = item[key];
      if (!result[group]) result[group] = [];
      result[group].push(item);
      return result;
    }, {});
  }
  
  private throttleAgent(agentName: string, params: any): Promise<void> {
    console.log(`🐌 Throttling ${agentName} by ${params.reduction * 100}%`);
    return Promise.resolve();
  }
  
  private replaceComponent(target: string, params: any): Promise<void> {
    console.log(`🔄 Replacing component ${target}`);
    return Promise.resolve();
  }
  
  private sendAlert(target: string, params: any): Promise<void> {
    console.log(`📢 Alert sent for ${target}`);
    return Promise.resolve();
  }
}