import OpenAI from 'openai';

const AFFILIATE_TAG = process.env.AMAZON_PA_API_PARTNER_TAG || 'jmpkc01-20';

const taxonomyNodeSchema = {
  type: 'object',
  properties: {
    slug: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    parentSlug: { type: ['string', 'null'] }
  },
  required: ['slug', 'name', 'description']
};

const imageSchema = {
  type: 'object',
  properties: {
    url: { type: 'string' },
    alt: { type: 'string' },
    attribution: { type: ['string', 'null'] }
  },
  required: ['url', 'alt']
};

const productFeatureSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' }
  },
  required: ['title', 'description']
};

const externalLinkSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    url: { type: 'string' }
  },
  required: ['title', 'url']
};

const onboardingPlanSchema = {
  type: 'object',
  properties: {
    theme: {
      type: 'object',
      properties: {
        tagline: { type: 'string' },
        description: { type: 'string' },
        colorTokens: {
          type: 'object',
          properties: {
            accent: { type: 'string' },
            background: { type: 'string' },
            text: { type: 'string' },
            muted: { type: 'string' }
          },
          required: ['accent', 'background', 'text', 'muted']
        },
        heroCopy: {
          type: 'object',
          properties: {
            headline: { type: 'string' },
            subheadline: { type: 'string' },
            primaryCta: { type: 'string' }
          },
          required: ['headline', 'subheadline', 'primaryCta']
        }
      },
      required: ['tagline', 'description', 'colorTokens', 'heroCopy']
    },
    taxonomy: {
      type: 'object',
      properties: {
        vertical: {
          type: 'array',
          minItems: 4,
          items: taxonomyNodeSchema
        },
        horizontal: {
          type: 'array',
          minItems: 4,
          items: taxonomyNodeSchema
        }
      },
      required: ['vertical', 'horizontal']
    },
    quiz: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        questions: {
          type: 'array',
          minItems: 5,
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              question: { type: 'string' },
              type: { enum: ['single', 'multi', 'scale'] },
              choices: {
                type: 'array',
                minItems: 3,
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    label: { type: 'string' },
                    value: { type: 'string' },
                    next: { type: ['string', 'null'] }
                  },
                  required: ['id', 'label', 'value']
                }
              },
              scoring: {
                type: 'object',
                additionalProperties: { type: 'number' }
              }
            },
            required: ['id', 'question', 'type', 'choices']
          }
        },
        segments: {
          type: 'array',
          minItems: 3,
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              recommendedAsins: {
                type: 'array',
                minItems: 3,
                items: { type: 'string' }
              }
            },
            required: ['id', 'name', 'description', 'recommendedAsins']
          }
        }
      },
      required: ['title', 'questions', 'segments']
    },
    newsletter: {
      type: 'object',
      properties: {
        subject: { type: 'string' },
        preheader: { type: 'string' },
        html: { type: 'string' },
        cadence: { type: 'string' },
        sendDay: { type: 'string' }
      },
      required: ['subject', 'preheader', 'html', 'cadence', 'sendDay']
    },
    products: {
      type: 'array',
      minItems: 12,
      items: {
        type: 'object',
        properties: {
          asin: { type: 'string' },
          title: { type: 'string' },
          brand: { type: 'string' },
          category: { type: 'string' },
          subcategory: { type: 'string' },
          deviceType: { type: 'string' },
          summary: { type: 'string' },
          affiliateUrl: { type: 'string' },
          rating: { type: 'number' },
          reviewCount: { type: 'number' },
          priceSnapshot: { type: 'string' },
          currency: { type: 'string' },
          features: {
            type: 'array',
            minItems: 3,
            items: productFeatureSchema
          },
          images: {
            type: 'array',
            minItems: 3,
            items: imageSchema
          },
          healthMetrics: {
            type: 'array',
            items: { type: 'string' }
          },
          batteryLifeHours: { type: 'number' },
          waterResistance: { type: 'string' },
          taxonomyTags: {
            type: 'array',
            minItems: 1,
            items: { type: 'string' }
          }
        },
        required: [
          'asin',
          'title',
          'summary',
          'affiliateUrl',
          'features',
          'images',
          'taxonomyTags'
        ]
      }
    },
    posts: {
      type: 'array',
      minItems: 10,
      items: {
        type: 'object',
        properties: {
          type: { enum: ['howto', 'listicle', 'answer', 'review', 'roundup', 'alternative', 'evergreen'] },
          title: { type: 'string' },
          slug: { type: 'string' },
          excerpt: { type: 'string' },
          bodyMdx: { type: 'string' },
          images: {
            type: 'array',
            minItems: 5,
            maxItems: 7,
            items: imageSchema
          },
          seo: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              keywords: {
                type: 'array',
                items: { type: 'string' }
              }
            },
            required: ['title', 'description']
          },
          jsonLd: {
            type: 'object'
          },
          taxonomySlugs: {
            type: 'array',
            minItems: 2,
            items: { type: 'string' }
          },
          productAsins: {
            type: 'array',
            minItems: 3,
            items: { type: 'string' }
          },
          internalLinks: {
            type: 'array',
            minItems: 3,
            items: { type: 'string' }
          },
          externalLinks: {
            type: 'array',
            minItems: 2,
            maxItems: 5,
            items: externalLinkSchema
          },
          callToAction: { type: 'string' },
          status: { enum: ['draft', 'scheduled', 'published'] }
        },
        required: [
          'type',
          'title',
          'slug',
          'excerpt',
          'bodyMdx',
          'images',
          'seo',
          'jsonLd',
          'taxonomySlugs',
          'productAsins',
          'internalLinks',
          'externalLinks',
          'callToAction',
          'status'
        ]
      }
    },
    calendar: {
      type: 'array',
      minItems: 8,
      items: {
        type: 'object',
        properties: {
          itemType: { enum: ['post', 'newsletter', 'social', 'agent'] },
          refSlug: { type: ['string', 'null'] },
          runAt: { type: 'string' },
          status: { enum: ['planned', 'scheduled'] },
          title: { type: 'string' },
          agent: { type: ['string', 'null'] },
          notes: { type: ['string', 'null'] }
        },
        required: ['itemType', 'runAt', 'status', 'title']
      }
    },
    kb: {
      type: 'array',
      minItems: 3,
      items: {
        type: 'object',
        properties: {
          kind: { enum: ['policy', 'faq', 'guide', 'doc'] },
          title: { type: 'string' },
          content: { type: 'string' }
        },
        required: ['kind', 'title', 'content']
      }
    }
  },
  required: ['theme', 'taxonomy', 'quiz', 'newsletter', 'products', 'posts', 'calendar', 'kb']
};

