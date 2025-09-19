# 🚀 AffiliateOS Transformation: One-Shot Implementation Prompt

## Mission Brief: Transform "Wearable Tech Platform" → "AffiliateOS"
**Codename**: Project Phoenix - Rising from single-niche ashes to multi-tenant greatness

---

## 📋 MASTER PROMPT FOR CLAUDE

You are about to transform a hardcoded wearable tech platform into **AffiliateOS** - the "Shopify for Affiliate Sites". You will work in 5 phases, leveraging multiple subagents simultaneously, using MCP tools, and performing parallel operations to maximize efficiency. 

**Critical Resources**:
- Follow: `PLATFORM_ENHANCEMENT_PLAN_V2.md` for architecture
- Reference: `HARDCODED_REFERENCES_TO_REMOVE.md` for all 131 files to fix
- Current issues: `PLATFORM_TESTING_REPORT.md` for known problems

**Your Superpowers**:
- Use multiple subagents simultaneously (spring-boot-engineer, typescript-pro, database-optimizer, etc.)
- Execute parallel operations with MCP tools
- Perform web searches for best practices
- Run multiple bash commands in parallel
- Test continuously with automated tools

---

## PHASE 1: Database & Infrastructure Foundation (Day 1)
**Goal**: Fix critical database issues and establish platform architecture
**Subagents**: database-optimizer, sql-pro, spring-boot-engineer (run in parallel)

### Checklist:
- [ ] Create database migration file with ALL schema changes:
  ```sql
  -- File: supabase/migrations/006_affiliateos_transformation.sql
  ALTER TABLE tenants 
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS niche TEXT,
  ADD COLUMN IF NOT EXISTS niche_keywords TEXT[],
  ADD COLUMN IF NOT EXISTS target_audience JSONB,
  ADD COLUMN IF NOT EXISTS affiliate_networks JSONB DEFAULT '[]';
  
  CREATE OR REPLACE VIEW insights_view AS
  SELECT tenant_id, COUNT(*) as total_events FROM analytics_events GROUP BY tenant_id;
  
  CREATE TABLE IF NOT EXISTS platform_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    subscription_tier TEXT DEFAULT 'free'
  );
  
  CREATE TABLE IF NOT EXISTS tenant_categories (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    parent_id UUID REFERENCES tenant_categories(id)
  );
  ```

- [ ] Run migration: `supabase migration up`
- [ ] Test database connectivity with all new tables
- [ ] Create platform routing structure in `apps/web/app/(platform)/`
- [ ] Verify build: `pnpm build` (must pass before proceeding)
- [ ] Commit: "feat(db): AffiliateOS database foundation - Phase 1 complete ✅"

**Parallel Operations**:
1. database-optimizer: Optimize schema design
2. sql-pro: Write migration scripts  
3. spring-boot-engineer: Update entity models
4. Run all simultaneously, merge results

---

## PHASE 2: Remove Hardcoded Wearable References (Day 2)
**Goal**: Make platform niche-agnostic
**Subagents**: typescript-pro, code-reviewer, search-specialist (run in parallel)

### Priority Files to Fix (Top 20):
- [ ] `apps/web/app/onboarding/page.tsx` - Add text input for niche
- [ ] `apps/web/components/OnboardingQuiz.tsx` - Dynamic questions
- [ ] `apps/web/components/TrendingWearables.tsx` → Rename to `TrendingProducts.tsx`
- [ ] `apps/web/components/HealthInsights.tsx` → Rename to `ProductInsights.tsx`
- [ ] `apps/web/app/(site)/[tenantSlug]/page.tsx` - Dynamic hero text
- [ ] `apps/web/components/WoodstockNavigation.tsx` - Dynamic categories
- [ ] `apps/web/app/(admin)/admin/[tenantSlug]/analytics/page.tsx` - Remove hardcoded products
- [ ] `packages/content/prompts/onboardingPrompts.ts` - Niche-agnostic prompts
- [ ] `apps/worker/src/agents/productAgent.ts` - Accept any product type
- [ ] `apps/worker/src/agents/editorialAgent.ts` - Dynamic templates
- [ ] `apps/mobile/src/constants/Config.ts` - Dynamic app name
- [ ] `scripts/seed-sample-content.ts` - Multi-niche seeds
- [ ] `infra/supabase/seeds/blog_content.sql` - Generic content
- [ ] Update remaining 118 files per `HARDCODED_REFERENCES_TO_REMOVE.md`

