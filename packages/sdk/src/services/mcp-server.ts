import { createClient } from '../supabase/server.js';
import type { Database } from '../database.types.js';

type MCPServer = Database['public']['Tables']['mcp_servers']['Row'];
type MCPServerInsert = Database['public']['Tables']['mcp_servers']['Insert'];
type MCPServerUpdate = Database['public']['Tables']['mcp_servers']['Update'];
type MCPServerLog = Database['public']['Tables']['mcp_server_logs']['Row'];

export interface MCPServerConfig {
  [key: string]: any;
}

export interface MCPServerStats {
  calls: number;
  errors: number;
  latency: number;
}

export interface MCPServerExecutionContext {
  tenantId: string;
  serverId: string;
  tools: string[];
  config: MCPServerConfig;
}

export interface MCPServerExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  latency?: number;
}

interface MCPServerMarketplaceItem {
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

export class MCPServerService {
  private getSupabase() {
    return createClient();
  }

  // Server Management
  async listServers(tenantId: string) {
    const { data, error } = await this.getSupabase()
      .from('mcp_servers')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to list MCP servers: ${error.message}`);
    return data;
  }

  async getServer(tenantId: string, serverId: string) {
    const { data, error } = await this.getSupabase()
      .from('mcp_servers')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('server_id', serverId)
      .single();

    if (error) throw new Error(`Failed to get MCP server: ${error.message}`);
    return data;
  }

  async installServer(
    tenantId: string, 
    marketplaceItem: MCPServerMarketplaceItem,
    config: MCPServerConfig = {}
  ) {
    const server: MCPServerInsert = {
      tenant_id: tenantId,
      server_id: marketplaceItem.id,
      name: marketplaceItem.name,
      description: marketplaceItem.description,
      author: marketplaceItem.author,
      version: marketplaceItem.version,
      category: marketplaceItem.category,
      tools: marketplaceItem.tools,
      config,
      installed: true,
      status: 'inactive'
    };

    const { data, error } = await this.getSupabase()
      .from('mcp_servers')
      .insert(server)
      .select()
      .single();

    if (error) throw new Error(`Failed to install MCP server: ${error.message}`);
    
    await this.logActivity(tenantId, marketplaceItem.id, 'info', `Server installed: ${marketplaceItem.name}`);
    return data;
  }

  async updateServerConfig(
    tenantId: string,
    serverId: string,
    config: MCPServerConfig
  ) {
    const update: MCPServerUpdate = {
      config,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await this.getSupabase()
      .from('mcp_servers')
      .update(update)
      .eq('tenant_id', tenantId)
      .eq('server_id', serverId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update server config: ${error.message}`);
    
    await this.logActivity(tenantId, serverId, 'info', 'Configuration updated');
    return data;
  }

  async toggleServer(tenantId: string, serverId: string) {
    const server = await this.getServer(tenantId, serverId);
    const newStatus = server.status === 'active' ? 'inactive' : 'active';

    const { data, error } = await this.getSupabase()
      .from('mcp_servers')
      .update({ 
        status: newStatus,
        last_heartbeat: newStatus === 'active' ? new Date().toISOString() : null
      })
      .eq('tenant_id', tenantId)
      .eq('server_id', serverId)
      .select()
      .single();

    if (error) throw new Error(`Failed to toggle server: ${error.message}`);
    
    await this.logActivity(
      tenantId, 
      serverId, 
      'info', 
      `Server ${newStatus === 'active' ? 'started' : 'stopped'}`
    );
    return data;
  }

  async uninstallServer(tenantId: string, serverId: string) {
    const { error } = await this.getSupabase()
      .from('mcp_servers')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('server_id', serverId);

    if (error) throw new Error(`Failed to uninstall server: ${error.message}`);
    
    await this.logActivity(tenantId, serverId, 'info', 'Server uninstalled');
    return true;
  }

  // Execution & Sandboxing
  async executeServerTool(
    context: MCPServerExecutionContext,
    tool: string,
    params: any
  ): Promise<MCPServerExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Validate tool is available
      if (!context.tools.includes(tool)) {
        throw new Error(`Tool '${tool}' not available in this server`);
      }

      // Security sandbox - validate parameters
      const sanitizedParams = this.sanitizeParameters(params);
      
      // Execute in sandboxed environment
      const result = await this.executeSandboxed(
        context.serverId,
        tool,
        sanitizedParams,
        context.config
      );

      const latency = Date.now() - startTime;
      
      // Update stats
      await this.updateServerStats(context.tenantId, context.serverId, {
        calls: 1,
        latency
      });

