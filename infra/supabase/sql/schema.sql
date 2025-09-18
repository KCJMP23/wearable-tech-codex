-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgvector";
create extension if not exists "ltree";

-- Tenants table
create table if not exists public.tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  domain text not null unique,
  theme jsonb default '{}'::jsonb,
  logo_url text,
  color_tokens jsonb default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

-- Taxonomy
create table if not exists public.taxonomy (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  kind text not null check (kind in ('vertical','horizontal')),
  name text not null,
  slug text not null,
  parent_id uuid references public.taxonomy(id) on delete cascade,
  path ltree,
  meta jsonb default '{}'::jsonb
);
create index if not exists taxonomy_tenant_idx on public.taxonomy(tenant_id);
create unique index if not exists taxonomy_slug_tenant_idx on public.taxonomy(tenant_id, slug);

create or replace function public.taxonomy_set_path() returns trigger as $$
begin
  if new.parent_id is null then
    new.path := text2ltree(new.slug);
  else
    select path || text2ltree(new.slug) into new.path from public.taxonomy where id = new.parent_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger taxonomy_path_trigger
  before insert or update on public.taxonomy
  for each row execute procedure public.taxonomy_set_path();

-- Products
create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  asin text not null,
  title text not null,
  brand text,
  images jsonb default '[]'::jsonb,
  features jsonb default '[]'::jsonb,
  rating numeric,
  review_count int,
  price_snapshot text,
  currency text,
  category text,
  subcategory text,
  device_type text,
  compatibility jsonb default '{}'::jsonb,
  regulatory_notes text,
  health_metrics text[] default array[]::text[],
  battery_life_hours numeric,
  water_resistance text,
  affiliate_url text not null,
  source text not null default 'amazon',
  last_verified_at timestamptz,
  raw jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create unique index if not exists products_tenant_asin_idx on public.products(tenant_id, asin);

-- Posts
create table if not exists public.posts (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  type text not null check (type in ('howto','listicle','answer','review','roundup','alternative','evergreen')),
  title text not null,
  slug text not null,
  excerpt text,
  body_mdx text,
  images jsonb default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','scheduled','published')),
  published_at timestamptz,
  seo jsonb default '{}'::jsonb,
  jsonld jsonb,
  created_at timestamptz default now()
);
create unique index if not exists posts_slug_tenant_idx on public.posts(tenant_id, slug);

-- Post to taxonomy join table
create table if not exists public.post_taxonomy (
  post_id uuid references public.posts(id) on delete cascade,
  taxonomy_id uuid references public.taxonomy(id) on delete cascade,
  primary key (post_id, taxonomy_id)
);

create table if not exists public.post_products (
  post_id uuid references public.posts(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  position int default 0,
  primary key (post_id, product_id)
);

-- Links
create table if not exists public.links (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  target_url text not null,
  target_type text not null check (target_type in ('product','post','outbound')),
  status_code int,
  ok boolean default true,
  checked_at timestamptz
);

-- Quiz
create table if not exists public.quiz (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  title text not null,
  schema jsonb not null,
  active boolean default false
);

-- Quiz results
create table if not exists public.quiz_results (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  quiz_id uuid references public.quiz(id) on delete set null,
  answers jsonb not null,
  segments text[] default array[]::text[],
  recommended_product_ids uuid[] default array[]::uuid[],
  email text,
  created_at timestamptz default now()
);

-- Subscribers
create table if not exists public.subscribers (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  email text not null,
  status text not null default 'active' check (status in ('active','unsubscribed','bounced')),
  source text,
  unsub_token text default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz default now(),
  unique (tenant_id, email)
);

-- Knowledge base
create table if not exists public.kb (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  kind text not null check (kind in ('doc','faq','policy','guide')),
  title text not null,
  content text not null,
  updated_at timestamptz default now()
);

-- Agent tasks
create table if not exists public.agent_tasks (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  agent text not null,
  input jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','running','done','error')),
  result jsonb,
  created_at timestamptz default now(),
  completed_at timestamptz
);
create index if not exists agent_tasks_tenant_status_idx on public.agent_tasks(tenant_id, status);

-- Insights
create table if not exists public.insights (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  kpi text not null,
  value numeric not null,
  window text not null,
  meta jsonb default '{}'::jsonb,
  computed_at timestamptz not null default now()
);

-- Calendar
create table if not exists public.calendar (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  item_type text not null check (item_type in ('post','newsletter','social','agent')),
  ref_id uuid,
  title text not null,
  status text not null default 'planned' check (status in ('planned','scheduled','published','done','blocked')),
  run_at timestamptz not null,
  meta jsonb default '{}'::jsonb
);
create index if not exists calendar_run_at_idx on public.calendar(run_at);

-- Embeddings
create table if not exists public.embeddings (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  ref_table text not null,
  ref_id uuid not null,
  content text not null,
  embedding vector(3072) not null
);
create index if not exists embeddings_ref_idx on public.embeddings(tenant_id, ref_table, ref_id);
create index if not exists embeddings_vector_idx on public.embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- View: insights_view for admin
create or replace view public.insights_view as
select
  id,
  tenant_id,
  kpi,
  value,
  window,
  meta ->> 'headline' as headline,
  meta ->> 'body' as body,
  (meta -> 'action') ->> 'label' as action_label,
  meta -> 'action' as action_payload,
  computed_at
from public.insights;

-- View linking posts to products via json arrays
create or replace view public.post_products_view as
select
  pp.post_id,
  prod.*
from public.post_products pp
join public.products prod on prod.id = pp.product_id
order by pp.position;

-- Function to fetch posts by taxonomy slug
create or replace function public.get_posts_by_taxonomy(tenant_uuid uuid, taxonomy_slug text)
returns setof public.posts as $$
begin
  return query
  select p.*
  from public.posts p
  join public.post_taxonomy pt on pt.post_id = p.id
  join public.taxonomy t on t.id = pt.taxonomy_id
  where p.tenant_id = tenant_uuid
    and t.slug = taxonomy_slug
    and p.status = 'published'
  order by p.published_at desc nulls last;
end;
$$ language plpgsql stable;


create or replace function public.get_embedding_sources()
returns table(tenant_id uuid, ref_table text, ref_id uuid, title text, content text) as $$
  select tenant_id, 'posts'::text as ref_table, id as ref_id, title, coalesce(body_mdx, '') as content
  from public.posts
  where status = 'published'
  union all
  select tenant_id, 'products', id, title, coalesce(raw::text, '')
  from public.products
  union all
  select tenant_id, 'kb', id, title, content
  from public.kb;
$$ language sql stable;