**Global Search & Replace**:
```bash
# Run these in parallel
grep -r "wearable" --include="*.ts" --include="*.tsx" | wc -l  # Should be 0 after
grep -r "fitness.tracker" --include="*.ts" --include="*.tsx" | wc -l  # Should be 0
grep -r "smartwatch" --include="*.ts" --include="*.tsx" | wc -l  # Should be 0
```

- [ ] Run tests: `pnpm test:unit && pnpm test:e2e`
- [ ] Build check: `pnpm build && pnpm typecheck`
- [ ] Commit: "refactor: Remove all hardcoded wearable references - Phase 2 complete ✅"

---

## PHASE 3: Flexible Onboarding System (Day 3)
**Goal**: AI-powered niche understanding with instant preview
**Subagents**: nextjs-frontend-engineer, ui-ux-designer, prompt-engineer (run in parallel)

### Implementation:
- [ ] Create new onboarding flow at `apps/web/app/(platform)/onboarding/`
- [ ] Implement AI niche analyzer:
  ```typescript
  // apps/web/app/api/analyze-niche/route.ts
  export async function POST(req: Request) {
    const { niche } = await req.json();
    // Use OpenAI to analyze niche
    // Return: categories, audience, affiliate_networks, profit_score
  }
  ```

- [ ] Build instant preview component:
  ```typescript
  // apps/web/components/InstantSitePreview.tsx
  export function InstantSitePreview({ niche }: { niche: string }) {
    // Show live iframe preview as user types
    // Display revenue estimates, competition level
  }
  ```

- [ ] Add flexible import methods:
  - [ ] CSV upload handler
  - [ ] URL scraper
  - [ ] Affiliate API connector
  - [ ] Manual product entry

- [ ] Create onboarding questions:
  1. "What would you like to build?" (free text)
  2. "Do you have existing affiliate relationships?" (multi-select)
  3. "How would you like to add products?" (multiple options)
  4. "Content preferences?" (AI-assisted)

- [ ] Test onboarding with 5 different niches:
  - [ ] Pet supplies
  - [ ] Home decor
  - [ ] Golf equipment
  - [ ] Vintage cameras
  - [ ] Kitchen gadgets

- [ ] Verify build: `pnpm build && pnpm dev`
- [ ] Commit: "feat: AI-powered flexible onboarding - Phase 3 complete ✅"

---

## PHASE 4: Platform Dashboard & Multi-Site Management (Day 4)
**Goal**: Create Shopify-like control center
**Subagents**: nextjs-frontend-engineer, data-engineer, ui-ux-designer (run in parallel)

### Dashboard Components:
- [ ] Create platform dashboard at `apps/web/app/(platform)/dashboard/`
- [ ] Multi-site overview component:
  ```typescript
  // apps/web/components/dashboard/SiteGrid.tsx
  export function SiteGrid({ userId }: { userId: string }) {
    // Display all user's sites
    // Quick actions: Edit, View, Analytics, Delete
    // One-click "Create New Site" button
  }
  ```

- [ ] Cross-site analytics:
  ```typescript
  // apps/web/components/dashboard/CrossSiteAnalytics.tsx
  export function CrossSiteAnalytics({ sites }: { sites: Site[] }) {
    // Aggregate revenue across all sites
    // Show best performing products
    // Network intelligence insights
  }
  ```

- [ ] Implement bulk operations:
  - [ ] Update all products across sites
  - [ ] Apply theme to multiple sites
  - [ ] Export analytics for all sites
  - [ ] Pause/resume multiple sites

- [ ] Add marketplace preview:
  - [ ] Theme gallery
  - [ ] Plugin store
  - [ ] Template library

- [ ] Test dashboard with multiple sites
- [ ] Verify responsive design on mobile
- [ ] Build check: `pnpm build`
- [ ] Commit: "feat: Platform dashboard with multi-site management - Phase 4 complete ✅"

---

## PHASE 5: Launch & Polish (Day 5)
**Goal**: Production-ready platform with billing
**Subagents**: payment-integration, security-auditor, performance-engineer (run in parallel)

### Final Implementation:
- [ ] Stripe billing integration:
  ```typescript
  // apps/web/app/api/billing/route.ts
  // Implement subscription tiers: free, starter ($29), growth ($99)
  ```

