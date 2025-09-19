import { NextResponse, type NextRequest } from 'next/server';
import { createAuthMiddleware } from './lib/auth';
import {
  securityMiddleware,
  applySecurityHeaders,
  validateTenantAccess,
  generateCSRFToken,
} from './lib/security/middleware';

// List of reserved platform routes that should not be treated as tenant slugs
const RESERVED_ROUTES = [
  'admin',
  'api',
  'onboarding',
  'login',
  'signup',
  'auth',
  '_next',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
  'docs',
  'blog',
  'support',
  'about',
  'contact',
  'privacy',
  'terms',
  'pricing',
  'features',
  'examples',
  'roadmap'
];

/**
 * Enhanced middleware with comprehensive security features
 * 
 * Security features:
 * 1. Rate limiting per IP/user
 * 2. CSRF protection for state-changing operations
 * 3. Input validation and sanitization
 * 4. Tenant isolation validation
 * 5. Security headers (CSP, HSTS, etc.)
 * 6. Request body size limits
 * 7. Content-Type validation
 */
export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';
  const pathname = url.pathname;

  // Apply security middleware first
  const securityResponse = await securityMiddleware(request);
  if (securityResponse) {
    return securityResponse;
  }

  // Handle authentication for protected routes
  if (pathname.startsWith('/admin')) {
    const authResponse = await createAuthMiddleware(request);
    
    // Add security headers to auth response
    applySecurityHeaders(authResponse);
    
    // Generate CSRF token for authenticated sessions
    const sessionId = request.cookies.get('session-id')?.value;
    if (sessionId) {
      const csrfToken = generateCSRFToken(sessionId);
      authResponse.cookies.set('csrf-token', csrfToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });
    }
    
    return authResponse;
  }

  // Handle API routes with tenant isolation
  if (pathname.startsWith('/api')) {
    // Extract tenant context from request
    const tenantId = request.headers.get('x-tenant-id') || 
                    request.nextUrl.searchParams.get('tenantId');
    
    if (tenantId) {
      // Validate tenant access
      const { allowed, tenant } = await validateTenantAccess(request, tenantId);
      
      if (!allowed) {
        return NextResponse.json(
          { error: 'Access denied to tenant resources' },
          { status: 403 }
        );
      }
      
      // Add tenant context to request headers for downstream handlers
      const response = NextResponse.next();
      response.headers.set('x-validated-tenant-id', tenantId);
      response.headers.set('x-tenant-status', tenant?.status || 'unknown');
      
      applySecurityHeaders(response);
      return response;
    }
  }

  // Handle subdomain-based multi-tenancy for production
  if (process.env.NODE_ENV === 'production' && hostname !== process.env.NEXT_PUBLIC_APP_URL) {
    const subdomain = hostname.split('.')[0];
    if (subdomain && subdomain !== 'www') {
      // Validate subdomain format to prevent injection
      if (!/^[a-z0-9-]{2,50}$/.test(subdomain)) {
        return NextResponse.json(
          { error: 'Invalid subdomain format' },
          { status: 400 }
        );
      }
      
      // Rewrite subdomain requests to tenant routes
      const newUrl = url.clone();
      newUrl.pathname = `/${subdomain}${pathname}`;
      
      const response = NextResponse.rewrite(newUrl);
      response.headers.set('x-tenant-slug', subdomain);
      
      applySecurityHeaders(response);
      return response;
    }
  }

  // Handle path-based tenant routing for development
  const pathSegments = pathname.split('/').filter(Boolean);
  const firstSegment = pathSegments[0];

  // If the first segment is not a reserved route and not empty, treat it as a potential tenant
  if (firstSegment && !RESERVED_ROUTES.includes(firstSegment)) {
    // Check if this looks like a tenant slug (alphanumeric + hyphens, reasonable length)
    if (/^[a-z0-9-]{2,50}$/.test(firstSegment)) {
      // Add tenant context headers without rewriting
      const response = NextResponse.next();
      response.headers.set('x-tenant-slug', firstSegment);
      
      // Add security headers
      applySecurityHeaders(response);
      
      // Set security cookies
      if (!request.cookies.get('session-id')) {
        const sessionId = crypto.randomUUID();
        response.cookies.set('session-id', sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 24 * 60 * 60, // 24 hours
        });
      }
      
      return response;
    }
  }

  // Add security headers for all other requests
  const response = NextResponse.next();
  applySecurityHeaders(response);
  
  // Set session cookie if not present
  if (!request.cookies.get('session-id')) {
    const sessionId = crypto.randomUUID();
    response.cookies.set('session-id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours
    });
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*public).*)',
  ],
};