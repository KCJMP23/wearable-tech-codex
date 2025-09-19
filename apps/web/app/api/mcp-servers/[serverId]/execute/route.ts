import { NextRequest, NextResponse } from 'next/server';
import { mcpServerService } from '@affiliate-factory/sdk';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params;
    const body = await request.json();
    const { tenantId, tool, parameters } = body;

    if (!tenantId || !tool) {
      return NextResponse.json(
        { error: 'tenantId and tool are required' },
        { status: 400 }
      );
    }

    // Get server details for context
    const server = await mcpServerService.getServer(tenantId, serverId);
    
    if (!server || server.status !== 'active') {
      return NextResponse.json(
        { error: 'Server not found or not active' },
        { status: 400 }
      );
    }

    // Execute the tool
    const result = await mcpServerService.executeServerTool(
      {
        tenantId,
        serverId,
        tools: server.tools || [],
        config: server.config || {}
      },
      tool,
      parameters
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error executing tool:', error);
    return NextResponse.json(
      { error: 'Failed to execute tool' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params;
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const action = searchParams.get('action');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    if (action === 'logs') {
      const limit = parseInt(searchParams.get('limit') || '100');
      const logs = await mcpServerService.getServerLogs(tenantId, serverId, limit);
      return NextResponse.json(logs);
    }

    if (action === 'health') {
      const healthy = await mcpServerService.checkServerHealth(tenantId, serverId);
      return NextResponse.json({ healthy });
    }

    // Get server details
    const server = await mcpServerService.getServer(tenantId, serverId);
    return NextResponse.json(server);
  } catch (error) {
    console.error('Error fetching server details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch server details' },
      { status: 500 }
    );
  }
}