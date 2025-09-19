import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import crypto from 'crypto';

// Security configuration
const SECURITY_CONFIG = {
  // Rate limiting configuration
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: {
      default: 100,
      api: 50,
      auth: 5,
      write: 20,
    },
  },
  // CSRF configuration
  csrf: {
    tokenLength: 32,
    cookieName: 'csrf-token',
    headerName: 'x-csrf-token',
  },
  // Security headers
  headers: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'X-DNS-Prefetch-Control': 'off',
    'X-Download-Options': 'noopen',
    'X-Permitted-Cross-Domain-Policies': 'none',
  },
  // Content Security Policy
  csp: {
    development: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-eval'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:', 'blob:'],
      'font-src': ["'self'", 'data:'],
      'connect-src': ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co', 'http://localhost:*'],
      'frame-src': ["'self'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'block-all-mixed-content': [],
      'upgrade-insecure-requests': [],
    },
    production: {
      'default-src': ["'self'"],
      'script-src': ["'self'", 'https://cdn.jsdelivr.net'],
      'style-src': ["'self'", "'unsafe-inline'"], // Allow inline styles for Tailwind
      'img-src': ["'self'", 'data:', 'https:'],
      'font-src': ["'self'", 'data:'],
      'connect-src': ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co'],
      'frame-src': ["'self'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'block-all-mixed-content': [],
      'upgrade-insecure-requests': [],
    },
  },
};

// Rate limiter store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// CSRF token store (in production, use Redis or database)
const csrfTokenStore = new Map<string, { token: string; expires: number }>();

/**
 * Rate limiting middleware
 * Tracks requests per IP/user and enforces limits
 */
export function rateLimit(
  request: NextRequest,
  type: 'default' | 'api' | 'auth' | 'write' = 'default'
): { allowed: boolean; retryAfter?: number } {
  const identifier = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const limit = SECURITY_CONFIG.rateLimit.maxRequests[type];
  const windowMs = SECURITY_CONFIG.rateLimit.windowMs;

  const key = `${identifier}:${type}`;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true };
  }

  if (record.count >= limit) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  record.count++;
  return { allowed: true };
}

/**
 * CSRF token generation and validation
 */
export function generateCSRFToken(sessionId: string): string {
  const token = crypto.randomBytes(SECURITY_CONFIG.csrf.tokenLength).toString('hex');
  const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  csrfTokenStore.set(sessionId, { token, expires });
  return token;
}

export function validateCSRFToken(sessionId: string, token: string): boolean {
  const stored = csrfTokenStore.get(sessionId);
  
  if (!stored) return false;
  if (Date.now() > stored.expires) {
    csrfTokenStore.delete(sessionId);
    return false;
  }
  
  return crypto.timingSafeEqual(
    Buffer.from(stored.token),
    Buffer.from(token)
  );
}

/**
 * Input validation schemas
 */
export const validationSchemas = {
  // Tenant validation
  tenantSlug: z.string().regex(/^[a-z0-9-]{2,50}$/, 'Invalid tenant slug format'),
  tenantId: z.string().uuid('Invalid tenant ID'),

  // Common field validations
  email: z.string().email('Invalid email format').max(255),
  url: z.string().url('Invalid URL format').max(2048),
  
  // Pagination
  pagination: z.object({
    page: z.number().int().min(1).max(1000).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  }),

  // Search query
  searchQuery: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\s\-_]+$/, 'Invalid search query'),

  // Product data
  asin: z.string().regex(/^[A-Z0-9]{10}$/, 'Invalid ASIN format'),
  
  // API request body size limit (1MB)
  maxBodySize: 1024 * 1024,
};

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Tenant isolation validation
 * Ensures queries are properly scoped to tenant
 */
export async function validateTenantAccess(
  request: NextRequest,
  tenantId: string
): Promise<{ allowed: boolean; tenant?: any }> {
  // Get authenticated user
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Check if tenant exists and is active
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .eq('status', 'active')
    .single();

  if (error || !tenant) {
    return { allowed: false };
  }

  // For admin routes, check user permissions
  if (request.nextUrl.pathname.startsWith('/api/admin')) {
    if (!user) {
      return { allowed: false };
    }

    // Check if user has access to this tenant
    const { data: access } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .single();

    if (!access) {
      return { allowed: false };
    }
  }

  return { allowed: true, tenant };
}

/**
 * Build Content Security Policy header
 */
function buildCSP(env: 'development' | 'production'): string {
  const policy = SECURITY_CONFIG.csp[env];
  return Object.entries(policy)
    .map(([directive, values]) => {
      if (Array.isArray(values) && values.length === 0) {
        return directive;
      }
      return `${directive} ${Array.isArray(values) ? values.join(' ') : values}`;
    })
    .join('; ');
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(
  response: NextResponse,
  options: {
    nonce?: string;
    env?: 'development' | 'production';
  } = {}
): void {
  const { env = process.env.NODE_ENV as 'development' | 'production' } = options;

  // Apply standard security headers
  Object.entries(SECURITY_CONFIG.headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Apply CSP
  const csp = buildCSP(env);
  response.headers.set('Content-Security-Policy', csp);

  // Apply Strict-Transport-Security in production
  if (env === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
}

/**
 * Main security middleware
 */
export async function securityMiddleware(
  request: NextRequest
): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname;
  const method = request.method;

  // Determine request type for rate limiting
  let rateLimitType: 'default' | 'api' | 'auth' | 'write' = 'default';
  if (pathname.startsWith('/api')) {
    rateLimitType = 'api';
    if (pathname.includes('/auth') || pathname.includes('/login') || pathname.includes('/signup')) {
      rateLimitType = 'auth';
    } else if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      rateLimitType = 'write';
    }
  }

  // Apply rate limiting
  const rateLimitResult = rateLimit(request, rateLimitType);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter),
          'X-RateLimit-Limit': String(SECURITY_CONFIG.rateLimit.maxRequests[rateLimitType]),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  // CSRF protection for state-changing requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && pathname.startsWith('/api')) {
    const sessionId = request.cookies.get('session-id')?.value;
    const csrfToken = request.headers.get(SECURITY_CONFIG.csrf.headerName);

    if (!sessionId || !csrfToken || !validateCSRFToken(sessionId, csrfToken)) {
      // Skip CSRF for public endpoints that don't modify user data
      const publicEndpoints = ['/api/chat', '/api/search', '/api/products/search'];
      if (!publicEndpoints.includes(pathname)) {
        return NextResponse.json(
          { error: 'Invalid or missing CSRF token' },
          { status: 403 }
        );
      }
    }
  }

  // Validate Content-Type for API requests with body
  if (pathname.startsWith('/api') && ['POST', 'PUT', 'PATCH'].includes(method)) {
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      );
    }

    // Check body size
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > validationSchemas.maxBodySize) {
      return NextResponse.json(
        { error: 'Request body too large' },
        { status: 413 }
      );
    }
  }

  return null; // Continue to next middleware/route handler
}

/**
 * Utility to validate request body against schema
 */
export function validateRequestBody<T>(
  body: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(body);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * SQL injection prevention helper
 */
export function escapeSQLIdentifier(identifier: string): string {
  // Remove any characters that aren't alphanumeric or underscore
  return identifier.replace(/[^a-zA-Z0-9_]/g, '');
}

/**
 * Generate secure random tokens
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Time-constant string comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}