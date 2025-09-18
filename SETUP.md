# Deployment Guide

## 1. Bootstrap Repositories

```bash
pnpm install
```

## 2. Supabase

1. Create a project and enable extensions: `uuid-ossp`, `pgvector`, and `ltree`.
2. Run schema and policy scripts:
   ```bash
   supabase db push --file infra/supabase/sql/schema.sql
   supabase db push --file infra/supabase/sql/policies.sql
   supabase db push --file infra/supabase/sql/seed-tenants.sql
   supabase db push --file infra/supabase/sql/seed-taxonomy.sql
   supabase db push --file infra/supabase/sql/seed-products.sql
   supabase db push --file infra/supabase/sql/seed-posts.sql
   supabase db push --file infra/supabase/sql/seed-kb.sql
   ```
3. Deploy Edge Functions:
   ```bash
   supabase functions deploy ingest-post
   supabase functions deploy ingest-product
   supabase functions deploy ingest-images
   supabase functions deploy run-agent
   supabase functions deploy schedule-tick
   supabase functions deploy link-verify
   supabase functions deploy embeddings-index
   ```
4. Configure each function with environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, secrets, OpenAI keys).
5. Create a public storage bucket named `media`.

## 3. Vercel

1. Create a Vercel project targeting `apps/web`.
2. Add environment variables from `.env.example`.
3. Add cron jobs from `infra/vercel/vercel.json` or replicate schedule in Vercel UI.
4. Deploy the Next.js app.

## 4. Worker Agents

1. Provision a lightweight container or Vercel Cron job to run `pnpm --filter @affiliate-factory/worker start` with the same environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, API keys).
2. The worker polls `agent_tasks` and executes Product, Editorial, Newsletter, Personalization, Seasonal, Social, Trends, Chatbot, and Orchestrator agents.

## 5. CLI Workflow

Use the CLI after setting environment variables:

```bash
export NEXT_PUBLIC_SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
pnpm exec site init-tenant --name "Nectar & Heat" --domain nectarheat.com --theme woodstock-light
pnpm exec site onboard --tenant nectarheat
pnpm exec site seed --tenant nectarheat --posts 10
pnpm exec site import-products --tenant nectarheat --asin-file asins.csv
pnpm exec site run-agent --tenant nectarheat --agent OrchestratorAgent
pnpm exec site verify-links --tenant nectarheat
```

## 6. Testing

- Run unit tests: `pnpm test:unit`
- Run Playwright e2e tests (requires running `pnpm --filter @affiliate-factory/web dev` locally): `pnpm test:e2e`
