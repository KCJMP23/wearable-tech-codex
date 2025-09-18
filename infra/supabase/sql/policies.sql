-- Enable Row Level Security
alter table public.tenants enable row level security;
alter table public.products enable row level security;
alter table public.posts enable row level security;
alter table public.links enable row level security;
alter table public.quiz enable row level security;
alter table public.quiz_results enable row level security;
alter table public.subscribers enable row level security;
alter table public.kb enable row level security;
alter table public.agent_tasks enable row level security;
alter table public.taxonomy enable row level security;
alter table public.insights enable row level security;
alter table public.calendar enable row level security;
alter table public.embeddings enable row level security;

-- Service role policies
create policy "service role access" on public.tenants using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service role access" on public.products using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service role access" on public.posts using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service role access" on public.links using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service role access" on public.quiz using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service role access" on public.quiz_results using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service role access" on public.subscribers using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service role access" on public.kb using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service role access" on public.agent_tasks using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service role access" on public.taxonomy using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service role access" on public.insights using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service role access" on public.calendar using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy "service role access" on public.embeddings using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Public read policies for storefront
create policy "public read tenants" on public.tenants for select using (status = 'active');
create policy "public read posts" on public.posts for select using (status = 'published');
create policy "public read products" on public.products for select using (true);
create policy "public read taxonomy" on public.taxonomy for select using (true);
create policy "public read kb" on public.kb for select using (true);
create policy "public read quiz" on public.quiz for select using (active = true);
create policy "public read insights" on public.insights for select using (true);
create policy "public read calendar" on public.calendar for select using (status in ('planned','scheduled','published'));