      return {
        success: true,
        data: result,
        latency
      };
    } catch (error: any) {
      const latency = Date.now() - startTime;
      
      // Log error
      await this.logActivity(
        context.tenantId,
        context.serverId,
        'error',
        `Tool execution failed: ${error.message}`,
        { tool, error: error.message }
      );
      
      // Update error stats
      await this.updateServerStats(context.tenantId, context.serverId, {
        errors: 1,
        latency
      });

      return {
        success: false,
        error: error.message,
        latency
      };
    }
  }

  private async executeSandboxed(
    serverId: string,
    tool: string,
    params: any,
    config: MCPServerConfig
  ): Promise<any> {
    // This would integrate with actual MCP server implementations
    // For now, we'll simulate based on server type
    
    switch (serverId) {
      case 'brave-search':
        return this.executeBraveSearch(tool, params, config);
      case 'filesystem':
        return this.executeFilesystem(tool, params, config);
      case 'github':
        return this.executeGitHub(tool, params, config);
      case 'postgres':
        return this.executePostgres(tool, params, config);
      default:
        throw new Error(`Unknown server: ${serverId}`);
    }
  }

  private async executeBraveSearch(tool: string, params: any, config: MCPServerConfig) {
    // Simulate Brave Search API calls
    if (!config.apiKey) throw new Error('Brave Search API key not configured');
    
    switch (tool) {
      case 'web_search':
        // Would make actual API call to Brave Search
        return {
          results: [
            { title: 'Result 1', url: 'https://example.com', snippet: 'Sample result' }
          ]
        };
      case 'local_search':
        return { results: [] };
      default:
        throw new Error(`Unknown tool: ${tool}`);
    }
  }

  private async executeFilesystem(tool: string, params: any, config: MCPServerConfig) {
    // Filesystem operations would be sandboxed to allowed paths
    const allowedPaths = config.allowedPaths || [];
    
    switch (tool) {
      case 'read_file':
        // Validate path is allowed
        if (!this.isPathAllowed(params.path, allowedPaths)) {
          throw new Error('Access denied: Path not in allowed list');
        }
        return { content: 'File content here' };
      case 'list_directory':
        return { files: [] };
      default:
        throw new Error(`Unknown tool: ${tool}`);
    }
  }

  private async executeGitHub(tool: string, params: any, config: MCPServerConfig) {
    if (!config.token) throw new Error('GitHub token not configured');
    
    switch (tool) {
      case 'create_issue':
        return { id: 'issue-123', url: 'https://github.com/...' };
      case 'search_code':
        return { results: [] };
      default:
        throw new Error(`Unknown tool: ${tool}`);
    }
  }

  private async executePostgres(tool: string, params: any, config: MCPServerConfig) {
    if (!config.connectionString) throw new Error('Database connection not configured');
    
    // Would execute against sandboxed database
    switch (tool) {
      case 'query':
        return { rows: [], rowCount: 0 };
      default:
        throw new Error(`Unknown tool: ${tool}`);
    }
  }

  private sanitizeParameters(params: any): any {
    // Remove any potentially dangerous content
    if (typeof params === 'string') {
      // Remove SQL injection attempts
      return params.replace(/[;'"\-\-]/g, '');
    }
    if (typeof params === 'object' && params !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(params)) {
        sanitized[key] = this.sanitizeParameters(value);
      }
      return sanitized;
    }
    return params;
  }

  private isPathAllowed(path: string, allowedPaths: string[]): boolean {
    return allowedPaths.some(allowed => path.startsWith(allowed));
  }

  // Stats & Monitoring
  async updateServerStats(
    tenantId: string,
    serverId: string,
    updates: Partial<MCPServerStats>
  ) {
    const server = await this.getServer(tenantId, serverId);
    const currentStats = server.stats as MCPServerStats;
    
    const newStats = {
      calls: currentStats.calls + (updates.calls || 0),
      errors: currentStats.errors + (updates.errors || 0),
      latency: updates.latency !== undefined 
        ? Math.round((currentStats.latency + updates.latency) / 2)
        : currentStats.latency
    };

    await this.getSupabase()
      .from('mcp_servers')
      .update({ 
        stats: newStats,
        last_heartbeat: new Date().toISOString()
      })
      .eq('tenant_id', tenantId)
      .eq('server_id', serverId);
  }

  async getServerLogs(
    tenantId: string,
    serverId: string,
    limit = 100
  ): Promise<MCPServerLog[]> {
    const { data, error } = await this.getSupabase()
      .from('mcp_server_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('server_id', serverId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to get server logs: ${error.message}`);
    return data || [];
  }

  async logActivity(
    tenantId: string,
    serverId: string,
    level: 'debug' | 'info' | 'warning' | 'error' | 'critical',
    message: string,
    metadata?: any
  ) {
    await this.getSupabase()
      .from('mcp_server_logs')
      .insert({
        tenant_id: tenantId,
        server_id: serverId,
        level,
        message,
        metadata
      });
  }

  // Marketplace
  async getMarketplaceServers(): Promise<MCPServerMarketplaceItem[]> {
    // This would connect to a central marketplace registry
    // For now, return static list
    return [
      {
        id: 'brave-search',
        name: 'Brave Search',
        description: 'Web search capabilities with Brave Search API',
        author: 'Brave',
        version: '1.0.0',
        category: 'search',
        rating: 4.8,
        downloads: 1234,
        verified: true,
        tools: ['web_search', 'local_search'],
        requiredPermissions: ['network']
      },
      {
        id: 'filesystem',
        name: 'Filesystem',
        description: 'Read, write, and manage files on the local filesystem',
        author: 'Anthropic',
        version: '2.1.0',
        category: 'core',
        rating: 4.9,
        downloads: 5678,
        verified: true,
        tools: ['read_file', 'write_file', 'list_directory', 'search_files'],
        requiredPermissions: ['filesystem']
      },
      {
        id: 'github',
        name: 'GitHub',
        description: 'Interact with GitHub repositories, issues, and pull requests',
        author: 'GitHub',
        version: '1.5.0',
        category: 'development',
        rating: 4.7,
        downloads: 892,
        verified: true,
        tools: ['create_issue', 'create_pr', 'search_code', 'get_file_contents'],
        requiredPermissions: ['network']
      },
      {
        id: 'puppeteer',
        name: 'Puppeteer',
        description: 'Browser automation and web scraping',
        author: 'Google',
        version: '3.0.0',
        category: 'automation',
        rating: 4.5,
        downloads: 456,
        verified: true,
        tools: ['navigate', 'screenshot', 'click', 'fill', 'evaluate'],
        requiredPermissions: ['browser', 'network']
      },
      {
        id: 'postgres',
        name: 'PostgreSQL',
        description: 'Query and manage PostgreSQL databases',
        author: 'PostgreSQL',
        version: '1.2.0',
        category: 'database',
        rating: 4.6,
        downloads: 3421,
        verified: true,
        tools: ['query', 'insert', 'update', 'delete'],
        requiredPermissions: ['database']
      },
      {
        id: 'openai',
        name: 'OpenAI',
        description: 'Advanced AI models for content generation and analysis',
        author: 'OpenAI',
        version: '1.0.0',
        category: 'ai',
        rating: 4.9,
        downloads: 9876,
        verified: true,
        tools: ['chat_completion', 'embeddings', 'image_generation'],
        requiredPermissions: ['network']
      }
    ];
  }

  async searchMarketplace(query: string, category?: string) {
    const servers = await this.getMarketplaceServers();
    
    return servers.filter(server => {
      const matchesQuery = !query || 
        server.name.toLowerCase().includes(query.toLowerCase()) ||
        server.description.toLowerCase().includes(query.toLowerCase());
      
      const matchesCategory = !category || server.category === category;
      
      return matchesQuery && matchesCategory;
    });
  }

  // Custom Subagent Development
  async createCustomServer(
    tenantId: string,
    config: {
      name: string;
      description: string;
      tools: string[];
      configSchema?: any;
      endpoint?: string;
    }
  ) {
    const customServerId = `custom-${tenantId}-${Date.now()}`;
    
    const server: MCPServerInsert = {
      tenant_id: tenantId,
      server_id: customServerId,
      name: config.name,
      description: config.description,
      author: 'Custom',
      version: '1.0.0',
      category: 'custom',
      tools: config.tools,
      config: {
        endpoint: config.endpoint,
        schema: config.configSchema
      },
      installed: true,
      status: 'inactive'
    };

    const { data, error } = await this.getSupabase()
      .from('mcp_servers')
      .insert(server)
      .select()
      .single();

    if (error) throw new Error(`Failed to create custom server: ${error.message}`);
    return data;
  }

  // Health Monitoring
  async checkServerHealth(tenantId: string, serverId: string): Promise<boolean> {
    try {
      const server = await this.getServer(tenantId, serverId);
      
      if (server.status !== 'active') return false;
      
      // Check if heartbeat is recent (within last 5 minutes)
      if (server.last_heartbeat) {
        const lastHeartbeat = new Date(server.last_heartbeat);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        if (lastHeartbeat < fiveMinutesAgo) {
          await this.getSupabase()
            .from('mcp_servers')
            .update({ status: 'error' })
            .eq('tenant_id', tenantId)
            .eq('server_id', serverId);
          
          await this.logActivity(
            tenantId,
            serverId,
            'error',
            'Server health check failed - no recent heartbeat'
          );
          
          return false;
        }
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  async sendHeartbeat(tenantId: string, serverId: string) {
    await this.getSupabase()
      .from('mcp_servers')
      .update({ last_heartbeat: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('server_id', serverId);
  }
}

export const mcpServerService = new MCPServerService();
