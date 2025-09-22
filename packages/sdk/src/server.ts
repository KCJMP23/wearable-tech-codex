/**
 * Server-only SDK exports
 * These modules should only be used in server components, API routes, and server actions
 */

// Re-export everything from client for compatibility
export * from './client.js';

// Server-only modules
export * from './amazon.js';
export * from './reddit.js';
export * from './search.js';
export * from './generation.js';
export * from './newsletter.js';
export * from './insights.js';
export * from './queue.js';
export * from './affiliate-networks.js';
// export * from './blockchain'; // Excluded for MVP deployment

// Server-only Supabase
export * as SupabaseServer from './supabase/server.js';
export { createClient as createServerClient } from './supabase/server.js';

// Full valuation class (uses server-side Supabase)
export { default as SiteValuator } from './valuation.js';