let cachedOpenAI = null;

function getOpenAIClient() {
  if (!cachedOpenAI) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for onboarding.');
    }
    cachedOpenAI = new OpenAI({ apiKey });
  }
  return cachedOpenAI;
}

export async function generateOnboardingPlan(input) {
  const client = getOpenAIClient();
  const system =
    'You are the Orchestrator Agent for a wearable tech affiliate platform. ' +
    'Generate a comprehensive onboarding package strictly matching the provided JSON schema. ' +
    'Every Amazon link must include the affiliate tag ' +
    AFFILIATE_TAG +
    '. Ensure facts reference 2024 or 2025 data and cite sources in externalLinks. ' +
    'Use concise, professional copy with no fluff.';

  const userPrompt = [
    'Tenant profile:',
    JSON.stringify(input, null, 2),
    '',
    'Requirements:',
    '- Provide at least 12 products with detailed attributes and affiliate URLs including the tag.',
    '- Provide exactly 10 in-depth posts following template rules (5–7 images, stats, quotes, CTA, internal/external links).',
    '- Map posts to taxonomy slugs and product ASINs; reuse generated product ASINs.',
    '- Incorporate supplied ASIN seeds and propose complementary ASINs to reach 12+ products.',
    '- Build a quiz with branching logic hints and recommended product bundles per segment.',
    '- Provide newsletter HTML hero content aligned to persona and cadence.',
    '- Calendar should schedule posts, newsletter, social, and agent follow-ups over the next 14 days.',
    '- KB entries must include privacy policy, terms, affiliate disclosure, and any provided compliance notes.'
  ].join('\n');

  const completion = await client.responses.parse({
    model: 'gpt-4.1-mini',
    input: [
      { role: 'system', content: system },
      { role: 'user', content: userPrompt }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'OnboardingPlan',
        schema: onboardingPlanSchema,
        strict: true
      }
    }
  });

  const jsonText = completion.output?.[0]?.output_text;
  if (!jsonText) {
    throw new Error('OpenAI returned empty onboarding plan payload.');
  }
  const plan = JSON.parse(jsonText);
  validateOnboardingPlan(plan);
  return plan;
}

