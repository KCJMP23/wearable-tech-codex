import { createServiceClient } from '@/lib/supabase';

export interface MCPServer {
  id: string;
  tenant_id: string;
  server_id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'error' | 'installing';
  version?: string;
  author?: string;
  category?: string;
  installed: boolean;
  config?: Record<string, any>;
  tools?: string[];
  resources?: string[];
  stats?: {
    calls: number;
    errors: number;
    latency: number;
  };
  last_heartbeat?: Date;
}

export interface MCPServerLog {
  id: string;
  tenant_id: string;
  server_id: string;
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  message: string;
  metadata?: Record<string, any>;
  created_at: Date;
}

export interface MCPToolExecution {
  serverId: string;
  tool: string;
  input: any;
  output?: any;
  error?: string;
  duration?: number;
}

class MCPServerService {
  async getServers(tenantId: string): Promise<MCPServer[]> {
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('mcp_servers')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async installServer(
    tenantId: string,
    serverId: string,
    config?: Record<string, any>
  ): Promise<MCPServer> {
    const supabase = createServiceClient();
    
    // Get server manifest from registry
    const manifest = await this.getServerManifest(serverId);
    
    const { data, error } = await supabase
      .from('mcp_servers')
      .upsert({
        tenant_id: tenantId,
        server_id: serverId,
        name: manifest.name,
        description: manifest.description,
        version: manifest.version,
        author: manifest.author,
        category: manifest.category,
        status: 'installing',
        installed: false,
        config: config || {},
        tools: manifest.tools,
        resources: manifest.resources,
        stats: { calls: 0, errors: 0, latency: 0 },
      })
      .select()
      .single();

    if (error) throw error;
    
    // Trigger async installation
    this.performServerInstallation(tenantId, serverId);
    
    return data;
  }

  async uninstallServer(tenantId: string, serverId: string): Promise<void> {
    const supabase = createServiceClient();
    
    // Stop server if running
    await this.stopServer(tenantId, serverId);
    
    // Remove from database
    const { error } = await supabase
      .from('mcp_servers')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('server_id', serverId);

    if (error) throw error;
  }

  async startServer(tenantId: string, serverId: string): Promise<void> {
    const supabase = createServiceClient();
    
    // Update status to active
    const { error } = await supabase
      .from('mcp_servers')
      .update({ 
        status: 'active',
        last_heartbeat: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('server_id', serverId);

    if (error) throw error;
    
    // Start heartbeat monitoring
    this.startHeartbeat(tenantId, serverId);
  }

  async stopServer(tenantId: string, serverId: string): Promise<void> {
    const supabase = createServiceClient();
    
    const { error } = await supabase
      .from('mcp_servers')
      .update({ status: 'inactive' })
      .eq('tenant_id', tenantId)
      .eq('server_id', serverId);

    if (error) throw error;
  }

  async updateServerConfig(
    tenantId: string,
    serverId: string,
    config: Record<string, any>
  ): Promise<void> {
    const supabase = createServiceClient();
    
    const { error } = await supabase
      .from('mcp_servers')
      .update({ config })
      .eq('tenant_id', tenantId)
      .eq('server_id', serverId);

    if (error) throw error;
    
    // Restart server if active
    const { data: server } = await supabase
      .from('mcp_servers')
      .select('status')
      .eq('tenant_id', tenantId)
      .eq('server_id', serverId)
      .single();
    
    if (server?.status === 'active') {
      await this.stopServer(tenantId, serverId);
      await this.startServer(tenantId, serverId);
    }
  }

  async executeTool(
    tenantId: string,
    execution: MCPToolExecution
  ): Promise<any> {
    const supabase = createServiceClient();
    
    // Check server is active
    const { data: server } = await supabase
      .from('mcp_servers')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('server_id', execution.serverId)
      .single();

    if (!server) throw new Error('Server not found');
    if (server.status !== 'active') throw new Error('Server is not active');
    if (!server.tools?.includes(execution.tool)) {
      throw new Error(`Tool ${execution.tool} not available on server ${execution.serverId}`);
    }

    const startTime = Date.now();
    
    try {
      // Execute tool based on server type
      const result = await this.executeServerTool(server, execution);
      
      // Update stats
      await supabase
        .from('mcp_servers')
        .update({
          stats: {
            ...server.stats,
            calls: (server.stats?.calls || 0) + 1,
            latency: Date.now() - startTime,
          },
        })
        .eq('tenant_id', tenantId)
        .eq('server_id', execution.serverId);
      
      // Log execution
      await this.logServerEvent(tenantId, execution.serverId, 'info', 
        `Executed tool ${execution.tool}`, { 
          tool: execution.tool,
          duration: Date.now() - startTime,
        }
      );
      
      return result;
    } catch (error) {
      // Update error stats
      await supabase
        .from('mcp_servers')
        .update({
          stats: {
            ...server.stats,
            errors: (server.stats?.errors || 0) + 1,
          },
        })
        .eq('tenant_id', tenantId)
        .eq('server_id', execution.serverId);
      
      // Log error
      await this.logServerEvent(tenantId, execution.serverId, 'error',
        `Tool execution failed: ${error.message}`, {
          tool: execution.tool,
          error: error.message,
        }
      );
      
      throw error;
    }
  }

  async getServerLogs(
    tenantId: string,
    serverId: string,
    limit = 100
  ): Promise<MCPServerLog[]> {
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('mcp_server_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('server_id', serverId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async logServerEvent(
    tenantId: string,
    serverId: string,
    level: MCPServerLog['level'],
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const supabase = createServiceClient();
    
    const { error } = await supabase
      .from('mcp_server_logs')
      .insert({
        tenant_id: tenantId,
        server_id: serverId,
        level,
        message,
        metadata,
      });

    if (error) console.error('Failed to log server event:', error);
  }

  // Private methods
  private async getServerManifest(serverId: string): Promise<any> {
    // Mock server manifests - in production, fetch from registry
    const manifests: Record<string, any> = {
      'brave-search': {
        name: 'Brave Search',
        description: 'Web search capabilities using Brave Search API',
        version: '1.0.0',
        author: 'Brave',
        category: 'search',
        tools: ['brave_web_search', 'brave_local_search'],
        resources: ['search_history'],
      },
      'filesystem': {
        name: 'Filesystem',
        description: 'Read and write files with secure sandboxing',
        version: '1.0.0',
        author: 'System',
        category: 'core',
        tools: ['read_file', 'write_file', 'list_directory', 'move_file'],
        resources: ['file_tree'],
      },
      'github': {
        name: 'GitHub',
        description: 'GitHub repository management and code search',
        version: '1.0.0',
        author: 'GitHub',
        category: 'development',
        tools: ['search_code', 'create_issue', 'create_pr', 'get_file_contents'],
        resources: ['repositories', 'issues', 'pull_requests'],
      },
      'postgres': {
        name: 'PostgreSQL',
        description: 'Direct PostgreSQL database access',
        version: '1.0.0',
        author: 'PostgreSQL',
        category: 'database',
        tools: ['query', 'insert', 'update', 'delete'],
        resources: ['tables', 'schemas'],
      },
      'memory': {
        name: 'Memory',
        description: 'Knowledge graph and persistent memory',
        version: '1.0.0',
        author: 'System',
        category: 'core',
        tools: ['create_entities', 'create_relations', 'search_nodes'],
        resources: ['knowledge_graph'],
      },
      'puppeteer': {
        name: 'Puppeteer',
        description: 'Browser automation and web scraping',
        version: '1.0.0',
        author: 'Google',
        category: 'automation',
        tools: ['navigate', 'screenshot', 'click', 'fill', 'evaluate'],
        resources: ['browser_session'],
      },
      'claude': {
        name: 'Claude',
        description: 'Claude AI assistant integration',
        version: '1.0.0',
        author: 'Anthropic',
        category: 'ai',
        tools: ['chat', 'analyze', 'generate', 'summarize'],
        resources: ['conversation_history'],
      },
      'stripe': {
        name: 'Stripe',
        description: 'Payment processing and subscription management',
        version: '1.0.0',
        author: 'Stripe',
        category: 'payments',
        tools: ['create_payment', 'create_subscription', 'get_customer'],
        resources: ['customers', 'payments', 'subscriptions'],
      },
      'slack': {
        name: 'Slack',
        description: 'Team communication and notifications',
        version: '1.0.0',
        author: 'Slack',
        category: 'communication',
        tools: ['send_message', 'create_channel', 'upload_file'],
        resources: ['channels', 'users', 'messages'],
      },
    };
    
    return manifests[serverId] || {
      name: serverId,
      description: 'Unknown server',
      version: '1.0.0',
      tools: [],
      resources: [],
    };
  }

  private async performServerInstallation(
    tenantId: string,
    serverId: string
  ): Promise<void> {
    const supabase = createServiceClient();
    
    try {
      // Simulate installation process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mark as installed
      await supabase
        .from('mcp_servers')
        .update({ 
          installed: true,
          status: 'inactive',
        })
        .eq('tenant_id', tenantId)
        .eq('server_id', serverId);
      
      await this.logServerEvent(tenantId, serverId, 'info', 
        'Server installed successfully'
      );
    } catch (error) {
      await supabase
        .from('mcp_servers')
        .update({ status: 'error' })
        .eq('tenant_id', tenantId)
        .eq('server_id', serverId);
      
      await this.logServerEvent(tenantId, serverId, 'error',
        `Installation failed: ${error.message}`
      );
    }
  }

  private async executeServerTool(
    server: MCPServer,
    execution: MCPToolExecution
  ): Promise<any> {
    // Mock tool execution - in production, would call actual server
    switch (server.server_id) {
      case 'brave-search':
        return this.executeBraveSearchTool(execution);
      case 'filesystem':
        return this.executeFilesystemTool(execution);
      case 'github':
        return this.executeGitHubTool(execution);
      case 'postgres':
        return this.executePostgresTool(execution);
      default:
        throw new Error(`Server ${server.server_id} not implemented`);
    }
  }

  private async executeBraveSearchTool(execution: MCPToolExecution): Promise<any> {
    if (execution.tool === 'brave_web_search') {
      // Mock search results
      return {
        results: [
          {
            title: 'Best Smartwatches 2024',
            url: 'https://example.com/smartwatches',
            snippet: 'Top-rated smartwatches for fitness and health tracking...',
          },
        ],
      };
    }
    throw new Error(`Tool ${execution.tool} not implemented`);
  }

  private async executeFilesystemTool(execution: MCPToolExecution): Promise<any> {
    if (execution.tool === 'read_file') {
      // Mock file read
      return {
        content: 'File content here...',
        path: execution.input.path,
      };
    }
    throw new Error(`Tool ${execution.tool} not implemented`);
  }

  private async executeGitHubTool(execution: MCPToolExecution): Promise<any> {
    if (execution.tool === 'search_code') {
      // Mock GitHub search
      return {
        results: [
          {
            repository: 'user/repo',
            path: 'src/file.ts',
            content: 'Code snippet...',
          },
        ],
      };
    }
    throw new Error(`Tool ${execution.tool} not implemented`);
  }

  private async executePostgresTool(execution: MCPToolExecution): Promise<any> {
    if (execution.tool === 'query') {
      // Mock database query
      return {
        rows: [],
        rowCount: 0,
      };
    }
    throw new Error(`Tool ${execution.tool} not implemented`);
  }

  private startHeartbeat(tenantId: string, serverId: string): void {
    // In production, would set up actual heartbeat monitoring
    setInterval(async () => {
      const supabase = createServiceClient();
      await supabase
        .from('mcp_servers')
        .update({ last_heartbeat: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('server_id', serverId)
        .eq('status', 'active');
    }, 30000); // Every 30 seconds
  }
}

export const mcpServerService = new MCPServerService();