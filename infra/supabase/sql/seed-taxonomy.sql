with tenant_ids as (
  select slug, id from public.tenants where slug in ('nectarheat', 'lumenpulse')
)
insert into public.taxonomy (tenant_id, kind, name, slug, meta)
select id, 'vertical', name, slug, meta
from tenant_ids
join (
  values
    ('nectarheat', 'Heat Therapy', 'heat-therapy', jsonb_build_object('description','Infrared and heated wearables for recovery.')),
    ('nectarheat', 'Circulation Boost', 'circulation-boost', jsonb_build_object('description','Devices that keep blood flow moving.')),
    ('lumenpulse', 'Performance Trackers', 'performance-trackers', jsonb_build_object('description','Wearables that capture run and ride telemetry.')),
    ('lumenpulse', 'Recovery Tech', 'recovery-tech', jsonb_build_object('description','Massage boots, compression, cooling accessories.'))
) as data(slug_key, name, slug, meta) on data.slug_key = tenant_ids.slug
on conflict (tenant_id, slug) do nothing;