function validateOnboardingPlan(plan) {
  if (!Array.isArray(plan.products) || plan.products.length < 12) {
    throw new Error('Onboarding plan must return at least 12 products.');
  }
  if (!Array.isArray(plan.posts) || plan.posts.length < 10) {
    throw new Error('Onboarding plan must return 10 posts.');
  }
  if (plan.posts.length !== 10) {
    throw new Error(`Onboarding plan returned ${plan.posts.length} posts; expected exactly 10.`);
  }
  const seenSlugs = new Set();
  const seenAsins = new Set();
  for (const product of plan.products) {
    if (seenAsins.has(product.asin)) {
      throw new Error(`Duplicate product ASIN detected in onboarding plan: ${product.asin}`);
    }
    seenAsins.add(product.asin);
  }
  const kbTitles = plan.kb.map((entry) => entry.title.toLowerCase());
  const requiredKb = ['privacy', 'terms', 'affiliate'];
  for (const required of requiredKb) {
    if (!kbTitles.some((title) => title.includes(required))) {
      throw new Error(`Knowledge base entries must include a ${required} document.`);
    }
  }
  for (const post of plan.posts) {
    if (!Array.isArray(post.images) || post.images.length < 5) {
      throw new Error(`Post ${post.slug} is missing required images.`);
    }
    if (seenSlugs.has(post.slug)) {
      throw new Error(`Duplicate post slug detected in onboarding plan: ${post.slug}`);
    }
    seenSlugs.add(post.slug);
    if (!Array.isArray(post.externalLinks) || post.externalLinks.length < 2) {
      throw new Error(`Post ${post.slug} needs at least two external links.`);
    }
    if (!Array.isArray(post.internalLinks) || post.internalLinks.length < 3) {
      throw new Error(`Post ${post.slug} needs at least three internal links.`);
    }
    if (!Array.isArray(post.productAsins) || post.productAsins.length < 3) {
      throw new Error(`Post ${post.slug} must recommend at least three products.`);
    }
    for (const asin of post.productAsins) {
      if (!seenAsins.has(asin)) {
        throw new Error(`Post ${post.slug} references unknown product ASIN ${asin}.`);
      }
    }
  }
  for (const segment of plan.quiz.segments) {
    for (const asin of segment.recommendedAsins) {
      if (!seenAsins.has(asin)) {
        throw new Error(`Quiz segment ${segment.id} references unknown product ASIN ${asin}.`);
      }
    }
  }

}

