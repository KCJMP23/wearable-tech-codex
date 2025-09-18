with tenant_ids as (
  select id, slug from public.tenants where slug in ('nectarheat','lumenpulse')
)
insert into public.kb (tenant_id, kind, title, content)
select id, kind, title, content
from tenant_ids
join (
  values
    ('nectarheat', 'policy', 'Privacy Policy', 'We collect minimal analytics and email addresses to deliver newsletters. Amazon affiliate links include tag=jmpkc01-20.'),
    ('nectarheat', 'policy', 'Terms of Service', 'Use Nectar & Heat content for research only. Consult professionals before wellness decisions.'),
    ('nectarheat', 'faq', 'Contact', 'Reach our editors at hello@nectarheat.com within 24 hours.'),
    ('nectarheat', 'doc', 'About', 'Nectar & Heat curates thermal wearable tech, balancing therapy and comfort.'),
    ('lumenpulse', 'policy', 'Privacy Policy', 'We store quiz answers securely and use affiliate links with tag=jmpkc01-20.'),
    ('lumenpulse', 'policy', 'Terms of Service', 'Training advice is informational. Always consult your coach or physician.'),
    ('lumenpulse', 'faq', 'Contact', 'Email the Lumen & Pulse team at crew@lumenpulse.co.'),
    ('lumenpulse', 'doc', 'About', 'Lumen & Pulse helps endurance athletes pick the right wearable data stack.')
) as data(slug_key, kind, title, content) on data.slug_key = tenant_ids.slug
on conflict (tenant_id, title) do nothing;