- [ ] Security audit:
  - [ ] Implement proper tenant isolation
  - [ ] Add rate limiting
  - [ ] Secure API endpoints
  - [ ] CSRF protection

- [ ] Performance optimization:
  - [ ] Add caching layers
  - [ ] Optimize database queries
  - [ ] Implement CDN
  - [ ] Lazy loading for components

- [ ] Create landing page at `apps/web/app/(platform)/page.tsx`:
  - [ ] Hero: "Build Your Affiliate Empire in 5 Minutes"
  - [ ] Features showcase
  - [ ] Pricing tiers
  - [ ] Testimonials
  - [ ] "Start Free Trial" CTA

- [ ] Documentation:
  - [ ] Update README.md with AffiliateOS branding
  - [ ] API documentation
  - [ ] User guide
  - [ ] Developer docs

- [ ] Final testing:
  - [ ] Create 3 test sites in different niches
  - [ ] Test complete user journey
  - [ ] Load testing with 100 concurrent users
  - [ ] Mobile testing on iOS/Android

- [ ] Production deployment checklist:
  - [ ] Environment variables set
  - [ ] Database migrations run
  - [ ] SSL configured
  - [ ] Monitoring enabled

- [ ] Final build: `pnpm build && pnpm test`
- [ ] Commit: "🚀 AffiliateOS v1.0 - Platform transformation complete! ✅"

---

## 🎯 EXECUTION COMMANDS

```bash
# Run these commands to execute the transformation

# Phase 1 - Database (run in parallel)
pnpm exec task subagent_type=database-optimizer prompt="Optimize schema for multi-tenant SaaS" &
pnpm exec task subagent_type=sql-pro prompt="Create migration scripts for AffiliateOS" &
supabase migration new affiliateos_transformation

# Phase 2 - Remove hardcoding (parallel operations)
pnpm exec task subagent_type=typescript-pro prompt="Remove all wearable references from 131 files" &
pnpm exec task subagent_type=code-reviewer prompt="Verify no hardcoded niches remain" &
grep -r "wearable\|fitness\|smartwatch" --include="*.ts" --include="*.tsx"

# Phase 3 - Onboarding (simultaneous subagents)
pnpm exec task subagent_type=nextjs-frontend-engineer prompt="Build flexible onboarding with AI niche analysis" &
pnpm exec task subagent_type=prompt-engineer prompt="Create niche-agnostic AI prompts" &
pnpm exec task subagent_type=ui-ux-designer prompt="Design instant preview component"

# Phase 4 - Dashboard (parallel development)
pnpm exec task subagent_type=nextjs-frontend-engineer prompt="Create multi-site dashboard" &
pnpm exec task subagent_type=data-engineer prompt="Build cross-site analytics" &
pnpm exec task subagent_type=ui-ux-designer prompt="Design Shopify-like interface"

# Phase 5 - Launch (final parallel tasks)
pnpm exec task subagent_type=payment-integration prompt="Integrate Stripe billing" &
pnpm exec task subagent_type=security-auditor prompt="Audit platform security" &
pnpm exec task subagent_type=performance-engineer prompt="Optimize for 10,000 sites"

# After each phase
pnpm build && pnpm test && git add . && git commit -m "Phase X complete"
```

---

## 🏆 SUCCESS CRITERIA

When complete, AffiliateOS will:
- ✅ Accept ANY niche (not just wearables)
- ✅ Create sites in < 5 minutes
- ✅ Manage unlimited sites from one dashboard
- ✅ Generate $1M ARR within 12 months
- ✅ Support 10,000+ active sites
- ✅ 0 hardcoded references to wearables
- ✅ Pass all tests: `pnpm test:unit && pnpm test:e2e`
- ✅ Build successfully: `pnpm build && pnpm typecheck`

---

## 🚨 IMPORTANT NOTES

1. **Use parallel operations**: Never run tasks sequentially when they can be parallel
2. **Leverage all subagents**: Use specialized agents for their domains
3. **Test after each phase**: Ensure build passes before moving forward
4. **Commit frequently**: After each completed phase for rollback capability
5. **Web search for solutions**: Use search for best practices and solutions
6. **MCP tools**: Use all available MCP servers for enhanced capabilities

**Start Time**: [Current Time]
**Target Completion**: 5 Days
**Expected Outcome**: Complete platform transformation from single-niche to multi-tenant SaaS

---

**EXECUTE TRANSFORMATION NOW! 🚀**