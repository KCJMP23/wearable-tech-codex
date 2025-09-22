import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextResponse } from 'next/server';

const limiterCheck = vi.fn().mockResolvedValue(undefined);
const rateLimitMock = vi.fn(() => ({ check: limiterCheck }));

vi.mock('@/lib/rate-limit', () => ({ rateLimit: rateLimitMock }));

const requireTenantContext = vi.fn();
vi.mock('@/lib/api/tenant-context', () => ({ requireTenantContext }));

const campaignServiceInstance = {
  createCampaign: vi.fn(),
  updateCampaign: vi.fn(),
  sendCampaign: vi.fn()
};

const emailServiceInstance = {
  sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'mock-id' })
};

const CampaignServiceMock = vi.fn(() => campaignServiceInstance);
const EmailServiceMock = vi.fn(() => emailServiceInstance);

vi.mock('@affiliate-factory/email', () => ({
  CampaignService: CampaignServiceMock,
  EmailService: EmailServiceMock,
  SegmentService: vi.fn(),
  EmailAnalyticsService: vi.fn()
}));

const REQUIRED_ENV: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  SUPABASE_JWT_SECRET: 'abcdefghijklmnopqrstuvwxyz123456',
  OPENAI_API_KEY: 'openai-key',
  ANTHROPIC_API_KEY: 'anthropic-key',
  RESEND_API_KEY: 'resend-key',
  AMAZON_PA_API_ACCESS_KEY: 'amz-access',
  AMAZON_PA_API_SECRET_KEY: 'amz-secret',
  REDDIT_APP_ID: 'reddit-app',
  REDDIT_APP_SECRET: 'reddit-secret',
  MAKE_BLOG_WEBHOOK_SECRET: 'blog-secret',
  MAKE_PRODUCT_WEBHOOK_SECRET: 'product-secret',
  MAKE_IMAGE_WEBHOOK_SECRET: 'image-secret',
  INTERNAL_API_SECRET: 'internal-secret'
};

Object.entries(REQUIRED_ENV).forEach(([key, value]) => {
  if (!process.env[key]) {
    process.env[key] = value;
  }
});

function createSupabaseStub(role: string) {
  const membershipBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { role }, error: null })
  };

  return {
    from: vi.fn((table: string) => {
      if (table === 'tenant_members') {
        return membershipBuilder;
      }

      const defaultBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockResolvedValue({ data: null, error: null })
      };

      return defaultBuilder;
    }),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'user-123' } } }, error: null })
    }
  };
}

function createRequest(url: string, init?: RequestInit) {
  return new Request(url, init);
}

describe('Email API tenant isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    limiterCheck.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('returns 404 when tenant context denies campaign access', async () => {
    requireTenantContext.mockResolvedValue({
      context: undefined,
      error: NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    });

    const { GET } = await import('../campaigns/route');
    const response = await GET(createRequest('https://example.com/api/email/campaigns'));

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: 'Tenant not found' });
  });

  it('rejects campaign send when membership lacks required role', async () => {
    const supabase = createSupabaseStub('viewer');

    requireTenantContext.mockResolvedValue({
      context: {
        supabase,
        tenantId: 'tenant-123',
        tenantSlug: 'tenant-abc',
        session: { access_token: 'token' },
        user: { id: 'user-123' },
        applyCookies: (response: NextResponse) => response
      }
    });

    const { POST } = await import('../campaigns/[id]/send/route');

    const response = await POST(
      createRequest('https://example.com/api/email/campaigns/c123/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({})
      }),
      { params: { id: 'c123' } }
    );

    expect(response.status).toBe(403);
    const payload = await response.json();
    expect(payload.error).toBe('Forbidden');
    expect(supabase.from).toHaveBeenCalledWith('tenant_members');
    expect(campaignServiceInstance.sendCampaign).not.toHaveBeenCalled();
  });
});
