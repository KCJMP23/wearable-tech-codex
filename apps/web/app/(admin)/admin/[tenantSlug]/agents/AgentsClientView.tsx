'use client';

import { useState } from 'react';
import { Settings, Play, Clock, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import { AgentConfigModal } from '../../../../../components/AgentConfigModal';
import { triggerAgent, saveAgentConfig } from './actions';

interface AgentConfig {
  name: string;
  description: string;
  cadence: string;
  enabled: boolean;
  automationLevel: 'full' | 'supervised' | 'manual';
  schedule: {
    type: 'cron' | 'interval' | 'manual';
    value: string;
  };
  settings: Record<string, any>;
  priority: number;
  maxRetries: number;
  timeout: number;
  lastTask?: any;
}

interface AgentsClientViewProps {
  tenantSlug: string;
  tenantId: string;
  agents: AgentConfig[];
}

export function AgentsClientView({ tenantSlug, tenantId, agents: initialAgents }: AgentsClientViewProps) {
  const [agents, setAgents] = useState(initialAgents);
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [runningAgents, setRunningAgents] = useState<Set<string>>(new Set());

  const handleConfigClick = (agent: AgentConfig) => {
    setSelectedAgent(agent);
    setIsModalOpen(true);
  };

  const handleSaveConfig = async (config: AgentConfig) => {
    // Update local state
    setAgents(agents.map(a => a.name === config.name ? config : a));
    
    // Save to database
    await saveAgentConfig(tenantId, config);
  };

  const handleRunAgent = async (agentName: string) => {
    setRunningAgents(new Set([...runningAgents, agentName]));
    
    try {
      await triggerAgent(tenantSlug, agentName);
      
      // Simulate run completion (in real app would poll for status)
      setTimeout(() => {
        setRunningAgents(prev => {
          const next = new Set(prev);
          next.delete(agentName);
          return next;
        });
      }, 3000);
    } catch (error) {
      setRunningAgents(prev => {
        const next = new Set(prev);
        next.delete(agentName);
        return next;
      });
    }
  };

  const getStatusIcon = (agent: AgentConfig) => {
    if (runningAgents.has(agent.name)) {
      return <div className="animate-spin h-5 w-5 border-2 border-amber-500 border-t-transparent rounded-full" />;
    }
    
    if (!agent.enabled) {
      return <AlertTriangle className="h-5 w-5 text-neutral-500" />;
    }
    
    if (agent.lastTask?.status === 'failed') {
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
    
    if (agent.lastTask?.status === 'completed') {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    
    return <Clock className="h-5 w-5 text-neutral-400" />;
  };

  const getAutomationBadge = (level: string) => {
    const colors = {
      full: 'bg-green-500/10 text-green-500 border-green-500/20',
      supervised: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      manual: 'bg-neutral-500/10 text-neutral-400 border-neutral-700'
    };
    
    return colors[level as keyof typeof colors] || colors.manual;
  };

  return (
    <>
      <div className="space-y-8">
        <header>
          <h2 className="text-2xl font-semibold text-white">AI Agents Configuration</h2>
          <p className="text-sm text-neutral-400">
            Configure automation levels, schedules, and behaviors for each agent
          </p>
        </header>

        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
            <div className="text-2xl font-semibold text-white">{agents.filter(a => a.enabled).length}</div>
            <div className="text-xs text-neutral-400">Active Agents</div>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
            <div className="text-2xl font-semibold text-amber-500">
              {agents.filter(a => a.automationLevel === 'full').length}
            </div>
            <div className="text-xs text-neutral-400">Fully Automated</div>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
            <div className="text-2xl font-semibold text-green-500">
              {agents.filter(a => a.lastTask?.status === 'completed').length}
            </div>
            <div className="text-xs text-neutral-400">Successful Runs</div>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
            <div className="text-2xl font-semibold text-red-500">
              {agents.filter(a => a.lastTask?.status === 'failed').length}
            </div>
            <div className="text-xs text-neutral-400">Failed Runs</div>
          </div>
        </div>

        {/* Agents Grid */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => (
            <div
              key={agent.name}
              className={`relative rounded-3xl border bg-neutral-950 p-6 transition-all ${
                agent.enabled 
                  ? 'border-neutral-800 hover:border-neutral-700' 
                  : 'border-neutral-800/50 opacity-75'
              }`}
            >
              {/* Status Indicator */}
              <div className="absolute right-6 top-6">
                {getStatusIcon(agent)}
              </div>

              <div className="space-y-4">
                {/* Header */}
                <div className="pr-8">
                  <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
                  <p className="mt-1 text-sm text-neutral-400">{agent.description}</p>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
                    getAutomationBadge(agent.automationLevel)
                  }`}>
                    {agent.automationLevel === 'full' && <Zap className="mr-1 h-3 w-3" />}
                    {agent.automationLevel === 'supervised' && '👁 '}
                    {agent.automationLevel === 'manual' && '✋ '}
                    {agent.automationLevel.charAt(0).toUpperCase() + agent.automationLevel.slice(1)}
                  </span>
                  
                  <span className="inline-flex items-center rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-400">
                    <Clock className="mr-1 h-3 w-3" />
                    {agent.cadence}
                  </span>
                  
                  {agent.priority >= 8 && (
                    <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-500">
                      High Priority
                    </span>
                  )}
                </div>

                {/* Last Run Info */}
                {agent.lastTask && (
                  <div className="rounded-xl bg-neutral-900 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-500">Last run</span>
                      <span className={`text-xs font-medium ${
                        agent.lastTask.status === 'completed' ? 'text-green-500' :
                        agent.lastTask.status === 'failed' ? 'text-red-500' :
                        'text-amber-500'
                      }`}>
                        {agent.lastTask.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-neutral-400">
                      {new Date(agent.lastTask.createdAt).toLocaleString()}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleConfigClick(agent)}
                    className="flex-1 rounded-full border border-neutral-800 px-4 py-2 text-sm font-medium text-neutral-400 hover:border-amber-500 hover:text-amber-500 transition-colors"
                  >
                    <Settings className="inline-block mr-1.5 h-4 w-4" />
                    Configure
                  </button>
                  
                  <button
                    onClick={() => handleRunAgent(agent.name)}
                    disabled={!agent.enabled || runningAgents.has(agent.name)}
                    className="flex-1 rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Play className="inline-block mr-1.5 h-4 w-4" />
                    {runningAgents.has(agent.name) ? 'Running...' : 'Run Now'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6">
          <h3 className="text-lg font-semibold text-amber-500 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => {
                agents.forEach(a => {
                  if (a.automationLevel === 'full') handleRunAgent(a.name);
                });
              }}
              className="rounded-xl border border-amber-500/20 bg-amber-500/10 py-3 text-sm font-medium text-amber-500 hover:bg-amber-500/20 transition-colors"
            >
              Run All Automated
            </button>
            <button
              onClick={() => setAgents(agents.map(a => ({ ...a, enabled: true })))}
              className="rounded-xl border border-green-500/20 bg-green-500/10 py-3 text-sm font-medium text-green-500 hover:bg-green-500/20 transition-colors"
            >
              Enable All Agents
            </button>
            <button
              onClick={() => setAgents(agents.map(a => ({ ...a, enabled: false })))}
              className="rounded-xl border border-red-500/20 bg-red-500/10 py-3 text-sm font-medium text-red-500 hover:bg-red-500/20 transition-colors"
            >
              Pause All Agents
            </button>
          </div>
        </div>
      </div>

      {/* Configuration Modal */}
      {selectedAgent && (
        <AgentConfigModal
          agent={selectedAgent}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedAgent(null);
          }}
          onSave={handleSaveConfig}
        />
      )}
    </>
  );
}