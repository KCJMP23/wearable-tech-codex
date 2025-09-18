# Affiliate Factory Monorepo

Multi-tenant wearable tech affiliate factory featuring a Next.js storefront + admin, Supabase headless CMS, orchestrated agents, and CLI automation.

## Structure

```
apps/
  web/     # Storefront + admin
  worker/  # Agent runner
packages/
  sdk/     # API integrations, Supabase helpers
  ui/      # Shared Woodstock-inspired UI components
  content/ # Templates, prompts, JSON-LD builders
infra/
  supabase/ # SQL schema, policies, edge functions
  vercel/   # Deployment config
```

## Key Features

- Multi-tenant theming, taxonomy, quiz, newsletter automation.
- Supabase-backed CMS with pgvector embeddings and Edge Functions.
- Admin dashboard with insights, calendar, copy-to-clipboard actions, and agent control.
- Worker agents for products, editorial content, scheduling, personalization, and trends.
- CLI to bootstrap and operate tenants quickly.

See `SETUP.md` for deployment instructions.
