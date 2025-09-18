with tenant_ids as (
  select slug, id from public.tenants where slug in ('nectarheat','lumenpulse')
)
insert into public.posts (tenant_id, type, title, slug, excerpt, body_mdx, images, status, published_at, seo)
select id, type, title, slug, excerpt, body_mdx, images, status, published_at, seo
from tenant_ids
join (
  values
    ('nectarheat', 'review', 'Thermabliss Flex Wrap Review', 'thermabliss-flex-wrap-review', 'Hands-on review of the Thermabliss heat wrap.', '# Introduction\n- Real world use cases', '[{"url":"https://images.example.com/heat-wrap.jpg","alt":"Thermal wrap"}]'::jsonb, 'published', now(), jsonb_build_object('title','Thermabliss Flex Wrap Review','description','Pros, cons, and best use cases','keywords',array['heat therapy','wearable'])) ,
    ('lumenpulse', 'roundup', 'Best GPS Trackers for Tempo Runs', 'best-gps-trackers-tempo', 'Our favorite GPS trackers with accurate tempo metrics.', '# Tempo tracking\n- Key metrics', '[{"url":"https://images.example.com/gps-tempo.jpg","alt":"GPS tracker"}]'::jsonb, 'published', now(), jsonb_build_object('title','Best GPS Trackers for Tempo Runs','description','Top picks curated by Lumen & Pulse','keywords',array['gps watch','tempo run']))
) as data(slug_key, type, title, slug, excerpt, body_mdx, images, status, published_at, seo)
  on data.slug_key = tenant_ids.slug
on conflict (tenant_id, slug) do nothing;
