import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mcpServerService } from '@/lib/services/mcp-servers';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
      upsert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { 
              id: '1', 
              server_id: 'brave-search', 
              status: 'installing',
              installed: false,
            },
            error: null,
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: null,
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: null,
        })),
      })),
      insert: vi.fn(() => ({
        data: null,
        error: null,
      })),
    })),
  })),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({})),
}));

describe('MCPServerService', () => {
  const mockTenantId = 'tenant-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getServers', () => {
    it('should fetch servers for a tenant', async () => {
      const servers = await mcpServerService.getServers(mockTenantId);
      expect(servers).toEqual([]);
    });
  });

  describe('installServer', () => {
    it('should install a server', async () => {
      const result = await mcpServerService.installServer(
        mockTenantId,
        'brave-search'
      );

      expect(result).toEqual({
        id: '1',
        server_id: 'brave-search',
        status: 'installing',
        installed: false,
      });
    });

    it('should install server with custom config', async () => {
      const config = { api_key: 'test-key' };
      
      const result = await mcpServerService.installServer(
        mockTenantId,
        'brave-search',
        config
      );

      expect(result.server_id).toBe('brave-search');
    });
  });

  describe('uninstallServer', () => {
    it('should uninstall a server', async () => {
      await expect(
        mcpServerService.uninstallServer(mockTenantId, 'brave-search')
      ).resolves.not.toThrow();
    });
  });

  describe('startServer', () => {
    it('should start a server', async () => {
      await expect(
        mcpServerService.startServer(mockTenantId, 'brave-search')
      ).resolves.not.toThrow();
    });
  });

  describe('stopServer', () => {
    it('should stop a server', async () => {
      await expect(
        mcpServerService.stopServer(mockTenantId, 'brave-search')
      ).resolves.not.toThrow();
    });
  });

  describe('updateServerConfig', () => {
    it('should update server configuration', async () => {
      const config = { timeout: 30000 };
      
      await expect(
        mcpServerService.updateServerConfig(mockTenantId, 'brave-search', config)
      ).resolves.not.toThrow();
    });
  });

  describe('executeTool', () => {
    it('should execute a tool successfully', async () => {
      // Mock server data for execution
      const mockServer = {
        id: '1',
        server_id: 'brave-search',
        status: 'active',
        tools: ['brave_web_search'],
        stats: { calls: 0, errors: 0, latency: 0 },
      };

      // Mock the server fetch
      vi.spyOn(mcpServerService as any, 'getServers').mockResolvedValue([mockServer]);

      const execution = {
        serverId: 'brave-search',
        tool: 'brave_web_search',
        input: { query: 'test' },
      };

      const result = await mcpServerService.executeTool(mockTenantId, execution);
      expect(result).toBeDefined();
    });

    it('should throw error for inactive server', async () => {
      const mockServer = {
        id: '1',
        server_id: 'brave-search',
        status: 'inactive',
        tools: ['brave_web_search'],
      };

      vi.spyOn(mcpServerService as any, 'getServers').mockResolvedValue([mockServer]);

      const execution = {
        serverId: 'brave-search',
        tool: 'brave_web_search',
        input: { query: 'test' },
      };

      await expect(
        mcpServerService.executeTool(mockTenantId, execution)
      ).rejects.toThrow('Server is not active');
    });

    it('should throw error for unavailable tool', async () => {
      const mockServer = {
        id: '1',
        server_id: 'brave-search',
        status: 'active',
        tools: ['other_tool'],
      };

      vi.spyOn(mcpServerService as any, 'getServers').mockResolvedValue([mockServer]);

      const execution = {
        serverId: 'brave-search',
        tool: 'unavailable_tool',
        input: { query: 'test' },
      };

      await expect(
        mcpServerService.executeTool(mockTenantId, execution)
      ).rejects.toThrow('Tool unavailable_tool not available');
    });
  });

  describe('getServerLogs', () => {
    it('should fetch server logs', async () => {
      const logs = await mcpServerService.getServerLogs(
        mockTenantId,
        'brave-search'
      );
      expect(logs).toEqual([]);
    });

    it('should limit log results', async () => {
      const logs = await mcpServerService.getServerLogs(
        mockTenantId,
        'brave-search',
        50
      );
      expect(logs).toEqual([]);
    });
  });

  describe('logServerEvent', () => {
    it('should log a server event', async () => {
      await expect(
        mcpServerService.logServerEvent(
          mockTenantId,
          'brave-search',
          'info',
          'Test message',
          { test: 'data' }
        )
      ).resolves.not.toThrow();
    });
  });
});