# 🔧 Hardcoded References to Remove
**Total Files Affected**: 131 files contain hardcoded wearable/fitness references

## Priority 1: Core Application Files (MUST FIX)

### 1. Onboarding System
**File**: `apps/web/app/onboarding/page.tsx`
- Remove hardcoded categories: "Smartwatches", "Fitness Trackers", etc.
- Replace with dynamic text input field
- Add "What would you like to build?" open question

**File**: `apps/web/components/OnboardingQuiz.tsx`
- Remove wearable-specific questions
- Add niche-agnostic questions
- Enable free text responses

**File**: `apps/web/app/api/onboarding/route.ts`
- Remove hardcoded product types
- Accept any niche as input
- Dynamically generate categories

### 2. Product Components
**File**: `apps/web/components/ProductDetailLayout.tsx`
- Remove "fitness tracker" default labels
- Use product.category dynamically
- Remove wearable-specific attributes

**File**: `apps/web/components/TrendingWearables.tsx`
- Rename to `TrendingProducts.tsx`
- Remove "Wearables" from title
- Make category dynamic based on tenant

**File**: `apps/web/components/WoodstockNavigation.tsx`
- Remove hardcoded menu items (Smartwatches, Fitness Trackers)
- Load categories from database
- Make navigation dynamic

### 3. Homepage Components
**File**: `apps/web/app/(site)/[tenantSlug]/page.tsx`
- Remove "Wearable Tech" from hero section
- Use tenant.niche for titles
- Remove fitness-specific CTAs

**File**: `apps/web/components/DynamicCategories.tsx`
- Load categories from tenant settings
- Remove hardcoded category cards
- Enable custom category creation

**File**: `apps/web/components/HealthInsights.tsx`
- Rename to `ProductInsights.tsx`
- Remove health-specific metrics
- Make insights niche-agnostic

### 4. Admin Pages
**File**: `apps/web/app/(admin)/admin/[tenantSlug]/page.tsx`
- Remove "Wearable Tech Admin" title
- Use tenant name dynamically
- Remove fitness-specific dashboards

**File**: `apps/web/app/(admin)/admin/[tenantSlug]/analytics/page.tsx`
- Remove hardcoded products (Apple Watch, Fitbit)
- Load actual tenant products
- Make metrics niche-agnostic

### 5. Database & Config
**File**: `supabase/config.toml`
- Remove wearable-specific configurations
- Make settings generic

**File**: `infra/supabase/sql/seed-tenants.sql`
- Remove default wearable tenant
- Add example tenants for different niches

## Priority 2: Content & Prompts

### 6. AI Agent Prompts
**File**: `packages/content/prompts/onboardingPrompts.ts`
- Remove wearable-specific prompts
- Add dynamic niche placeholders
- Make prompts adaptable

**File**: `apps/worker/src/agents/productAgent.ts`
- Remove fitness tracker defaults
- Accept any product type
- Dynamic attribute generation

**File**: `apps/worker/src/agents/editorialAgent.ts`
- Remove wearable content templates
- Create niche-agnostic templates
- Dynamic topic generation

### 7. Mobile App
**File**: `apps/mobile/src/constants/Config.ts`
- Remove "Wearable Tech Codex" name
- Use dynamic app name
- Remove fitness-specific features

**File**: `apps/mobile/app/(tabs)/index.tsx`
- Remove wearable categories
- Load from API dynamically
- Generic product display

## Priority 3: Seeds & Scripts

### 8. Seed Data
**File**: `scripts/seed-sample-content.ts`
- Remove Apple Watch, Fitbit seeds
- Add example products for multiple niches
- Make seeds configurable

**File**: `infra/supabase/seeds/blog_content.sql`
- Remove fitness tracker articles
- Add generic content examples
- Support multiple niches

### 9. Test Files
**File**: `apps/web/e2e/no-hardcoded-content.spec.ts`
- Update tests to check for flexibility
- Test multiple niche scenarios
- Ensure no hardcoding

## Search & Replace Commands

### Global Replacements Needed:
```bash
# Find all instances
grep -r "wearable" --include="*.ts" --include="*.tsx" 
grep -r "smartwatch" --include="*.ts" --include="*.tsx"
grep -r "fitness tracker" --include="*.ts" --include="*.tsx"
grep -r "Apple Watch" --include="*.ts" --include="*.tsx"
grep -r "Fitbit" --include="*.ts" --include="*.tsx"

# Replace examples (use with caution)
# "Wearable Tech" → {tenant.niche}
# "wearables" → {tenant.product_type}
# "fitness tracker" → {product.category}
# "smartwatch" → {product.type}
```

## Configuration Changes

### Environment Variables
Add to `.env.local`:
```env
# Remove
NEXT_PUBLIC_SITE_NAME="Wearable Tech Codex"
NEXT_PUBLIC_DEFAULT_NICHE="wearables"

# Add
NEXT_PUBLIC_PLATFORM_NAME="AffiliateOS"
NEXT_PUBLIC_MULTI_TENANT=true
```

### TypeScript Interfaces
```typescript
// OLD (Remove)
interface Product {
  type: 'smartwatch' | 'fitness_tracker' | 'health_monitor';
  // ...
}

// NEW (Add)
interface Product {
  type: string; // Any product type
  category: string; // Dynamic category
  niche: string; // From tenant
  // ...
}
```

## Database Schema Updates

```sql
-- Add to tenants table
ALTER TABLE tenants 
ADD COLUMN niche TEXT,
ADD COLUMN product_types TEXT[],
ADD COLUMN categories JSONB DEFAULT '[]';

-- Remove hardcoded constraints
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS products_type_check;

-- Make categories dynamic
CREATE TABLE tenant_categories (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  parent_id UUID REFERENCES tenant_categories(id)
);
```

## UI Component Updates

### Before:
```tsx
<h1>Best Fitness Trackers of 2024</h1>
<CategoryCard title="Smartwatches" />
<ProductCard type="fitness-tracker" />
```

### After:
```tsx
<h1>Best {tenant.product_type} of 2024</h1>
<CategoryCard title={category.name} />
<ProductCard type={product.type} />
```

## Verification Checklist

- [ ] No "wearable" in non-documentation files
- [ ] No "fitness tracker" in UI components
- [ ] No "smartwatch" in navigation
- [ ] No "Apple Watch" as defaults
- [ ] No "Fitbit" in seed data
- [ ] Categories load from database
- [ ] Products accept any type
- [ ] Onboarding accepts any niche
- [ ] Navigation is dynamic
- [ ] Admin shows tenant-specific data

## Testing After Changes

```bash
# Run tests to ensure no hardcoding
pnpm test:unit
pnpm test:e2e

# Test with different niches
- Create "Pet Supplies" site
- Create "Home Decor" site  
- Create "Golf Equipment" site
- Create "Vintage Cameras" site

# Verify each site shows correct:
- Navigation categories
- Product types
- Content themes
- Admin dashboard
```

## Success Criteria

✅ Platform works for ANY niche
✅ No wearable references in core code
✅ Dynamic categories everywhere
✅ Flexible product types
✅ Niche-agnostic AI agents
✅ Generic onboarding flow
✅ Multi-niche seed data
✅ Platform-first routing