export async function applyOnboardingPlan({ plan, supabase, tenantId, tenantSlug, tenantDomain, complianceNotes }) {
  await updateTenantTheme({ plan, supabase, tenantId, complianceNotes });
  await resetTenantContent({ supabase, tenantId });

  const taxonomyMap = await insertTaxonomy({ plan, supabase, tenantId });
  const productMap = await insertProducts({ plan, supabase, tenantId, taxonomyMap });
  const postMap = await insertPosts({ plan, supabase, tenantId, productMap, taxonomyMap, tenantSlug });

  await insertQuiz({ plan, supabase, tenantId, productMap });
  await insertKbEntries({ plan, supabase, tenantId });
  const calendarCount = await insertCalendar({ plan, supabase, tenantId, postMap });
  await insertLinks({ plan, supabase, tenantId, postMap, tenantSlug, tenantDomain });

  return {
    products: plan.products.length,
    posts: plan.posts.length,
    calendar: calendarCount
  };
}

async function updateTenantTheme({ plan, supabase, tenantId, complianceNotes }) {
  const theme = {
    tagline: plan.theme.tagline,
    description: plan.theme.description,
    heroCopy: plan.theme.heroCopy,
    complianceNotes: complianceNotes ?? ''
  };
  const { error } = await supabase
    .from('tenants')
    .update({
      theme,
      color_tokens: plan.theme.colorTokens,
      status: 'active'
    })
    .eq('id', tenantId);
  if (error) {
    throw error;
  }
}

async function resetTenantContent({ supabase, tenantId }) {
  const deletions = [
    supabase.from('posts').delete().eq('tenant_id', tenantId),
    supabase.from('products').delete().eq('tenant_id', tenantId),
    supabase.from('taxonomy').delete().eq('tenant_id', tenantId),
    supabase.from('quiz').delete().eq('tenant_id', tenantId),
    supabase.from('kb').delete().eq('tenant_id', tenantId),
    supabase.from('calendar').delete().eq('tenant_id', tenantId),
    supabase.from('links').delete().eq('tenant_id', tenantId)
  ];

  for (const promise of deletions) {
    const { error } = await promise;
    if (error) {
      throw error;
    }
  }
}

async function insertTaxonomy({ plan, supabase, tenantId }) {
  const slugToId = new Map();
  const insertNodes = async (nodes, kind) => {
    const remaining = [...nodes];
    while (remaining.length) {
      const index = remaining.findIndex((node) => !node.parentSlug || slugToId.has(node.parentSlug));
      if (index === -1) {
        throw new Error(`Unable to resolve parent taxonomy for ${kind}.`);
      }
      const node = remaining.splice(index, 1)[0];
      const parentId = node.parentSlug ? slugToId.get(node.parentSlug) ?? null : null;
      const payload = {
        tenant_id: tenantId,
        kind,
        name: node.name,
        slug: node.slug,
        parent_id: parentId,
        meta: { description: node.description }
      };
      const { data, error } = await supabase.from('taxonomy').insert(payload).select('id, slug');
      if (error) {
        throw error;
      }
      const inserted = Array.isArray(data) ? data[0] : data;
      slugToId.set(inserted.slug, inserted.id);
    }
  };

  await insertNodes(plan.taxonomy.vertical, 'vertical');
  await insertNodes(plan.taxonomy.horizontal, 'horizontal');

  return slugToId;
}

async function insertProducts({ plan, supabase, tenantId }) {
  const asinToId = new Map();
  const rows = plan.products.map((product) => ({
    tenant_id: tenantId,
    asin: product.asin,
    title: product.title,
    brand: product.brand,
    images: product.images,
    features: product.features,
    rating: product.rating ?? null,
    review_count: product.reviewCount ?? null,
    price_snapshot: product.priceSnapshot ?? null,
    currency: product.currency ?? null,
    category: product.category ?? null,
    subcategory: product.subcategory ?? null,
    device_type: product.deviceType ?? null,
    compatibility: { tags: product.taxonomyTags },
    regulatory_notes: null,
    health_metrics: product.healthMetrics ?? [],
    battery_life_hours: product.batteryLifeHours ?? null,
    water_resistance: product.waterResistance ?? null,
    affiliate_url: ensureAffiliateTag(product.affiliateUrl),
    source: 'amazon',
    last_verified_at: new Date().toISOString(),
    raw: { summary: product.summary }
  }));

  const { data, error } = await supabase.from('products').insert(rows).select('id, asin');
  if (error) {
    throw error;
  }
  for (const row of data ?? []) {
    asinToId.set(row.asin, row.id);
  }
  return asinToId;
}

