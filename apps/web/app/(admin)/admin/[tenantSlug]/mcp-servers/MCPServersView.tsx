'use client';

import { useState } from 'react';
import { 
  Server, Plus, Settings, Play, Pause, Download, Trash2,
  CheckCircle, AlertCircle, XCircle, Clock, Zap, Shield,
  Code, Globe, Database, Brain, CreditCard, MessageSquare,
  Search, FolderOpen, GitBranch, Chrome, ChevronRight, Star,
  TrendingUp, AlertTriangle, RefreshCw, Terminal, Puzzle
} from 'lucide-react';

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'active' | 'inactive' | 'error' | 'available';
  version: string;
  author: string;
  category: string;
  tools: string[];
  resources: string[];
  installed: boolean;
  config: Record<string, any>;
  stats: {
    calls: number;
    errors: number;
    latency: number;
  };
}

interface MCPServersViewProps {
  tenantSlug: string;
  tenantId: string;
  servers: MCPServer[];
}

export function MCPServersView({ tenantSlug, tenantId, servers: initialServers }: MCPServersViewProps) {
  const [servers, setServers] = useState(initialServers);
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tools' | 'config' | 'logs'>('overview');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showMarketplace, setShowMarketplace] = useState(false);

  const categories = ['all', 'core', 'search', 'development', 'database', 'ai', 'payments', 'communication', 'automation'];
  
  const installedCount = servers.filter(s => s.installed).length;
  const activeCount = servers.filter(s => s.status === 'active').length;
  const totalCalls = servers.reduce((sum, s) => sum + s.stats.calls, 0);
  const totalErrors = servers.reduce((sum, s) => sum + s.stats.errors, 0);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'inactive':
        return <Clock className="h-5 w-5 text-neutral-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Download className="h-5 w-5 text-blue-500" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'search':
        return <Search className="h-4 w-4" />;
      case 'core':
        return <FolderOpen className="h-4 w-4" />;
      case 'development':
        return <GitBranch className="h-4 w-4" />;
      case 'database':
        return <Database className="h-4 w-4" />;
      case 'ai':
        return <Brain className="h-4 w-4" />;
      case 'payments':
        return <CreditCard className="h-4 w-4" />;
      case 'communication':
        return <MessageSquare className="h-4 w-4" />;
      case 'automation':
        return <Chrome className="h-4 w-4" />;
      default:
        return <Server className="h-4 w-4" />;
    }
  };

  const filteredServers = categoryFilter === 'all' 
    ? servers 
    : servers.filter(s => s.category === categoryFilter);

  const handleInstall = (server: MCPServer) => {
    setServers(servers.map(s => 
      s.id === server.id 
        ? { ...s, installed: true, status: 'inactive' as const }
        : s
    ));
  };

  const handleToggle = (server: MCPServer) => {
    if (!server.installed) return;
    
    setServers(servers.map(s => 
      s.id === server.id 
        ? { ...s, status: s.status === 'active' ? 'inactive' as const : 'active' as const }
        : s
    ));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <h2 className="text-2xl font-semibold text-white">MCP Servers</h2>
        <p className="text-sm text-neutral-400">
          Extend platform capabilities with Model Context Protocol servers
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Server className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-neutral-400">Installed</span>
          </div>
          <div className="text-2xl font-semibold text-white">{installedCount}</div>
        </div>
        
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-green-500" />
            <span className="text-xs text-neutral-400">Active</span>
          </div>
          <div className="text-2xl font-semibold text-white">{activeCount}</div>
        </div>
        
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-neutral-400">API Calls</span>
          </div>
          <div className="text-2xl font-semibold text-white">{totalCalls.toLocaleString()}</div>
        </div>
        
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-xs text-neutral-400">Errors</span>
          </div>
          <div className="text-2xl font-semibold text-white">{totalErrors}</div>
        </div>
        
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-purple-500" />
            <span className="text-xs text-neutral-400">Avg Latency</span>
          </div>
          <div className="text-2xl font-semibold text-white">
            {Math.round(servers.reduce((sum, s) => sum + s.stats.latency, 0) / servers.length)}ms
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors ${
              categoryFilter === cat
                ? 'bg-amber-500 text-neutral-900'
                : 'border border-neutral-800 text-neutral-400 hover:border-amber-500 hover:text-amber-500'
            }`}
          >
            {getCategoryIcon(cat)}
            {cat}
          </button>
        ))}
      </div>

      {/* Servers Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredServers.map((server) => (
          <div
            key={server.id}
            className={`rounded-3xl border bg-neutral-950 p-6 transition-all hover:border-amber-500/50 cursor-pointer ${
              server.status === 'active' 
                ? 'border-green-500/20' 
                : server.status === 'error'
                ? 'border-red-500/20'
                : 'border-neutral-800'
            }`}
            onClick={() => setSelectedServer(server)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{server.icon}</div>
                <div>
                  <h3 className="font-semibold text-white">{server.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(server.status)}
                    <span className="text-xs text-neutral-400 capitalize">
                      {server.installed ? server.status : 'Not Installed'}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-neutral-400" />
            </div>

            {/* Description */}
            <p className="text-sm text-neutral-400 mb-4">{server.description}</p>

            {/* Meta */}
            <div className="flex items-center gap-4 mb-4 text-xs text-neutral-500">
              <span className="flex items-center gap-1">
                {getCategoryIcon(server.category)}
                {server.category}
              </span>
              <span>v{server.version}</span>
              <span>by {server.author}</span>
            </div>

            {/* Tools */}
            <div className="flex flex-wrap gap-1 mb-4">
              {server.tools.slice(0, 3).map(tool => (
                <span key={tool} className="rounded-full bg-neutral-900 px-2 py-1 text-xs text-neutral-400">
                  {tool}
                </span>
              ))}
              {server.tools.length > 3 && (
                <span className="rounded-full bg-neutral-900 px-2 py-1 text-xs text-amber-500">
                  +{server.tools.length - 3} more
                </span>
              )}
            </div>

            {/* Stats */}
            {server.installed && (
              <div className="rounded-xl bg-neutral-900/50 p-3 mb-4">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-neutral-500">Calls</div>
                    <div className="font-medium text-white">{server.stats.calls.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-neutral-500">Errors</div>
                    <div className="font-medium text-white">{server.stats.errors}</div>
                  </div>
                  <div>
                    <div className="text-neutral-500">Latency</div>
                    <div className="font-medium text-white">{server.stats.latency}ms</div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {server.installed ? (
                <>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(server);
                    }}
                    className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      server.status === 'active'
                        ? 'border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20'
                        : 'border border-green-500/20 bg-green-500/10 text-green-500 hover:bg-green-500/20'
                    }`}
                  >
                    {server.status === 'active' ? (
                      <>
                        <Pause className="inline-block mr-1 h-3 w-3" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="inline-block mr-1 h-3 w-3" />
                        Start
                      </>
                    )}
                  </button>
                  <button className="flex-1 rounded-full border border-neutral-800 px-4 py-2 text-sm font-medium text-neutral-400 hover:border-amber-500 hover:text-amber-500">
                    <Settings className="inline-block mr-1 h-3 w-3" />
                    Configure
                  </button>
                </>
              ) : (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInstall(server);
                  }}
                  className="flex-1 rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-amber-400"
                >
                  <Download className="inline-block mr-1 h-3 w-3" />
                  Install
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Add Custom Server */}
        <div 
          onClick={() => setShowMarketplace(true)}
          className="rounded-3xl border-2 border-dashed border-neutral-800 p-6 flex flex-col items-center justify-center text-center hover:border-amber-500/50 cursor-pointer transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
            <Plus className="h-6 w-6 text-amber-500" />
          </div>
          <h3 className="font-semibold text-white mb-1">Browse Marketplace</h3>
          <p className="text-xs text-neutral-400">
            Discover community MCP servers and tools
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6">
        <h3 className="text-lg font-semibold text-amber-500 mb-4">🚀 MCP Capabilities</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-xl bg-neutral-950 p-4">
            <Puzzle className="h-5 w-5 text-blue-500 mb-2" />
            <div className="font-medium text-white mb-1">Extensible Tools</div>
            <p className="text-xs text-neutral-400">
              Add any tool or API as an MCP server
            </p>
          </div>
          <div className="rounded-xl bg-neutral-950 p-4">
            <Shield className="h-5 w-5 text-green-500 mb-2" />
            <div className="font-medium text-white mb-1">Sandboxed Execution</div>
            <p className="text-xs text-neutral-400">
              Secure isolation for each server
            </p>
          </div>
          <div className="rounded-xl bg-neutral-950 p-4">
            <Terminal className="h-5 w-5 text-purple-500 mb-2" />
            <div className="font-medium text-white mb-1">Claude Code Compatible</div>
            <p className="text-xs text-neutral-400">
              Works with Claude Code and other MCP clients
            </p>
          </div>
          <div className="rounded-xl bg-neutral-950 p-4">
            <RefreshCw className="h-5 w-5 text-amber-500 mb-2" />
            <div className="font-medium text-white mb-1">Hot Reload</div>
            <p className="text-xs text-neutral-400">
              Update servers without restart
            </p>
          </div>
        </div>
      </div>

      {/* Server Detail Modal */}
      {selectedServer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setSelectedServer(null)}>
          <div className="relative w-full max-w-4xl rounded-3xl border border-neutral-800 bg-neutral-950 p-8" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedServer(null)}
              className="absolute right-6 top-6 rounded-full p-2 hover:bg-neutral-900"
            >
              <XCircle className="h-5 w-5 text-neutral-400" />
            </button>

            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-4xl">{selectedServer.icon}</div>
                <div>
                  <h2 className="text-2xl font-semibold text-white">{selectedServer.name}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    {getStatusIcon(selectedServer.status)}
                    <span className="text-sm text-neutral-400 capitalize">
                      {selectedServer.installed ? selectedServer.status : 'Not Installed'}
                    </span>
                    <span className="text-sm text-neutral-500">v{selectedServer.version}</span>
                    <span className="text-sm text-neutral-500">by {selectedServer.author}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 rounded-full bg-neutral-900 p-1 mb-6">
              {(['overview', 'tools', 'config', 'logs'] as const).map((tab) => (
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

            {/* Tab Content */}
            <div className="space-y-6">
              {activeTab === 'overview' && (
                <>
                  <p className="text-neutral-400">{selectedServer.description}</p>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                      <div className="text-xs text-neutral-400 mb-1">Total Calls</div>
                      <div className="text-2xl font-semibold text-white">{selectedServer.stats.calls.toLocaleString()}</div>
                    </div>
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                      <div className="text-xs text-neutral-400 mb-1">Error Rate</div>
                      <div className="text-2xl font-semibold text-white">
                        {selectedServer.stats.calls > 0 
                          ? ((selectedServer.stats.errors / selectedServer.stats.calls) * 100).toFixed(2)
                          : 0}%
                      </div>
                    </div>
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                      <div className="text-xs text-neutral-400 mb-1">Avg Latency</div>
                      <div className="text-2xl font-semibold text-white">{selectedServer.stats.latency}ms</div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'tools' && (
                <div className="space-y-4">
                  <h3 className="font-medium text-white">Available Tools ({selectedServer.tools.length})</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedServer.tools.map(tool => (
                      <div key={tool} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Code className="h-4 w-4 text-amber-500" />
                          <span className="font-medium text-white">{tool}</span>
                        </div>
                        <p className="text-xs text-neutral-400">
                          Tool function for {selectedServer.name}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  {selectedServer.resources.length > 0 && (
                    <>
                      <h3 className="font-medium text-white mt-6">Resources</h3>
                      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                        {selectedServer.resources.map(resource => (
                          <div key={resource} className="text-sm text-neutral-400">
                            {resource}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'config' && (
                <div className="space-y-4">
                  {selectedServer.installed ? (
                    <>
                      {Object.entries(selectedServer.config).map(([key, value]) => (
                        <div key={key} className="space-y-2">
                          <label className="text-sm font-medium text-white capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </label>
                          <input
                            type={typeof value === 'boolean' ? 'checkbox' : 'text'}
                            value={typeof value === 'boolean' ? undefined : value}
                            checked={typeof value === 'boolean' ? value : undefined}
                            className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-white"
                            readOnly
                          />
                        </div>
                      ))}
                      
                      <div className="flex gap-3 mt-6">
                        <button className="rounded-full bg-amber-500 px-6 py-2 text-sm font-medium text-neutral-900 hover:bg-amber-400">
                          Save Configuration
                        </button>
                        <button className="rounded-full border border-red-500/20 bg-red-500/10 px-6 py-2 text-sm font-medium text-red-500 hover:bg-red-500/20">
                          Uninstall
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-center">
                      <Download className="h-12 w-12 text-amber-500 mx-auto mb-3" />
                      <h3 className="font-medium text-white mb-2">Not Installed</h3>
                      <p className="text-sm text-neutral-400 mb-4">
                        Install {selectedServer.name} to configure settings
                      </p>
                      <button 
                        onClick={() => handleInstall(selectedServer)}
                        className="rounded-full bg-amber-500 px-6 py-2 text-sm font-medium text-neutral-900 hover:bg-amber-400"
                      >
                        Install Now
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'logs' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 font-mono text-xs">
                    <div className="text-green-400">[2024-01-20 10:23:45] Server started successfully</div>
                    <div className="text-blue-400">[2024-01-20 10:23:46] Connected to {selectedServer.name} API</div>
                    <div className="text-neutral-400">[2024-01-20 10:24:01] Tool: web_search executed (latency: 234ms)</div>
                    <div className="text-neutral-400">[2024-01-20 10:24:15] Tool: web_search executed (latency: 189ms)</div>
                    <div className="text-yellow-400">[2024-01-20 10:25:02] Warning: Rate limit approaching (450/500)</div>
                    <div className="text-neutral-400">[2024-01-20 10:25:30] Tool: local_search executed (latency: 145ms)</div>
                    <div className="text-red-400">[2024-01-20 10:26:45] Error: API timeout after 5000ms</div>
                    <div className="text-green-400">[2024-01-20 10:26:46] Retry successful</div>
                  </div>
                  
                  <button className="rounded-full border border-neutral-800 px-4 py-2 text-sm font-medium text-neutral-400 hover:border-amber-500 hover:text-amber-500">
                    Download Full Logs
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
