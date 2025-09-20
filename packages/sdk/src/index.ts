export * from './types';
export * from './database.types';
export * from './env';
export * from './supabase';
export * from './amazon'; // Server-only module - webpack fallbacks handle client-side
export * from './reddit';
export * from './search';
export * from './generation';
export * from './newsletter';
export * from './insights';
export * from './queue';
export * from './affiliate-networks';
export * from './valuation';
// export * from './services/mcp-server'; // Disabled: imports server-only components
// Export blockchain for server-side routes (conditional compilation will handle client-side)
export * from './blockchain';

// Export supabase client (safe for all environments)
export * as SupabaseClient from './supabase/client';

// Export server modules conditionally for server-side imports
// These should only be imported in server-side code
export { createClient as createServerClient } from './supabase/server';
export * as SupabaseServer from './supabase/server';