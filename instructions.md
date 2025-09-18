You are the **Orchestrator Agent** for our multi-tenant affiliate platform. Create a full tenant for **wearables & smart medical devices** that showcases **smartwatches, trackers, rings, blood pressure cuffs, smart scales, sleep devices, ECG/medical-grade devices, apps, and accessories**. Use the existing code architecture described previously (Next.js App Router + TS, Tailwind, Prisma/Postgres, Vercel, Upstash/queues, UploadThing, Resend, GA4, MDX, ISR). Keep the **Woodstock (light)-inspired** look (https://woodstock-theme-light.myshopify.com/). No checkout. Amazon Associates only.

## 0) Tenant bootstrap

* Create a new tenant:

  * **name**: Wearable Health Lab
  * **slug**: wearable-health-lab
  * **domain**: wearablehealthlab.com
  * **theme**: “woodstock-light” with subtle medical accents (cool neutrals, clean cards, generous whitespace)
  * **affiliate**: Amazon Associates, `AMAZON_ASSOCIATES_TAG=jmpkc01-20`
* Seed pages: Home, Categories, Blog, Quiz, Newsletter, About, Privacy, Terms, Contact.
* Footer notice: clear affiliate disclosure and medical disclaimer (“informational, not medical advice”).

## 1) Information architecture (categories & navigation)

Create top-level categories and routes:

* **Smartwatches** (Apple Watch, Wear OS, Garmin, Galaxy Watch, Withings, etc.)
* **Fitness Trackers** (Fitbit, Garmin, Amazfit, Xiaomi)
* **Smart Rings** (Oura, Ultrahuman, RingConn)
* **Blood Pressure Cuffs** (FDA-cleared home BP monitors, Bluetooth, app-connected)
* **Smart Scales** (Withings, Eufy, Wyze, Fitbit)
* **Sleep Tech** (rings, headbands, mats, smart alarms)
* **ECG & Medical-grade** (single-lead ECG, 6-lead, SpO2, AFib alerts)
* **Apps & Integrations** (Apple Health, Google Fit, Health Connect, Garmin Connect, Strava, Sleep Cycle)
* **Accessories** (bands, chargers, screen protectors, travel cases)

Each category gets: hero, filters, featured collections, top guides, top products.

## 2) Product model (Prisma)

Use the existing `Product` schema. Ensure fields to capture **medical claims flags**, **regulatory notes** (e.g., “FDA 510(k) cleared”), and **compatibility**:

* Add product metadata keys:

  * `deviceType` (watch|tracker|ring|bp\_cuff|scale|sleep|ecg|accessory|app)
  * `compatibility` (iOS, Android, Apple Health, Google Fit, Health Connect, Garmin Connect)
  * `regulatoryNotes` (free text; e.g., “FDA 510(k) cleared for BP measurement”)
  * `healthMetrics[]` (ECG, HRV, SpO2, BP, body fat %, temp, VO2max, AFib alert, sleep stages)
  * `batteryLifeHours` (number)
  * `waterResistance` (ATM/IP rating)

## 3) Quiz → Personalization

Create a **Wearable Finder** quiz:

* Questions (single/multi):

  1. What phone do you use? (iPhone, Android)
  2. Top goals? (heart health/ECG, weight, sleep, endurance training, daily steps, BP tracking)
  3. Must-have metrics? (ECG, BP, SpO2, HRV, GPS, body fat %, temp)
  4. Battery priority? (doesn’t matter | 1–2 days | 3–5 days | 6+ days)
  5. Budget? (<\$100, \$100–199, \$200–399, \$400–699, \$700+)
  6. Form factor? (watch, tracker, ring, no preference)
  7. Water & ruggedness? (swim safe, trail/rugged, sweat only)
* Segments:

  * **Heart Focus (ECG/AFib)**
  * **BP at Home**
  * **Sleep First**
  * **Runner/Endurance**
  * **Lifestyle & Steps**
  * **Budget Essentials**
* Output: 3–5 recommended products + 2 related posts; email results if they subscribe.

## 4) Newsletter

* Weekly **Wearable Brief**:

  * Section 1: New gear & price drops
  * Section 2: Feature deep-dive (metric explained—HRV, VO2max, SpO2)
  * Section 3: Community questions (from chatbot/quiz)
  * Section 4: Top guides and reviews
* Segmentation by quiz results and click history.

## 5) Ingest the **52 blog posts** (from prior conversation) via Make.com

Implement **Make.com** inbound webhooks (signed) for bulk import. Create/confirm these endpoints:

* `POST /api/webhooks/make/posts`  (secret: `MAKE_BLOG_WEBHOOK_SECRET`)
* `POST /api/webhooks/make/images` (secret: `MAKE_IMAGE_WEBHOOK_SECRET`)
* `POST /api/webhooks/make/products` (secret: `MAKE_PRODUCT_WEBHOOK_SECRET`)

### Webhook payload schema — Posts

```
{
  "tenantSlug": "wearable-health-lab",
  "sourceId": "external-uuid-or-slug",
  "type": "howto|listicle|answer|review|roundup|alternative|evergreen",
  "title": "string",
  "slug": "kebab-case",
  "excerpt": "string",
  "bodyMdx": "string (MDX)",
  "images": [
    {"url": "https://...", "alt": "string"}
  ],
  "internalLinks": ["slug-or-url", "..."],
  "externalLinks": ["https://credible-source-1", "..."],
  "products": ["ASIN1", "ASIN2"],
  "seo": {"title": "string", "description": "string"},
  "jsonLd": { ...Article schema... },
  "publish": true
}
```

* On import:

  * Validate **5–7 images** per post; if fewer, queue **ImageAgent** to fill from Pexels/Unsplash and add proper alt text.
  * Ensure **TOC with jumplinks** for how-to and listicles.
  * Auto-insert **3–8 internal** and **2–5 external** links if missing.
  * Enforce writing style rules (clarity, no fluff/marketing, active voice).
  * Attach **Amazon affiliate tag** to product CTAs.
  * Generate/patch **JSON-LD Article**.
  * Schedule ISR revalidation.

### Webhook payload schema — Products

```
{
  "tenantSlug": "wearable-health-lab",
  "asin": "B0XXXXXX",
  "override": false
}
```

* `ProductAgent` enriches from **PA-API v5** and guarantees `tag=jmpkc01-20` on all outbound links.

### Webhook payload schema — Images

```
{
  "tenantSlug": "wearable-health-lab",
  "postSlug": "kebab-case",
  "images": [{"url":"https://...", "alt":"..."}]
}
```

## 6) Auto-seed structure for the 52 posts

* Place each prior post into one of these buckets:

  * **Evergreen** (device fundamentals, metric guides)
  * **How-To** (setups, integrations, troubleshooting, best-practice routines)
  * **Listicles** (best watches for ECG, best rings for sleep, best budget trackers, etc.)
  * **Answer** (e.g., “Do smartwatches measure BP accurately?”, “What’s HRV?”)
  * **Product Reviews** (honest, pros/cons, pricing snapshot, bottom line, alternatives)
  * **Roundups** (BP cuffs, scales, sleep trackers by budget, platform, use case)
  * **Alternatives** (e.g., “Apple Watch alternatives for ECG”)
* For each post:

  * Pull **2024–2025** stats and **1–2 expert quotes** (with links).
  * Enforce structure (4–6 H2s, 1–2 H3 per H2).
  * Add an FAQ (5–6 Qs) based on AlsoAsked/AnswerSocrat topics for that post.
  * Add **clear calls to action** that invite readers to read related content or explore recommended devices (no hype).

## 7) Storefront UX details

* Home:

  * Hero with **Wearable Finder** CTA.
  * Featured: “ECG & Heart Health,” “BP at Home,” “Sleep Better,” “Budget Picks.”
  * Latest reviews and guides.
  * Newsletter strip.
* Category pages:

  * Facets: platform compatibility, metrics, battery, water rating, price.
  * Comparison tables (generated by **EditorialAgent**) for top 5 items.
* Product detail:

  * Specs grid, metrics tags, compatibility chips.
  * Pros/Cons (if available), price note (“check live price”).
  * Prominent “Buy on Amazon” button (tagged).
  * Related posts.
* Blog post:

  * TOC, scannable sections, product cards inline, 5–7 images, FAQ, JSON-LD.

## 8) Admin (Shopify-like)

* Dashboard KPIs:

  * Sessions (GA4), outbound clicks → Amazon, CTR, newsletter subs, quiz starts/completions, top posts/products, broken links, agent tasks.
* Products:

  * Import ASINs, bulk enrich, compatibility/metrics tagging, regulatory notes.
* Posts:

  * MDX editor with “Insert Product Card” and “Insert Comparison Table.”
  * **Post Generator** presets for all wearables templates.
* Quiz Builder:

  * Manage questions/logic; map to segments; preview result sets.
* Newsletter:

  * Prebuilt **Wearable Brief** template; segment by quiz results; schedule.
* Agents:

  * Run/stop per tenant; view logs; set monthly goals (clicks, CTR, posts, products).
* Link Monitor:

  * Verify affiliate links nightly; auto-fix missing tags; flag 404/timeout.
* Webhooks:

  * Show Make.com endpoints + secrets; test & replay deliveries.

## 9) Agents & schedules (tenant-scoped)

* **OrchestratorAgent** (weekly sprint plan; target: +15% MoM clicks; +8% CTR in 60 days)
* **ProductAgent** (daily PA-API refresh; ensure fresh prices/ratings; add 5 new devices/week)
* **ReviewAgent** (2 honest reviews/week; cite sources; images of use or simulated “in-context” shots)
* **EditorialAgent** (3 posts/week across templates; insert stats/quotes; JSON-LD; internal/external links)
* **ImageAgent** (fill 5–7 images/post; compress; alt text)
* **SocialAgent** (auto captions + hero images; POST to Make.com)
* **SeasonalAgent** (holiday banner + subtle palette changes on schedule)
* **LinkVerifierAgent** (nightly; retries with backoff; ensure `tag=jmpkc01-20`)
* **NewsletterAgent** (weekly Wearable Brief)
* **PersonalizationAgent** (optimize quiz logic and segment mappings; A/B test questions)
* **ChatbotAgent** (RAG over KB/Posts/Products; controlled web search fallback; cites sources)

**Vercel Cron**:

* Hourly: Editorial drafts, Reddit topic mining (read-only), Make sync
* Nightly: Link verify, product refresh, KB re-index
* Weekly: Newsletter, theme pass, KPI roll-up

## 10) Compliance & disclosures

* Page in footer: **Affiliate Disclosure** + **Medical Disclaimer**.
* On product and review pages: short top-notice disclosure.
* Amazon compliance: no scraping; display price as “current at time of publish” and link to live price.

## 11) GA4 events

Track: `outbound_click_amazon`, `product_card_view`, `quiz_started`, `quiz_completed`, `newsletter_subscribed`, `post_read_75`, `cta_click_post`, `cta_click_hero`.

## 12) CLI & seeding

Expose commands:

```
pnpm exec site init-tenant --name "Wearable Health Lab" --domain wearablehealthlab.com --theme "woodstock-light"
pnpm exec site seed-tenant --tenant wearable-health-lab --posts 10
pnpm exec site import-products --tenant wearable-health-lab --asin-file wearables_asins.csv
pnpm exec site ingest-posts --tenant wearable-health-lab --from-make --count 52
pnpm exec site run-agent --tenant wearable-health-lab --agent OrchestratorAgent
pnpm exec site verify-links --tenant wearable-health-lab
```

**Important**: For the **52 posts** you referenced, expect Make.com to POST each as per the schema in §5. Preserve slugs/titles; don’t rewrite unless `allowRewrite: true` is set.

## 13) Acceptance criteria (niche ready)

* Tenant live at `wearablehealthlab.com` with:

  * Categories, quiz, newsletter, Privacy/Terms/Disclosures.
  * **All 52 posts** ingested with 5–7 images each, TOC, FAQs, JSON-LD, internal/external links.
  * ≥24 products enriched from PA-API with **`tag=jmpkc01-20`** on all outbound links.
  * Admin can run agents, import ASINs, publish posts, send newsletter.
  * Chatbot answers common wearable questions, cites site sources, suggests relevant products.
  * Link monitor shows 0 broken affiliate links after verification pass.

---

**Deliverables**: code, Prisma migrations, seeds, API routes, webhooks, admin screens, quiz, newsletter template, agent jobs, cron, tests (Vitest/Playwright), and a deployment doc with env checklist for Vercel, Postgres, Upstash, Resend, UploadThing, GA4, Reddit, PA-API.
