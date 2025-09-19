import { NextRequest, NextResponse } from 'next/server';
import { mcpServerService } from '@affiliate-factory/sdk';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const action = searchParams.get('action');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    // Handle marketplace search
    if (action === 'marketplace') {
      const query = searchParams.get('query') || '';
      const category = searchParams.get('category') || undefined;
      const servers = await mcpServerService.searchMarketplace(query, category);
      return NextResponse.json(servers);
    }

    // Get installed servers for tenant
    const servers = await mcpServerService.listServers(tenantId);
    return NextResponse.json(servers);
  } catch (error) {
    console.error('Error fetching MCP servers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch servers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, tenantId, ...params } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'install': {
        const { marketplaceItem, config } = params;
        if (!marketplaceItem) {
          return NextResponse.json(
            { error: 'marketplaceItem is required' },
            { status: 400 }
          );
        }
        const server = await mcpServerService.installServer(
          tenantId,
          marketplaceItem,
          config
        );
        return NextResponse.json(server);
      }

      case 'toggle': {
        const { serverId } = params;
        if (!serverId) {
          return NextResponse.json(
            { error: 'serverId is required' },
            { status: 400 }
          );
        }
        const server = await mcpServerService.toggleServer(tenantId, serverId);
        return NextResponse.json(server);
      }

      case 'updateConfig': {
        const { serverId, config } = params;
        if (!serverId || !config) {
          return NextResponse.json(
            { error: 'serverId and config are required' },
            { status: 400 }
          );
        }
        const server = await mcpServerService.updateServerConfig(
          tenantId,
          serverId,
          config
        );
        return NextResponse.json(server);
      }

      case 'createCustom': {
        const { name, description, tools, configSchema, endpoint } = params;
        if (!name || !description || !tools) {
          return NextResponse.json(
            { error: 'name, description, and tools are required' },
            { status: 400 }
          );
        }
        const server = await mcpServerService.createCustomServer(
          tenantId,
          { name, description, tools, configSchema, endpoint }
        );
        return NextResponse.json(server);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing MCP server request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const serverId = searchParams.get('serverId');

    if (!tenantId || !serverId) {
      return NextResponse.json(
        { error: 'tenantId and serverId are required' },
        { status: 400 }
      );
    }

    await mcpServerService.uninstallServer(tenantId, serverId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error uninstalling MCP server:', error);
    return NextResponse.json(
      { error: 'Failed to uninstall server' },
      { status: 500 }
    );
  }
}