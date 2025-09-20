import { NextResponse, type NextRequest } from 'next/server';
import { createAuthMiddleware } from './lib/auth';
import { whiteLabelManager } from './lib/white-label';

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

  // Skip middleware for static files and internal Next.js routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.startsWith('/api/internal')
  ) {
    return NextResponse.next();
  }

  // Handle authentication for protected routes
  if (pathname.startsWith('/admin')) {
    return createAuthMiddleware(request);
  }

  try {
    // Initialize white-label context
    const whiteLabelContext = await whiteLabelManager.initializeFromRequest(request);
    
    // Handle white-label API requests
    if (pathname.startsWith('/api/')) {
      // Extract API endpoint
      const apiEndpoint = pathname.replace('/api/', '');
      
      // Route through white-label API wrapper
      return await whiteLabelManager.handleAPIRequest(request, apiEndpoint);
    }

    // If no tenant found, handle as before
    if (!whiteLabelContext) {
      // Handle subdomain-based multi-tenancy for production
      if (process.env.NODE_ENV === 'production' && hostname !== process.env.NEXT_PUBLIC_APP_URL) {
        const subdomain = hostname.split('.')[0];
        if (subdomain && subdomain !== 'www') {
          // Check if this looks like a subdomain that should exist
          const isSubdomain = hostname.includes('.') && !hostname.startsWith('www.');
          
          if (isSubdomain && !hostname.includes('localhost') && !hostname.includes('vercel.app')) {
            // Return 404 for non-existent subdomains
            return new NextResponse('Tenant not found', { status: 404 });
          }
          
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
          addSecurityHeaders(response, null);
          
          return response;
        }
      }

      // Add security headers for all other requests
      const response = NextResponse.next();
      addSecurityHeaders(response, null);
      
      return response;
    }

    // Add white-label context to request headers for use in components
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-tenant-id', whiteLabelContext.tenantId);
    requestHeaders.set('x-tenant-slug', whiteLabelContext.tenantSlug);
    requestHeaders.set('x-tenant-domain', whiteLabelContext.domain);
    requestHeaders.set('x-is-custom-domain', whiteLabelContext.isCustomDomain.toString());

    // Add branding information
    if (whiteLabelContext.configuration.branding) {
      requestHeaders.set('x-brand-name', whiteLabelContext.configuration.branding.metadata.companyName || '');
      requestHeaders.set('x-primary-color', whiteLabelContext.configuration.branding.colors.primary || '');
    }

    // Handle custom domain redirects
    if (whiteLabelContext.isCustomDomain) {
      const domainConfig = await getCustomDomainConfig(whiteLabelContext.tenantId, whiteLabelContext.domain);
      
      if (domainConfig) {
        // Handle www redirect
        const host = request.headers.get('host') || '';
        if (domainConfig.redirectToWww && !host.startsWith('www.')) {
          const redirectUrl = url.clone();
          redirectUrl.host = `www.${host}`;
          return NextResponse.redirect(redirectUrl, 301);
        }

        // Handle HTTPS enforcement
        if (domainConfig.enforceHttps && url.protocol === 'http:') {
          const redirectUrl = url.clone();
          redirectUrl.protocol = 'https:';
          return NextResponse.redirect(redirectUrl, 301);
        }
      }
    }

    // Rewrite URL for tenant-specific routing
    if (pathname === '/') {
      // Rewrite root to tenant home
      url.pathname = `/${whiteLabelContext.tenantSlug}`;
    } else if (!pathname.startsWith(`/${whiteLabelContext.tenantSlug}`)) {
      // Rewrite other paths to include tenant slug
      url.pathname = `/${whiteLabelContext.tenantSlug}${pathname}`;
    }

    // Create response with rewritten URL
    const response = NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      },
    });

    // Add security headers
    addSecurityHeaders(response, whiteLabelContext);

    // Add caching headers for static content
    addCachingHeaders(response, pathname);

    // Add CORS headers for API requests
    if (pathname.startsWith('/api/') && whiteLabelContext.configuration.apiConfig?.enableCORS) {
      addCORSHeaders(response, request, whiteLabelContext.configuration.apiConfig.allowedOrigins);
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    
    // In case of error, try to continue normally
    const response = NextResponse.next();
    addSecurityHeaders(response, null);
    return response;
  }
}

/**
 * Get custom domain configuration
 */
async function getCustomDomainConfig(tenantId: string, domain: string) {
  try {
    const { domainMapper } = await import('./lib/white-label/domain-mapper');
    const domains = await domainMapper.getTenantDomains(tenantId);
    return domains.find(d => d.domain === domain);
  } catch (error) {
    console.error('Error fetching domain config:', error);
    return null;
  }
}

/**
 * Add security headers
 */
function addSecurityHeaders(response: NextResponse, context: any) {
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googletagmanager.com https://*.google-analytics.com https://connect.facebook.net https://analytics.tiktok.com https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://api.mixpanel.com https://*.supabase.co wss://*.supabase.co",
    "frame-src 'self' https://www.googletagmanager.com",
    "worker-src 'self' blob:",
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // HSTS for custom domains with SSL
  if (context?.isCustomDomain) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
}

/**
 * Add caching headers
 */
function addCachingHeaders(response: NextResponse, pathname: string) {
  // Static assets
  if (pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  // HTML pages
  else if (!pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  }
  // API responses
  else {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
}

/**
 * Add CORS headers
 */
function addCORSHeaders(response: NextResponse, request: NextRequest, allowedOrigins: string[]) {
  const origin = request.headers.get('origin');
  
  if (origin && (allowedOrigins.includes('*') || allowedOrigins.includes(origin))) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Max-Age', '86400');
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