async function insertPosts({ plan, supabase, tenantId, productMap, taxonomyMap, tenantSlug }) {
  const slugToId = new Map();
  const rows = plan.posts.map((post) => ({
    tenant_id: tenantId,
    type: post.type,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    body_mdx: post.bodyMdx,
    images: normalizeImages(post.images, tenantSlug),
    status: post.status ?? 'draft',
    published_at: post.status === 'published' ? new Date().toISOString() : null,
    seo: post.seo,
    jsonld: post.jsonLd
  }));

  const { data, error } = await supabase.from('posts').insert(rows).select('id, slug');
  if (error) {
    throw error;
  }

  for (const inserted of data ?? []) {
    slugToId.set(inserted.slug, inserted.id);
  }

  for (const post of plan.posts) {
    const postId = slugToId.get(post.slug);
    if (!postId) continue;

    const taxonomyIds = post.taxonomySlugs
      .map((slug) => taxonomyMap.get(slug))
      .filter(Boolean)
      .map((id) => ({ post_id: postId, taxonomy_id: id }));
    if (taxonomyIds.length) {
      const { error: linkError } = await supabase.from('post_taxonomy').insert(taxonomyIds);
      if (linkError) {
        throw linkError;
      }
    }

    const productIds = post.productAsins
      .map((asin) => productMap.get(asin))
      .filter(Boolean)
      .map((id, index) => ({ post_id: postId, product_id: id, position: index }));
    if (productIds.length) {
      const { error: ppError } = await supabase.from('post_products').insert(productIds);
      if (ppError) {
        throw ppError;
      }
    }
  }

  return slugToId;
}

async function insertQuiz({ plan, supabase, tenantId, productMap }) {
  const quizPayload = {
    tenant_id: tenantId,
    title: plan.quiz.title,
    schema: {
      questions: plan.quiz.questions,
      segments: plan.quiz.segments.map((segment) => ({
        ...segment,
        recommendedProductIds: segment.recommendedAsins
          .map((asin) => productMap.get(asin))
          .filter(Boolean)
      }))
    },
    active: true
  };

  const { error } = await supabase.from('quiz').insert(quizPayload);
  if (error) {
    throw error;
  }
}

async function insertKbEntries({ plan, supabase, tenantId }) {
  const entries = plan.kb.map((entry) => ({
    tenant_id: tenantId,
    kind: entry.kind,
    title: entry.title,
    content: entry.content
  }));
  const { error } = await supabase.from('kb').insert(entries);
  if (error) {
    throw error;
  }
}

