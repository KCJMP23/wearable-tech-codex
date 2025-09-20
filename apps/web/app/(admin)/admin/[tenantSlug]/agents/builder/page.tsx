'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card } from '@affiliate-factory/ui';
import { ArrowLeft, Play, Code, Settings, Workflow, Save, TestTube } from 'lucide-react';

interface AgentConfiguration {
  name: string;
  description: string;
  category: string;
  agent_type: string;
  schedule: {
    type: string;
    value: string;
  };
  automation_level: string;
  priority: number;
  max_retries: number;
  timeout: number;
  goals: Array<{
    metric: string;
    target: number;
    threshold?: number;
  }>;
}

interface WorkflowStep {
  id: string;
  type: string;
  name: string;
  configuration: Record<string, any>;
  dependencies?: string[];
}

const stepTypes = [
  { value: 'data_fetch', label: 'Data Fetch', description: 'Retrieve data from APIs or databases' },
  { value: 'ai_generation', label: 'AI Generation', description: 'Generate content using AI models' },
  { value: 'api_call', label: 'API Call', description: 'Call external APIs' },
  { value: 'database_update', label: 'Database Update', description: 'Update database records' },
  { value: 'notification', label: 'Notification', description: 'Send notifications or alerts' },
];

const goalMetrics = [
  'page_views', 'click_through_rate', 'conversion_rate', 'revenue', 'engagement_rate',
  'social_shares', 'email_open_rate', 'content_published', 'products_updated', 'custom'
];

