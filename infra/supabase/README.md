# Supabase Infrastructure

## Prerequisites

1. Create a Supabase project and enable the extensions:
   ```sql
   create extension if not exists "uuid-ossp";
   create extension if not exists "pgvector";
   create extension if not exists "ltree";
   ```
2. Set the `.env` values for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, and webhook secrets.

## Apply Schema

```bash
supabase db push --file infra/supabase/sql/schema.sql
supabase db push --file infra/supabase/sql/policies.sql
supabase db push --file infra/supabase/sql/seed-tenants.sql
supabase db push --file infra/supabase/sql/seed-taxonomy.sql
supabase db push --file infra/supabase/sql/seed-products.sql
supabase db push --file infra/supabase/sql/seed-posts.sql
supabase db push --file infra/supabase/sql/seed-kb.sql
```

## Deploy Edge Functions

```bash
supabase functions deploy ingest-post --project-ref <project_ref>
supabase functions deploy ingest-product --project-ref <project_ref>
supabase functions deploy ingest-images --project-ref <project_ref>
supabase functions deploy run-agent --project-ref <project_ref>
supabase functions deploy schedule-tick --project-ref <project_ref>
supabase functions deploy link-verify --project-ref <project_ref>
supabase functions deploy embeddings-index --project-ref <project_ref>
```

Set the corresponding environment variables on each function:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MAKE_BLOG_WEBHOOK_SECRET`
- `MAKE_PRODUCT_WEBHOOK_SECRET`
- `MAKE_IMAGE_WEBHOOK_SECRET`
- `OPENAI_API_KEY`
- `EMBEDDINGS_MODEL`

## Scheduling

Use Supabase scheduled functions or Vercel cron to hit the `schedule-tick`, `link-verify`, and `embeddings-index` endpoints on the cadence defined in `afillify-instructions.md`.
