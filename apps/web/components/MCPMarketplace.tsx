'use client';

import { useState, useEffect } from 'react';
import {
  Search, Star, Download, Shield, CheckCircle, X,
  Filter, TrendingUp, Award, Clock, Code, Zap,
  Globe, Database, Brain, CreditCard, MessageSquare,
  FolderOpen, GitBranch, Chrome, Plus
} from 'lucide-react';

interface MCPMarketplaceItem {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  category: string;
  rating: number;
  downloads: number;
  verified: boolean;
  tools: string[];
  requiredPermissions: string[];
  configSchema?: any;
}

interface MCPMarketplaceProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: (item: MCPMarketplaceItem, config: any) => Promise<void>;
  tenantId: string;
  installedServerIds: string[];
}

export function MCPMarketplace({ 
  isOpen, 
  onClose, 
  onInstall, 
  tenantId,
  installedServerIds = []
}: MCPMarketplaceProps) {
  const [servers, setServers] = useState<MCPMarketplaceItem[]>([]);
  const [filteredServers, setFilteredServers] = useState<MCPMarketplaceItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServer, setSelectedServer] = useState<MCPMarketplaceItem | null>(null);
  const [configStep, setConfigStep] = useState(false);
  const [serverConfig, setServerConfig] = useState<any>({});
  const [installing, setInstalling] = useState(false);
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'recent'>('popular');

  const categories = [
    { id: 'all', name: 'All', icon: Globe },
    { id: 'core', name: 'Core', icon: FolderOpen },
    { id: 'search', name: 'Search', icon: Search },
    { id: 'development', name: 'Development', icon: GitBranch },
    { id: 'database', name: 'Database', icon: Database },
    { id: 'ai', name: 'AI & ML', icon: Brain },
    { id: 'payments', name: 'Payments', icon: CreditCard },
    { id: 'communication', name: 'Communication', icon: MessageSquare },
    { id: 'automation', name: 'Automation', icon: Chrome },
    { id: 'custom', name: 'Custom', icon: Code }
  ];

  useEffect(() => {
    loadMarketplaceServers();
  }, []);

  useEffect(() => {
    filterAndSortServers();
  }, [servers, selectedCategory, searchQuery, sortBy]);

  const loadMarketplaceServers = async () => {
    try {
      const response = await fetch(`/api/mcp-servers?tenantId=${tenantId}&action=marketplace`);
      const data = await response.json();
      setServers(data);
    } catch (error) {
      console.error('Failed to load marketplace servers:', error);
    }
  };

  const filterAndSortServers = () => {
    let filtered = servers;

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(s => s.category === selectedCategory);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.author.toLowerCase().includes(query) ||
        s.tools.some(t => t.toLowerCase().includes(query))
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'recent':
          return b.version.localeCompare(a.version);
        case 'popular':
        default:
          return b.downloads - a.downloads;
      }
    });

    setFilteredServers(filtered);
  };

  const handleInstallClick = (server: MCPMarketplaceItem) => {
    setSelectedServer(server);
    
    // If server requires configuration, show config step
    if (server.configSchema) {
      setConfigStep(true);
      // Initialize config with defaults from schema
      const defaultConfig: any = {};
      if (server.configSchema.properties) {
        Object.entries(server.configSchema.properties).forEach(([key, prop]: [string, any]) => {
          if (prop.default !== undefined) {
            defaultConfig[key] = prop.default;
          }
        });
      }
      setServerConfig(defaultConfig);
    } else {
      // Direct install without config
      handleInstall(server, {});
    }
  };

  const handleInstall = async (server: MCPMarketplaceItem, config: any) => {
    setInstalling(true);
    try {
      await onInstall(server, config);
      setSelectedServer(null);
      setConfigStep(false);
      setServerConfig({});
      // Refresh marketplace to update installed status
      loadMarketplaceServers();
    } catch (error) {
      console.error('Installation failed:', error);
    } finally {
      setInstalling(false);
    }
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? <category.icon className="h-4 w-4" /> : null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative h-[90vh] w-full max-w-7xl overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-8 py-6">
          <div>
            <h2 className="text-2xl font-semibold text-white">MCP Server Marketplace</h2>
            <p className="text-sm text-neutral-400">
              Discover and install servers to extend your platform capabilities
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-neutral-900"
          >
            <X className="h-5 w-5 text-neutral-400" />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="border-b border-neutral-800 px-8 py-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search servers, tools, or authors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full border border-neutral-800 bg-neutral-900 pl-10 pr-4 py-2 text-sm text-white placeholder-neutral-400 focus:border-amber-500 focus:outline-none"
              />
            </div>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
            >
              <option value="popular">Most Popular</option>
              <option value="rating">Highest Rated</option>
              <option value="recent">Recently Updated</option>
            </select>
          </div>
        </div>

        <div className="flex h-[calc(100%-180px)]">
          {/* Categories Sidebar */}
          <div className="w-64 border-r border-neutral-800 p-4">
            <h3 className="mb-4 text-xs font-medium uppercase text-neutral-400">Categories</h3>
            <div className="space-y-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-amber-500/10 text-amber-500'
                      : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
                  }`}
                >
                  <category.icon className="h-4 w-4" />
                  <span>{category.name}</span>
                  <span className="ml-auto text-xs text-neutral-500">
                    {servers.filter(s => category.id === 'all' || s.category === category.id).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Servers Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredServers.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Search className="mb-4 h-12 w-12 text-neutral-600" />
                <h3 className="text-lg font-medium text-white">No servers found</h3>
                <p className="text-sm text-neutral-400">Try adjusting your filters or search query</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredServers.map((server) => {
                  const isInstalled = installedServerIds.includes(server.id);
                  
                  return (
                    <div
                      key={server.id}
                      className="group relative rounded-2xl border border-neutral-800 bg-neutral-900 p-5 transition-all hover:border-amber-500/50"
                    >
                      {/* Verified Badge */}
                      {server.verified && (
                        <div className="absolute right-3 top-3">
                          <div className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-1">
                            <Shield className="h-3 w-3 text-blue-500" />
                            <span className="text-xs text-blue-500">Verified</span>
                          </div>
                        </div>
                      )}

                      {/* Header */}
                      <div className="mb-3">
                        <h3 className="font-semibold text-white">{server.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-neutral-500">by {server.author}</span>
                          <span className="text-xs text-neutral-600">•</span>
                          <span className="text-xs text-neutral-500">v{server.version}</span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-neutral-400 mb-3 line-clamp-2">
                        {server.description}
                      </p>

                      {/* Stats */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-amber-500" />
                          <span className="text-xs text-white">{server.rating.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Download className="h-3 w-3 text-neutral-400" />
                          <span className="text-xs text-neutral-400">{server.downloads.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {getCategoryIcon(server.category)}
                          <span className="text-xs text-neutral-400">{server.category}</span>
                        </div>
                      </div>

                      {/* Tools Preview */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {server.tools.slice(0, 3).map(tool => (
                          <span key={tool} className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
                            {tool}
                          </span>
                        ))}
                        {server.tools.length > 3 && (
                          <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-amber-500">
                            +{server.tools.length - 3}
                          </span>
                        )}
                      </div>

                      {/* Install Button */}
                      {isInstalled ? (
                        <button
                          disabled
                          className="w-full rounded-full border border-green-500/20 bg-green-500/10 py-2 text-sm font-medium text-green-500"
                        >
                          <CheckCircle className="inline-block mr-1 h-3 w-3" />
                          Installed
                        </button>
                      ) : (
                        <button
                          onClick={() => handleInstallClick(server)}
                          className="w-full rounded-full bg-amber-500 py-2 text-sm font-medium text-neutral-900 transition-colors hover:bg-amber-400"
                        >
                          <Download className="inline-block mr-1 h-3 w-3" />
                          Install
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Custom Server Creation */}
        <div className="absolute bottom-6 right-6">
          <button
            onClick={() => {/* Handle custom server creation */}}
            className="flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-neutral-900 shadow-lg transition-colors hover:bg-amber-400"
          >
            <Plus className="h-4 w-4" />
            Create Custom Server
          </button>
        </div>
      </div>

      {/* Configuration Modal */}
      {selectedServer && configStep && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Configure {selectedServer.name}
            </h3>
            
            {selectedServer.configSchema?.properties && (
              <div className="space-y-4 mb-6">
                {Object.entries(selectedServer.configSchema.properties).map(([key, prop]: [string, any]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-white mb-2">
                      {prop.title || key}
                      {selectedServer.configSchema.required?.includes(key) && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>
                    {prop.type === 'boolean' ? (
                      <input
                        type="checkbox"
                        checked={serverConfig[key] || false}
                        onChange={(e) => setServerConfig({
                          ...serverConfig,
                          [key]: e.target.checked
                        })}
                        className="rounded border-neutral-800 bg-neutral-900 text-amber-500"
                      />
                    ) : (
                      <input
                        type={prop.type === 'number' ? 'number' : 'text'}
                        value={serverConfig[key] || ''}
                        onChange={(e) => setServerConfig({
                          ...serverConfig,
                          [key]: e.target.value
                        })}
                        placeholder={prop.placeholder || prop.description}
                        className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-white placeholder-neutral-400 focus:border-amber-500 focus:outline-none"
                      />
                    )}
                    {prop.description && (
                      <p className="mt-1 text-xs text-neutral-400">{prop.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setConfigStep(false);
                  setSelectedServer(null);
                  setServerConfig({});
                }}
                className="flex-1 rounded-full border border-neutral-800 py-2 text-sm font-medium text-neutral-400 hover:border-amber-500 hover:text-amber-500"
                disabled={installing}
              >
                Cancel
              </button>
              <button
                onClick={() => handleInstall(selectedServer, serverConfig)}
                className="flex-1 rounded-full bg-amber-500 py-2 text-sm font-medium text-neutral-900 hover:bg-amber-400"
                disabled={installing}
              >
                {installing ? (
                  <>
                    <Clock className="inline-block mr-1 h-3 w-3 animate-spin" />
                    Installing...
                  </>
                ) : (
                  <>
                    <Zap className="inline-block mr-1 h-3 w-3" />
                    Install & Configure
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}