async function insertCalendar({ plan, supabase, tenantId, postMap }) {
  const now = Date.now();
  const calendarEntries = [...plan.calendar];
  const existingTypes = new Set(calendarEntries.map((item) => item.itemType));
  const firstPost = plan.posts[0];

  if (!existingTypes.has('newsletter')) {
    calendarEntries.push({
      itemType: 'newsletter',
      refSlug: null,
      runAt: new Date(now + 3 * 3600 * 1000).toISOString(),
      status: 'planned',
      title: `Send newsletter: ${plan.newsletter.subject}`,
      agent: 'NewsletterAgent',
      notes: 'Auto-added to honor onboarding cadence.'
    });
  }

  if (!existingTypes.has('social') && firstPost) {
    calendarEntries.push({
      itemType: 'social',
      refSlug: firstPost.slug,
      runAt: new Date(now + 6 * 3600 * 1000).toISOString(),
      status: 'planned',
      title: `Social promo: ${firstPost.title}`,
      agent: 'SocialAgent',
      notes: 'Auto-scheduled to announce flagship content.'
    });
  }

  if (!existingTypes.has('agent')) {
    calendarEntries.push({
      itemType: 'agent',
      refSlug: null,
      runAt: new Date(now + 9 * 3600 * 1000).toISOString(),
      status: 'planned',
      title: 'Agent sync: Review KPIs and next sprint',
      agent: 'OrchestratorAgent',
      notes: 'Auto-scheduled orchestrator check-in.'
    });
  }

  const scheduledSlugs = new Set(
    calendarEntries.filter((item) => item.itemType === 'post' && item.refSlug).map((item) => String(item.refSlug))
  );

  let autoOffset = 1;
  for (const post of plan.posts) {
    if (!scheduledSlugs.has(post.slug)) {
      calendarEntries.push({
        itemType: 'post',
        refSlug: post.slug,
        runAt: new Date(now + autoOffset * 24 * 3600 * 1000).toISOString(),
        status: post.status === 'published' ? 'published' : 'scheduled',
        title: `Publish ${post.title}`,
        agent: null,
        notes: 'Auto-scheduled to ensure coverage.'
      });
      autoOffset += 1;
    }
  }

  const items = calendarEntries.map((item, index) => ({
    tenant_id: tenantId,
    item_type: item.itemType,
    ref_id: item.itemType === 'post' && item.refSlug ? postMap.get(item.refSlug) ?? null : null,
    title: item.title,
    status: item.status ?? 'planned',
    run_at: normalizeTimestamp(item.runAt, now + index * 3600 * 1000),
    meta: {
      agent: item.agent ?? null,
      notes: item.notes ?? null
    }
  }));
  const { error } = await supabase.from('calendar').insert(items);
  if (error) {
    throw error;
  }
  return items.length;
}

async function insertLinks({ plan, supabase, tenantId, postMap, tenantSlug, tenantDomain }) {
  const fallbackDomain = process.env.NEXT_PUBLIC_DEFAULT_DOMAIN || 'example.com';
  const canonicalBase = tenantDomain ? `https://${tenantDomain}` : `https://${fallbackDomain}/${tenantSlug}`;
  const links = [];
  for (const post of plan.posts) {
    const postId = postMap.get(post.slug);
    for (const target of post.externalLinks) {
      links.push({
        tenant_id: tenantId,
        target_url: target.url,
        target_type: 'outbound',
        status_code: null,
        ok: true,
        checked_at: null
      });
    }
    for (const asin of post.productAsins) {
      const affiliateUrl = ensureAffiliateTag(`https://www.amazon.com/dp/${asin}`);
      links.push({
        tenant_id: tenantId,
        target_url: affiliateUrl,
        target_type: 'product',
        status_code: null,
        ok: true,
        checked_at: null
      });
    }
    if (postId) {
      links.push({
        tenant_id: tenantId,
        target_url: `${canonicalBase}/blog/${post.slug}`,
        target_type: 'post',
        status_code: null,
        ok: true,
        checked_at: null
      });
    }
  }
  if (!links.length) return;
  const { error } = await supabase.from('links').insert(links);
  if (error) {
    throw error;
  }
}

function normalizeImages(images, tenantSlug) {
  if (!Array.isArray(images)) return [];
  const padded = [...images];
  while (padded.length < 5) {
    padded.push({
      url: `https://images.unsplash.com/placeholder-${tenantSlug}-${padded.length}`,
      alt: 'Wearable tech lifestyle image',
      attribution: null
    });
  }
  return padded.slice(0, 7);
}

function normalizeTimestamp(value, fallback) {
  if (!value) return new Date(fallback).toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date(fallback).toISOString();
  }
  return date.toISOString();
}

function ensureAffiliateTag(url, tag = AFFILIATE_TAG) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('tag', tag);
    return parsed.toString();
  } catch (error) {
    if (url.includes('tag=')) {
      return url;
    }
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}tag=${tag}`;
  }
}
