insert into public.tenants (name, slug, domain, theme, color_tokens)
values
  (
    'Nectar & Heat',
    'nectarheat',
    'nectarheat.com',
    jsonb_build_object(
      'tagline', 'Wearables that balance energy and recovery.',
      'description', 'Nectar & Heat curates warm therapy wearables, recovery tech, and ambient wellness gear.'
    ),
    jsonb_build_object('accent', '#F29F80', 'background', '#F8F6F2', 'text', '#1F1B16', 'muted', '#AEA59D')
  ),
  (
    'Lumen & Pulse',
    'lumenpulse',
    'lumenpulse.co',
    jsonb_build_object(
      'tagline', 'Smart fitness trackers for cardio-first athletes.',
      'description', 'Lumen & Pulse helps runners and cyclists pick connected wearables tuned to heart performance.'
    ),
    jsonb_build_object('accent', '#74B9FF', 'background', '#F5F9FF', 'text', '#102542', 'muted', '#7B8BA9')
  )
on conflict (slug) do nothing;