export default function AgentBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;

  const [activeTab, setActiveTab] = useState('basic');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [configuration, setConfiguration] = useState<AgentConfiguration>({
    name: '',
    description: '',
    category: 'custom',
    agent_type: 'scheduled',
    schedule: {
      type: 'cron',
      value: '0 9 * * *', // Daily at 9 AM
    },
    automation_level: 'supervised',
    priority: 5,
    max_retries: 3,
    timeout: 300,
    goals: [],
  });

  const [workflow, setWorkflow] = useState<WorkflowStep[]>([]);
  const [customCode, setCustomCode] = useState({
    language: 'javascript',
    source_code: `// Custom agent code
export async function execute(task, dependencies) {
  try {
    // Your agent logic here
    console.log('Agent executing with input:', task.input);
    
    // Example: Fetch data
    // const data = await dependencies.supabase
    //   .from('table')
    //   .select('*');
    
    // Example: Generate AI content
    // const content = await dependencies.openai.chat.completions.create({
    //   model: 'gpt-4',
    //   messages: [{ role: 'user', content: 'Generate content...' }]
    // });
    
    return {
      success: true,
      data: {
        message: 'Agent executed successfully',
        // Add your results here
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}`,
    dependencies: ['@supabase/supabase-js', 'openai'],
  });

  const addWorkflowStep = (type: string) => {
    const newStep: WorkflowStep = {
      id: `step_${Date.now()}`,
      type,
      name: `${stepTypes.find(t => t.value === type)?.label} Step`,
      configuration: {},
    };
    setWorkflow([...workflow, newStep]);
  };

  const updateWorkflowStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    setWorkflow(workflow.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  const removeWorkflowStep = (stepId: string) => {
    setWorkflow(workflow.filter(step => step.id !== stepId));
  };

  const addGoal = () => {
    setConfiguration({
      ...configuration,
      goals: [...configuration.goals, { metric: 'page_views', target: 100 }],
    });
  };

  const removeGoal = (index: number) => {
    setConfiguration({
      ...configuration,
      goals: configuration.goals.filter((_, i) => i !== index),
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const agentData = {
        tenant_id: tenantSlug, // In real app, resolve to tenant ID
        name: configuration.name,
        description: configuration.description,
        category: configuration.category,
        agent_type: configuration.agent_type,
        configuration: {
          schedule: configuration.schedule,
          goals: configuration.goals,
          automation_level: configuration.automation_level,
          retry_settings: {
            max_retries: configuration.max_retries,
            retry_delay: 60,
          },
          timeout: configuration.timeout,
          priority: configuration.priority,
        },
        workflow: {
          steps: workflow,
          error_handling: {
            strategy: 'retry',
            max_failures: 3,
          },
        },
        code: workflow.length === 0 ? customCode : undefined,
        enabled: true,
      };

      const response = await fetch('/api/agents/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentData),
      });

      if (response.ok) {
        router.push(`/admin/${tenantSlug}/agents`);
      } else {
        const error = await response.json();
        console.error('Failed to save agent:', error);
      }
    } catch (error) {
      console.error('Error saving agent:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      // In real implementation, this would execute the agent in test mode
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Agent test completed successfully!');
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Agents</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Agent Builder</h1>
            <p className="text-gray-600">Create and customize your AI agent</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testing || !configuration.name}
            className="flex items-center space-x-2"
          >
            <TestTube className="h-4 w-4" />
            <span>{testing ? 'Testing...' : 'Test Agent'}</span>
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !configuration.name}
            className="flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save Agent'}</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'basic', label: 'Basic Configuration', icon: Settings },
            { id: 'workflow', label: 'Workflow Builder', icon: Workflow },
            { id: 'code', label: 'Custom Code', icon: Code },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'basic' && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Agent Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agent Name
                </label>
                <input
                  type="text"
                  value={configuration.name}
                  onChange={(e) => setConfiguration({ ...configuration, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter agent name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={configuration.description}
                  onChange={(e) => setConfiguration({ ...configuration, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe what this agent does"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={configuration.category}
                  onChange={(e) => setConfiguration({ ...configuration, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="content">Content</option>
                  <option value="marketing">Marketing</option>
                  <option value="analytics">Analytics</option>
                  <option value="optimization">Optimization</option>
                  <option value="social">Social</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Automation Level
                </label>
                <select
                  value={configuration.automation_level}
                  onChange={(e) => setConfiguration({ ...configuration, automation_level: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="manual">Manual - Requires approval</option>
                  <option value="supervised">Supervised - Auto with review</option>
                  <option value="full">Full - Completely automated</option>
                </select>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Schedule & Performance</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule Type
                </label>
                <select
                  value={configuration.schedule.type}
                  onChange={(e) => setConfiguration({
                    ...configuration,
                    schedule: { ...configuration.schedule, type: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cron">Cron Schedule</option>
                  <option value="interval">Interval</option>
                  <option value="manual">Manual Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule Value
                </label>
                <input
                  type="text"
                  value={configuration.schedule.value}
                  onChange={(e) => setConfiguration({
                    ...configuration,
                    schedule: { ...configuration.schedule, value: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0 9 * * * (daily at 9 AM)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority (1-10)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={configuration.priority}
                    onChange={(e) => setConfiguration({ ...configuration, priority: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Retries
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={configuration.max_retries}
                    onChange={(e) => setConfiguration({ ...configuration, max_retries: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timeout (seconds)
                </label>
                <input
                  type="number"
                  min="10"
                  max="3600"
                  value={configuration.timeout}
                  onChange={(e) => setConfiguration({ ...configuration, timeout: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </Card>

          {/* Goals Section */}
          <Card className="p-6 md:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Goals & Success Metrics</h3>
              <Button onClick={addGoal} size="sm">Add Goal</Button>
            </div>
            <div className="space-y-4">
              {configuration.goals.map((goal, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                  <select
                    value={goal.metric}
                    onChange={(e) => {
                      const newGoals = [...configuration.goals];
                      newGoals[index].metric = e.target.value;
                      setConfiguration({ ...configuration, goals: newGoals });
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {goalMetrics.map(metric => (
                      <option key={metric} value={metric}>
                        {metric.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={goal.target}
                    onChange={(e) => {
                      const newGoals = [...configuration.goals];
                      newGoals[index].target = parseInt(e.target.value);
                      setConfiguration({ ...configuration, goals: newGoals });
                    }}
                    placeholder="Target value"
                    className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    onClick={() => removeGoal(index)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </Button>
                </div>
              ))}
              {configuration.goals.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  No goals set. Add goals to measure agent success.
                </p>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'workflow' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Workflow Steps</h3>
              <div className="flex space-x-2">
                {stepTypes.map(type => (
                  <Button
                    key={type.value}
                    onClick={() => addWorkflowStep(type.value)}
                    variant="outline"
                    size="sm"
                  >
                    + {type.label}
                  </Button>
                ))}
              </div>
            </div>

            {workflow.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No workflow steps defined.</p>
                <p className="text-sm">Add steps above to create your agent workflow.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {workflow.map((step, index) => (
                  <div key={step.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="flex items-center justify-center w-6 h-6 bg-blue-500 text-white text-sm rounded-full">
                          {index + 1}
                        </span>
                        <div>
                          <input
                            type="text"
                            value={step.name}
                            onChange={(e) => updateWorkflowStep(step.id, { name: e.target.value })}
                            className="font-medium text-lg border-none outline-none bg-transparent"
                          />
                          <p className="text-sm text-gray-500">
                            {stepTypes.find(t => t.value === step.type)?.description}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => removeWorkflowStep(step.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </Button>
                    </div>

                    <div className="ml-9">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Step Configuration
                      </label>
                      <textarea
                        value={JSON.stringify(step.configuration, null, 2)}
                        onChange={(e) => {
                          try {
                            const config = JSON.parse(e.target.value);
                            updateWorkflowStep(step.id, { configuration: config });
                          } catch {
                            // Invalid JSON, ignore
                          }
                        }}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        placeholder="Enter step configuration as JSON"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'code' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Custom Code</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Programming Language
              </label>
              <select
                value={customCode.language}
                onChange={(e) => setCustomCode({ ...customCode, language: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source Code
              </label>
              <textarea
                value={customCode.source_code}
                onChange={(e) => setCustomCode({ ...customCode, source_code: e.target.value })}
                rows={20}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="Enter your agent code here..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dependencies (one per line)
              </label>
              <textarea
                value={customCode.dependencies?.join('\n')}
                onChange={(e) => setCustomCode({
                  ...customCode,
                  dependencies: e.target.value.split('\n').filter(dep => dep.trim())
                })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="@supabase/supabase-js&#10;openai&#10;axios"
              />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}