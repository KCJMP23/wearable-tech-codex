'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { MCPServersView } from './MCPServersView';

// Mock MCP servers data - in production, fetch from database
const getMCPServers = () => [
  {
    id: 'brave-search',
    name: 'Brave Search',
    description: 'Web search capabilities with Brave Search API',
    icon: '🔍',
    status: 'active',
    version: '1.0.0',
    author: 'Brave',
    category: 'search',
    tools: ['web_search', 'local_search'],
    resources: [],
    installed: true,
    config: {
      apiKey: 'brv_***_3f4d'
    },
    stats: {
      calls: 1234,
      errors: 2,
      latency: 230
    }
  },
  {
    id: 'filesystem',
    name: 'Filesystem',
    description: 'Read, write, and manage files on the local filesystem',
    icon: '📁',
    status: 'active',
    version: '2.1.0',
    author: 'Anthropic',
    category: 'core',
    tools: ['read_file', 'write_file', 'list_directory', 'search_files'],
    resources: ['file:///**/*'],
    installed: true,
    config: {
      allowedPaths: ['/projects', '/data']
    },
    stats: {
      calls: 5678,
      errors: 0,
      latency: 45
    }
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Interact with GitHub repositories, issues, and pull requests',
    icon: '🐙',
    status: 'active',
    version: '1.5.0',
    author: 'GitHub',
    category: 'development',
    tools: ['create_issue', 'create_pr', 'search_code', 'get_file_contents'],
    resources: [],
    installed: true,
    config: {
      token: 'ghp_***_8a9b'
    },
    stats: {
      calls: 892,
      errors: 5,
      latency: 340
    }
  },
  {
    id: 'puppeteer',
    name: 'Puppeteer',
    description: 'Browser automation and web scraping',
    icon: '🎭',
    status: 'inactive',
    version: '3.0.0',
    author: 'Google',
    category: 'automation',
    tools: ['navigate', 'screenshot', 'click', 'fill', 'evaluate'],
    resources: [],
    installed: true,
    config: {
      headless: true
    },
    stats: {
      calls: 0,
      errors: 0,
      latency: 0
    }
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    description: 'Query and manage PostgreSQL databases',
    icon: '🐘',
    status: 'active',
    version: '1.2.0',
    author: 'PostgreSQL',
    category: 'database',
    tools: ['query', 'insert', 'update', 'delete'],
    resources: ['postgres://**'],
    installed: true,
    config: {
      connectionString: 'postgres://***'
    },
    stats: {
      calls: 3421,
      errors: 12,
      latency: 89
    }
  },
  {
    id: 'memory',
    name: 'Memory',
    description: 'Persistent memory and knowledge graph for context retention',
    icon: '🧠',
    status: 'available',
    version: '1.0.0',
    author: 'Anthropic',
    category: 'ai',
    tools: ['create_entities', 'search_nodes', 'read_graph'],
    resources: [],
    installed: false,
    config: {},
    stats: {
      calls: 0,
      errors: 0,
      latency: 0
    }
  },
  {
    id: 'stripe',
    name: 'Stripe Payments',
    description: 'Process payments and manage subscriptions',
    icon: '💳',
    status: 'available',
    version: '2.0.0',
    author: 'Stripe',
    category: 'payments',
    tools: ['create_payment', 'create_subscription', 'list_customers'],
    resources: [],
    installed: false,
    config: {},
    stats: {
      calls: 0,
      errors: 0,
      latency: 0
    }
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Advanced AI models for content generation and analysis',
    icon: '🤖',
    status: 'available',
    version: '1.0.0',
    author: 'OpenAI',
    category: 'ai',
    tools: ['chat_completion', 'embeddings', 'image_generation'],
    resources: [],
    installed: false,
    config: {},
    stats: {
      calls: 0,
      errors: 0,
      latency: 0
    }
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send notifications and manage Slack workspaces',
    icon: '💬',
    status: 'available',
    version: '1.1.0',
    author: 'Slack',
    category: 'communication',
    tools: ['send_message', 'create_channel', 'upload_file'],
    resources: [],
    installed: false,
    config: {},
    stats: {
      calls: 0,
      errors: 0,
      latency: 0
    }
  }
];

export default function MCPServersPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;
  const [tenantId, setTenantId] = useState<string>('');
  const [servers] = useState(getMCPServers());

  useEffect(() => {
    // In production, fetch tenant details
    // For now, use a mock tenant ID
    setTenantId('mock-tenant-id');
  }, []);

  if (!tenantId) {
    return <div>Loading...</div>;
  }

  return <MCPServersView 
    tenantSlug={tenantSlug}
    tenantId={tenantId}
    servers={servers}
  />;
}