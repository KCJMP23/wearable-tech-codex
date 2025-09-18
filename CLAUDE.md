# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `pnpm dev` - Start Next.js development server (runs web app)
- `pnpm build` - Build all packages in monorepo
- `pnpm lint` - Run linting across all packages
- `pnpm typecheck` - Run TypeScript type checking across all packages
- `pnpm format` - Format code with Prettier

### Testing
- `pnpm test:unit` - Run Vitest unit tests
- `pnpm test:e2e` - Run Playwright e2e tests (requires dev server running)
- `pnpm test` - Run all tests in packages

### Package-specific commands
- `pnpm --filter web dev` - Start only the web app
- `pnpm --filter @affiliate-factory/worker start` - Run worker agents
- `pnpm -r build` - Recursive build across monorepo

### CLI Operations
The repository includes a CLI tool accessible via `pnpm exec site`:
- `init-tenant` - Initialize a new tenant with name, domain, and theme
- `onboard` - Onboard a tenant
- `seed` - Seed posts for a tenant
- `import-products` - Import products from ASIN file
- `run-agent` - Run specific agents (OrchestratorAgent, etc.)
- `verify-links` - Verify affiliate links

## Architecture

### Monorepo Structure
This is a pnpm workspace monorepo for a multi-tenant wearable tech affiliate platform:

- **apps/web**: Next.js 14 app with App Router, serving both storefront and admin interfaces
  - Uses route groups: `(site)` for public storefront, `(admin)` for admin dashboard
  - Implements multi-tenancy via subdomain routing
  - Server components with React Query for data fetching

- **apps/worker**: Agent runner that polls `agent_tasks` table and executes various AI agents
  - Agents include: Product, Editorial, Newsletter, Personalization, Seasonal, Social, Trends, Chatbot, Orchestrator

- **packages/sdk**: Core SDK with Supabase client, API integrations, and utility functions
  - Handles Amazon product data fetching, OpenAI generation, insights tracking
  - Provides typed Supabase client and database types

- **packages/ui**: Shared React components with Woodstock-inspired theming
  - Built with Tailwind CSS and Headless UI
  - Implements multi-theme support

- **packages/content**: Content generation templates, prompts, and JSON-LD builders
  - Contains AI prompts for content generation
  - Structured data builders for SEO

- **infra/supabase**: Database schema, policies, edge functions
  - PostgreSQL with pgvector for embeddings, ltree for hierarchical taxonomy
  - Edge Functions for ingestion, agent execution, link verification

### Key Technologies
- **Frontend**: Next.js 14 with App Router, React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **AI/ML**: OpenAI API for content generation, pgvector for embeddings
- **Testing**: Vitest for unit tests, Playwright for e2e tests
- **Package Management**: pnpm workspaces with Turbo for build orchestration

### Database Architecture
- Multi-tenant architecture with `tenants` table as root
- Hierarchical taxonomy using PostgreSQL ltree extension
- Vector embeddings for semantic search via pgvector
- Row-level security (RLS) policies for tenant isolation

### Agent System
Worker agents operate on scheduled tasks from `agent_tasks` table:
- OrchestratorAgent coordinates other agents
- Product/Editorial agents generate content
- Newsletter agent manages email campaigns
- Personalization agent tailors user experiences
- Analytics tracked in `insights` table