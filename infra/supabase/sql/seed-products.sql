with tenant_ids as (
  select slug, id from public.tenants where slug in ('nectarheat','lumenpulse')
)
insert into public.products (tenant_id, asin, title, brand, images, features, rating, review_count, price_snapshot, currency, device_type, health_metrics, battery_life_hours, water_resistance, affiliate_url)
select id, asin, title, brand, images, features, rating, review_count, price_snapshot, currency, device_type, health_metrics, battery_life_hours, water_resistance, affiliate_url
from tenant_ids
join (
  values
    ('nectarheat', 'B0HEAT001', 'Thermabliss Flex Wrap', 'Thermabliss', '[{"url":"https://images.example.com/heat-wrap.jpg","alt":"Heat wrap"}]'::jsonb, '[{"title":"Modes","description":"3 heat zones"}]'::jsonb, 4.6, 312, '$129', 'USD', 'Heat Therapy', '{"Infrared"}', 6, 'IPX4', 'https://www.amazon.com/dp/B0HEAT001?tag=jmpkc01-20'),
    ('nectarheat', 'B0CIRCUIT', 'FlowStride Compression Boots', 'FlowStride', '[{"url":"https://images.example.com/compression.jpg","alt":"Compression boots"}]'::jsonb, '[{"title":"Compression","description":"4 intensity levels"}]'::jsonb, 4.8, 190, '$399', 'USD', 'Recovery', '{"Circulation"}', null, null, 'https://www.amazon.com/dp/B0CIRCUIT?tag=jmpkc01-20'),
    ('lumenpulse', 'B0TRACK01', 'PulseTrack Pro', 'PulseTrack', '[{"url":"https://images.example.com/track-pro.jpg","alt":"Tracker"}]'::jsonb, '[{"title":"GPS","description":"Dual-band"}]'::jsonb, 4.7, 1022, '$349', 'USD', 'Fitness Tracker', '{"VO2","HRV"}', 32, 'IP68', 'https://www.amazon.com/dp/B0TRACK01?tag=jmpkc01-20'),
    ('lumenpulse', 'B0RECOV01', 'Lumen Recovery Pod', 'Lumen', '[{"url":"https://images.example.com/recovery-pod.jpg","alt":"Recovery pod"}]'::jsonb, '[{"title":"Cooling","description":"Selectable ranges"}]'::jsonb, 4.5, 210, '$249', 'USD', 'Recovery', '{"Cooling"}', null, null, 'https://www.amazon.com/dp/B0RECOV01?tag=jmpkc01-20')
) as data(slug_key, asin, title, brand, images, features, rating, review_count, price_snapshot, currency, device_type, health_metrics, battery_life_hours, water_resistance, affiliate_url)
  on data.slug_key = tenant_ids.slug
on conflict (tenant_id, asin) do nothing;
