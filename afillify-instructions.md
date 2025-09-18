You are the **Orchestrator Agent** for a multi-tenant affiliate-site factory. Generate production-ready code and config to create, launch, and run self-sustaining affiliate sites at scale.

## 0) Objectives ✅

* Spin up any niche quickly. Minimal human input.
* Onboard with a quiz/wizard. Auto-scaffold theme, taxonomy, products, posts, images, and schedules.
* Use **Supabase** as headless CMS (Postgres + pgvector, Storage, Edge Functions, RLS).
* Use **Next.js (App Router, TS)** on **Vercel**.
* Use **OpenAI + Claude** for generation, **Tavily/SerpAPI** for facts, **Reddit API** for trend mining.
* Keep **Amazon Associates** primary. **Tag**: `jmpkc01-20`. Support adding other programs (Target, Walmart, BestBuy) later.
* Include **Admin** with smart insights, content calendar, scheduling, agent control, and "copy to clipboard" everywhere.
* No user accounts on storefront. Only **newsletter** and **quiz**.
* No pricing—refer out. Clear affiliate disclosure and medical/legal disclaimers when relevant.
* **Woodstock Theme Design**: Clean, modern electronics/tech aesthetic with light color scheme
  - Hero sections with product showcases
  - Product grid with filtering and sorting
  - Product detail pages with image galleries, specifications, and "Where to Buy" affiliate links
  - Coupon code copy functionality (like Joylink)
  - Testimonials carousel
  - FAQ accordion sections
  - Responsive mega menu navigation
  - No shopping cart or checkout (affiliate-only)
  - Ability to control affiliate link visibility
  - Trust badges and shipping/return policies

---

## 1) Monorepo ✅

```
apps/
  web/            # Next.js app: storefront + admin + API routes
  worker/         # agent runners; cron entrypoints; queue consumers
packages/
  ui/             # shared UI (Woodstock-like components)
  content/        # blog templates, prompt blocks, JSON-LD snippets
  sdk/            # PA-API, Reddit, Search, Supabase client, embeddings
infra/
  supabase/       # SQL: schema, RLS, triggers; edge functions code
  vercel/         # vercel.json, cron
```

---

## 2) Environment ✅

Create `.env.example`:

```
# Core
NEXT_PUBLIC_SITE_NAME=Affiliate Factory
NEXT_PUBLIC_DEFAULT_DOMAIN=example.com
NODE_ENV=development

# Supabase (headless CMS)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...
SUPABASE_STORAGE_BUCKET=media

# OpenAI & Anthropic
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...

# Embeddings (OpenAI)
EMBEDDINGS_MODEL=text-embedding-3-large

# Web search / trends
TAVILY_API_KEY=...    # or SERPAPI_API_KEY=...

# Email
RESEND_API_KEY=...

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXX

# Amazon Associates
AMAZON_PA_API_ACCESS_KEY=...
AMAZON_PA_API_SECRET_KEY=...
AMAZON_PA_API_PARTNER_TAG=jmpkc01-20
AMAZON_PA_API_PARTNER_TYPE=Associates
AMAZON_PA_API_LOCALE=US

# Optional additional affiliate programs (future-ready)
WALMART_PARTNER_ID=...
TARGET_PARTNER_ID=...
BESTBUY_API_KEY=...

# Reddit read-only
REDDIT_APP_ID=...
REDDIT_APP_SECRET=...
REDDIT_USER_AGENT=affiliate-suite/1.0

# Webhooks (Make.com)
MAKE_BLOG_WEBHOOK_SECRET=...
MAKE_PRODUCT_WEBHOOK_SECRET=...
MAKE_IMAGE_WEBHOOK_SECRET=...

# Queues (Upstash Redis, optional)
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## 3) Supabase (Headless CMS) ✅

**Enable**: `pgvector`, `uuid-ossp`. Use RLS with service role in agents/admin.

### Tables (SQL)

* `tenants`: id uuid pk, name, slug, domain, theme jsonb, logo\_url, color\_tokens jsonb, status, created\_at.
* `products`: id uuid pk, tenant\_id fk, asin, title, brand, images jsonb, features jsonb, rating, review\_count, price\_snapshot text, currency, category, subcategory, device\_type, compatibility jsonb, regulatory\_notes text, health\_metrics text\[], battery\_life\_hours numeric, water\_resistance text, affiliate\_url text, source text default 'amazon', last\_verified\_at timestamptz, raw jsonb.
* `posts`: id uuid pk, tenant\_id fk, type enum(`howto|listicle|answer|review|roundup|alternative|evergreen`), title, slug, excerpt, body\_mdx text, images jsonb, status enum(`draft|scheduled|published`), published\_at, seo jsonb, jsonld jsonb.
* `links`: id uuid pk, tenant\_id fk, target\_url, target\_type enum(`product|post|outbound`), status\_code int, ok boolean, checked\_at.
* `quiz`: id uuid pk, tenant\_id fk, title, schema jsonb, active boolean.
* `quiz_results`: id uuid pk, tenant\_id fk, answers jsonb, segments text\[], recommended\_product\_ids uuid\[], email text, created\_at.
* `subscribers`: id uuid pk, tenant\_id fk, email unique, status enum(`active|unsubscribed|bounced`), source text, unsub\_token text.
* `kb`: id uuid pk, tenant\_id fk, kind enum(`doc|faq|policy|guide`), title, content text.
* `agent_tasks`: id uuid pk, tenant\_id fk, agent text, input jsonb, status enum(`queued|running|done|error`), result jsonb, created\_at, completed\_at.
* `taxonomy`: id uuid pk, tenant\_id fk, kind enum(`vertical|horizontal`), name, slug, parent\_id uuid nullable, path ltree, meta jsonb.
* `insights`: id uuid pk, tenant\_id fk, kpi text, value numeric, window text, meta jsonb, computed\_at.
* `calendar`: id uuid pk, tenant\_id fk, item\_type enum(`post|newsletter|social|agent`), ref\_id uuid nullable, title, status enum(`planned|scheduled|published|done|blocked`), run\_at timestamptz, meta jsonb.
* `embeddings`: id uuid pk, tenant\_id fk, ref\_table text, ref\_id uuid, content text, embedding vector(3072).

**RLS**: allow service role full access; anon read public storefront tables where `status='published'`.

**Storage**: bucket `media` for images (posts/products).

**Edge Functions** (`infra/supabase/functions`):

* `ingest-post` (Make.com)
* `ingest-product` (Make.com)
* `ingest-images` (Make.com)
* `run-agent` (invoke sub-agents)
* `schedule-tick` (drives calendar → tasks)
* `link-verify` (nightly)
* `embeddings-index` (refresh vectors)
* Each function validates HMAC secrets where applicable.

**Scheduled Functions**: daily/weekly/hourly triggers mapped to the above.

---

## 4) Onboarding Quiz/Wizard (Admin -> “Create Site”) ✅

Goal: capture enough to **auto-scaffold** a niche site.

**Steps**

1. Basics: Niche name, domain/subdomain, region, target audience, tone.
2. Monetization: Affiliate programs used; **Amazon tag default `jmpkc01-20`**; add more IDs.
3. Content Inputs: paste 3–10 **seed product links/ASINs**, 2–5 competitor URLs, 5–10 keywords.
4. Brand: pick palette, logo upload or AI-generated placeholder, hero style (photo/illustration/minimal).
5. Cadence & Goals: weekly posts, reviews, social cadence, newsletter frequency, **monthly click & CTR goals**.
6. API Keys: OpenAI, Anthropic, Supabase, Search (Tavily/Serp), Resend, Reddit.
7. Compliance: add affiliate disclosure, privacy & terms templates.
8. Generate: preview + confirm.

**Output**

* Create `tenant`.
* Build **taxonomy** (vertical & horizontal) from keywords + competitors.
* Import **seed products** via PA-API.
* Generate **10 seed posts** across templates (How-To, Listicle, Answer, Review, Roundup, Alternative, Evergreen).
* Set up **quiz**, **newsletter**, **holiday theme rule**, **calendar** for the next 30 days.
* Index embeddings for chatbot.

---

## 5) Theming & UX (Woodstock-inspired) ✅

* Tailwind + tokens: elegant cards, airy spacing, soft shadows, neutral palette.
* Storefront: Home, Category, Product Detail (affiliate CTAs), Blog Index, Post, Quiz, About, Privacy, Terms, Contact.
* Components: `NavMegaMenu`, `ProductCardPremium`, `HolidayBanner`, `StickyCTA`, `MasonryGrid`, `QuizDrawer`, `NewsletterBar`, `ComparisonTable`, `CopyButton`, `InsightsPanel`.

---

## 6) Storefront Rules ✅

* **Products**: show specs, metrics tags, compatibility chips, pros/cons if known, “Buy on Amazon” button with tag.
* **Posts**: MDX, **5–7 real images**, TOC, internal/external links, JSON-LD Article, FAQ (5–6 Qs).
* **Quiz**: returns 3–5 recommended products; email results if subscribed.
* **SEO**: optimized meta; sitemaps; robots; OG.
* **Accessibility**: WCAG 2.2 AA.

---

## 7) Admin (Shopify-like) — now with **Insights + Calendar + Scheduling + Copy** ✅

* **Dashboard**: Sessions (GA4), clicks to Amazon, CTR, top posts/products, growth vs. goal, broken links, agent tasks, “what to do next” cards (actionable insights).
* **Insights** (auto-computed to plain English + button to act):

  * “Post A drives clicks but low CTR on mobile → add top-of-post CTA?”
  * “Rising subreddit thread on \[topic] → draft answer post?”
  * “Two products out of stock frequently → add alternatives roundup.”
* **Content Calendar**: month/week views for posts, social, newsletters, agent runs. Drag to reschedule.
* **Scheduling**: schedule publish, social, newsletter; respects time zone.
* **Products**: import ASINs, enrich, tag, map to taxonomy.
* **Posts**: MDX editor, insert product cards, comparison tables, JSON-LD; **Copy** buttons for titles, meta, excerpts, CTAs.
* **Quiz Builder**: questions/logic → segments → recs.
* **Newsletter**: templates, segments (quiz + behavior), schedule, performance.
* **Agents**: run/pause, set goals, review logs.
* **Link Monitor**: nightly verify; auto-fix missing tags.
* **Webhooks**: show Make.com endpoints; test + replay.
* **KB**: policies, FAQs, guides (for chatbot).

---

## 8) Blog Template System (auto + manual) ✅

Types: `howto | listicle | answer | review | roundup | alternative | evergreen`.

Rules for **all** content:

* Clear, direct, simple. No hype. No clichés. No emojis.
* 4–6 H2s, 1–2 H3s per H2.
* **2024–2025 stats** + **1–2 expert quotes** with links.
* **3–8 internal** and **2–5 external** links.
* **5–7 images** per post with alt text.
* JSON-LD Article.
* Short CTA that **invites reading more** and exploring recommended products (no pricing).

---

## 9) Taxonomy Builder (Vertical + Horizontal) ✅

* **Vertical** (by device type, use cases): e.g., Smartwatches → ECG, Sleep, Runners; BP → Bluetooth cuffs; Sleep Tech; etc.
* **Horizontal** (by platform/compatibility, budget tiers, battery life, water rating, comfort, portability).
* Use onboarding keywords + competitor sitemaps + Reddit trends to propose a tree.
* Expose in Admin for edits; auto-map new products to best-fit nodes.

---

## 10) Agents ✅

**One OrchestratorAgent** (per tenant)

* Owns goals (clicks, CTR, traffic growth).
* Plans weekly sprint; assigns tasks; reviews insights; updates calendar; sends report.

**Sub-agents**

1. **ProductAgent**: PA-API ingest/enrich; ensures affiliate tags; adds 5+ items/week; maps taxonomy.
2. **ReviewAgent**: honest reviews; pros/cons; alternatives; aggregated **sentiment summary** from credible sources (no scraping user reviews verbatim).
3. **EditorialAgent**: generates posts by templates; adds stats/quotes; builds TOC, links, JSON-LD.
4. **ImageAgent**: sources royalty-free images (Supabase Storage), compresses, alt text.
5. **SocialAgent**: captions + images; posts to Make.com; schedules via calendar.
6. **SeasonalAgent**: holiday banners/colors on date rules.
7. **LinkVerifierAgent**: nightly HEAD checks; retries; records status; auto-fixes Amazon tag.
8. **NewsletterAgent**: weekly roundup; segments by quiz results; tracks open/click.
9. **PersonalizationAgent**: iterates quiz logic; A/B tests; updates recommendations.
10. **ChatbotAgent**: RAG over posts/products/KB; cautious web search fallback; cites sources.
11. **TrendsAgent**: mines Reddit + web trends; proposes topics; adds to calendar with suggested outlines.
12. **AdManagerAgent** (optional): manages house ad slots or toggled AdSense/partner tags; ensures CLS safe; caps density.

**Scheduling**

* **Supabase Scheduled Functions** or **Vercel Cron**:

  * Hourly: Editorial drafts, Trends mining, Make sync
  * Nightly: Link verify, Product refresh, Embeddings index
  * Weekly: Newsletter, Theme pass, KPI roll-up, Goal check

---

## 11) APIs & Integrations ✅

* **Amazon PA-API v5** (no scraping). Always append `tag=jmpkc01-20`.
* **Make.com** (signed webhooks) for posts/products/images.
* **Reddit API** read-only for FAQs + hot topics.
* **Web Search** (Tavily/SerpAPI) for recent stats/quotes; store sources in post frontmatter.
* **GA4** for events: `outbound_click_amazon`, `product_card_view`, `quiz_started`, `quiz_completed`, `newsletter_subscribed`, `post_read_75`, `cta_click_post`, `cta_click_hero`.

---

## 12) Edge Functions (Supabase) — endpoints & payloads ✅

* `POST /ingest-post` (HMAC: `MAKE_BLOG_WEBHOOK_SECRET`)

```
{
  "tenantSlug": "my-niche",
  "sourceId": "uuid-or-slug",
  "type": "howto|listicle|answer|review|roundup|alternative|evergreen",
  "title": "...",
  "slug": "kebab",
  "excerpt": "...",
  "bodyMdx": "...",
  "images": [{"url":"https://...","alt":"..."}],
  "internalLinks": ["slug-or-url"],
  "externalLinks": ["https://..."],
  "products": ["ASIN1","ASIN2"],
  "seo": {"title":"...","description":"..."},
  "jsonLd": {...},
  "publish": true
}
```

* `POST /ingest-product` (HMAC: `MAKE_PRODUCT_WEBHOOK_SECRET`)

```
{ "tenantSlug": "my-niche", "asin": "B0XXXXX", "override": false }
```

* `POST /ingest-images` (HMAC: `MAKE_IMAGE_WEBHOOK_SECRET`)

```
{ "tenantSlug": "my-niche", "postSlug": "kebab", "images": [ ... ] }
```

* `POST /run-agent` → `{ "tenantSlug": "...", "agent": "EditorialAgent", "input": {...} }`
* `POST /schedule-tick` → processes `calendar` rows whose `run_at <= now()`.

---

## 13) Chatbot (Docked bubble) ✅

* RAG over `posts`, `products`, `kb` (Supabase `embeddings` via pgvector).
* If low confidence: narrow web search → add citations.
* Allowed: answer Qs, compare products, suggest posts, email quiz results (with consent).
* Guardrails: no medical/financial/legal advice; show disclaimers.

---

## 14) Privacy, Terms, Disclosures ✅

* Generate **Privacy Policy**, **Terms**, **Affiliate disclosure** (footer + on product/review pages above fold).
* For health-related niches: medical disclaimer.

---

## 15) Admin “Copy/Paste Everywhere” ✅

* One-click **Copy** buttons for: titles, meta, excerpts, CTAs, social captions, schema JSON-LD, newsletter blocks, comparison tables.

---

## 16) CLI (Codex) Tasks ✅

```
pnpm exec site init-tenant --name "Nectar & Heat" --domain nectarheat.com --theme "woodstock-light"
pnpm exec site onboard --tenant nectarheat           # runs the onboarding wizard from CLI (prompts)
pnpm exec site seed --tenant nectarheat --posts 10
pnpm exec site import-products --tenant nectarheat --asin-file asins.csv
pnpm exec site run-agent --tenant nectarheat --agent OrchestratorAgent
pnpm exec site verify-links --tenant nectarheat
```

---

## 17) Acceptance Criteria ☐

* Onboarding wizard captures niche, IDs, keys, seed products, brand, cadence, goals → generates tenant, taxonomy, quiz, newsletter, pages, **10 seed posts** (5–7 images each), at least **12 products** with affiliate tags.
* Admin shows **Insights** with direct actions, **Calendar** with drag-to-schedule, **Copy** buttons, and agent control.
* Storefront fast, mobile-first, accessible, **Woodstock-inspired**.
* All Amazon outbound links include `tag=jmpkc01-20`.
* Chatbot answers with sources; quiz personalizes picks; newsletter schedules and sends.
* Link monitor: 0 broken affiliate links after nightly pass.
* Supabase: RLS on; vectors indexed; Edge Functions deployed and scheduled.
* Deployable on Vercel with envs set; Supabase as single source of truth.

---

## 18) Generate Now ✅

* Write all code (Next.js App Router + TS), Supabase SQL (schema, RLS, triggers), Edge Functions, admin UI, agents, queues, tests (Vitest/Playwright), CI, seeders, and deployment docs (Vercel + Supabase).
* Provide step-by-step setup: create Supabase project, enable pgvector, run SQL, set env vars, upload Storage bucket, deploy Edge Functions, set Vercel cron/schedules, and publish.
* Ship sample tenant “**Nectar & Heat**” and a second sample from the onboarding wizard to prove multi-tenant flow.

