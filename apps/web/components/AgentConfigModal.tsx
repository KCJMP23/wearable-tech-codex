'use client';

import { useState } from 'react';
import { X, Settings, Clock, Zap, Brain, Calendar, AlertCircle } from 'lucide-react';

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
}

interface AgentConfigModalProps {
  agent: AgentConfig;
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: AgentConfig) => void;
}

export function AgentConfigModal({ agent, isOpen, onClose, onSave }: AgentConfigModalProps) {
  const [config, setConfig] = useState<AgentConfig>(agent);
  const [activeTab, setActiveTab] = useState<'general' | 'schedule' | 'advanced'>('general');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  const cronPresets = [
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Every 4 hours', value: '0 */4 * * *' },
    { label: 'Daily at midnight', value: '0 0 * * *' },
    { label: 'Weekly on Sunday', value: '0 0 * * 0' },
    { label: 'Monthly on 1st', value: '0 0 1 * *' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl rounded-3xl border border-neutral-800 bg-neutral-950 p-8">
        <button
          onClick={onClose}
          className="absolute right-6 top-6 rounded-full p-2 hover:bg-neutral-900"
        >
          <X className="h-5 w-5 text-neutral-400" />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-white">{config.name} Configuration</h2>
          <p className="mt-2 text-sm text-neutral-400">{config.description}</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-full bg-neutral-900 p-1">
          {(['general', 'schedule', 'advanced'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-amber-500 text-neutral-900'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {activeTab === 'general' && (
            <>
              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-white">Agent Status</label>
                  <p className="text-xs text-neutral-400">Enable or disable this agent</p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config.enabled ? 'bg-amber-500' : 'bg-neutral-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Automation Level */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-white">Automation Level</label>
                <div className="grid gap-3">
                  {[
                    { value: 'full', label: 'Fully Automated', icon: Zap, desc: 'Agent runs completely autonomously' },
                    { value: 'supervised', label: 'Supervised', icon: Brain, desc: 'Requires approval for major actions' },
                    { value: 'manual', label: 'Manual Only', icon: Settings, desc: 'Only runs when manually triggered' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setConfig({ ...config, automationLevel: option.value as any })}
                      className={`flex items-start gap-4 rounded-2xl border p-4 transition-colors ${
                        config.automationLevel === option.value
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <option.icon className="mt-1 h-5 w-5 text-amber-500" />
                      <div className="text-left">
                        <div className="font-medium text-white">{option.label}</div>
                        <div className="text-xs text-neutral-400">{option.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Priority Level</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={config.priority}
                  onChange={(e) => setConfig({ ...config, priority: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>Low (1)</span>
                  <span className="text-amber-500 font-medium">Priority: {config.priority}</span>
                  <span>High (10)</span>
                </div>
              </div>
            </>
          )}

          {activeTab === 'schedule' && (
            <>
              {/* Schedule Type */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-white">Schedule Type</label>
                <div className="grid gap-2">
                  {[
                    { value: 'cron', label: 'Cron Expression' },
                    { value: 'interval', label: 'Fixed Interval' },
                    { value: 'manual', label: 'Manual Only' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setConfig({ 
                        ...config, 
                        schedule: { ...config.schedule, type: option.value as any } 
                      })}
                      className={`rounded-xl border px-4 py-2 text-left transition-colors ${
                        config.schedule.type === option.value
                          ? 'border-amber-500 bg-amber-500/10 text-white'
                          : 'border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {config.schedule.type === 'cron' && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-white">Cron Expression</label>
                  <input
                    type="text"
                    value={config.schedule.value}
                    onChange={(e) => setConfig({
                      ...config,
                      schedule: { ...config.schedule, value: e.target.value }
                    })}
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none"
                    placeholder="0 * * * * (every hour)"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    {cronPresets.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setConfig({
                          ...config,
                          schedule: { ...config.schedule, value: preset.value }
                        })}
                        className="rounded-lg border border-neutral-800 px-3 py-2 text-xs text-neutral-400 hover:border-amber-500 hover:text-amber-500"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {config.schedule.type === 'interval' && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-white">Run Interval</label>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      min="1"
                      value={parseInt(config.schedule.value) || 1}
                      onChange={(e) => setConfig({
                        ...config,
                        schedule: { ...config.schedule, value: e.target.value + 'h' }
                      })}
                      className="flex-1 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-white focus:border-amber-500 focus:outline-none"
                    />
                    <select 
                      className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-white focus:border-amber-500 focus:outline-none"
                      value={config.schedule.value.slice(-1)}
                      onChange={(e) => {
                        const num = parseInt(config.schedule.value) || 1;
                        setConfig({
                          ...config,
                          schedule: { ...config.schedule, value: num + e.target.value }
                        });
                      }}
                    >
                      <option value="m">Minutes</option>
                      <option value="h">Hours</option>
                      <option value="d">Days</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 text-amber-500" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-amber-500">Next Run</p>
                    <p className="text-xs text-neutral-400">
                      {config.schedule.type === 'manual' 
                        ? 'Manual trigger only'
                        : `Based on schedule: ${new Date(Date.now() + 3600000).toLocaleString()}`
                      }
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'advanced' && (
            <>
              {/* Max Retries */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Max Retries on Failure</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={config.maxRetries}
                  onChange={(e) => setConfig({ ...config, maxRetries: parseInt(e.target.value) })}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-white focus:border-amber-500 focus:outline-none"
                />
                <p className="text-xs text-neutral-400">Number of retry attempts if the agent fails</p>
              </div>

              {/* Timeout */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Execution Timeout (seconds)</label>
                <input
                  type="number"
                  min="30"
                  max="3600"
                  value={config.timeout}
                  onChange={(e) => setConfig({ ...config, timeout: parseInt(e.target.value) })}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-white focus:border-amber-500 focus:outline-none"
                />
                <p className="text-xs text-neutral-400">Maximum time allowed for agent execution</p>
              </div>

              {/* Agent-Specific Settings */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-white">Agent-Specific Settings</label>
                <textarea
                  value={JSON.stringify(config.settings, null, 2)}
                  onChange={(e) => {
                    try {
                      setConfig({ ...config, settings: JSON.parse(e.target.value) });
                    } catch {}
                  }}
                  className="h-32 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 font-mono text-sm text-white focus:border-amber-500 focus:outline-none"
                  placeholder="{}"
                />
                <p className="text-xs text-neutral-400">JSON configuration for agent-specific parameters</p>
              </div>

              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
                <div className="flex gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-yellow-500" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-yellow-500">Advanced Settings</p>
                    <p className="text-xs text-neutral-400">
                      These settings affect agent performance and resource usage. Modify with caution.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-full border border-neutral-800 px-6 py-2.5 text-sm font-medium text-neutral-400 hover:border-neutral-700 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-full bg-amber-500 px-6 py-2.5 text-sm font-medium text-neutral-900 hover:bg-amber-400"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}