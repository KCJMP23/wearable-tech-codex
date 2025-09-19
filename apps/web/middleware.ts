import { NextResponse, type NextRequest } from 'next/server';
import { createAuthMiddleware } from './lib/auth';

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

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';
  const pathname = url.pathname;

  // Handle authentication for protected routes
  if (pathname.startsWith('/admin')) {
    return createAuthMiddleware(request);
  }

  // Handle subdomain-based multi-tenancy for production
  if (process.env.NODE_ENV === 'production' && hostname !== process.env.NEXT_PUBLIC_APP_URL) {
    const subdomain = hostname.split('.')[0];
    if (subdomain && subdomain !== 'www') {
      // Rewrite subdomain requests to tenant routes
      const newUrl = url.clone();
      newUrl.pathname = `/${subdomain}${pathname}`;
      return NextResponse.rewrite(newUrl);
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
      addSecurityHeaders(response);
      
      return response;
    }
  }

  // Add security headers for all other requests
  const response = NextResponse.next();
  addSecurityHeaders(response);
  
  return response;
}

function addSecurityHeaders(response: NextResponse) {
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Add CSP in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-src 'self';"
    );
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
};