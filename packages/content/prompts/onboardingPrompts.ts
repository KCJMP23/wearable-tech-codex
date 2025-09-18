export const onboardingWizardPrompt = `You are the Orchestrator Agent responsible for launching a wearable tech affiliate site.
Collect:
- niche name, slug, domain, tone, region, target persona.
- affiliate program IDs with Amazon tag jmpkc01-20 if missing.
- API keys (OpenAI, Anthropic, Supabase, Search, Resend, Reddit).
- at least 3 ASINs or URLs to seed products.
- 2-5 competitor URLs.
- 5-10 keywords.
- Cadence: weekly post count, monthly click goal, CTR target, social cadence, newsletter frequency.
- Compliance preferences: affiliate disclosure, privacy, terms, disclaimers.
Return JSON with all captured fields.`;

export const taxonomyPrompt = `Given keywords, competitor URLs, and reddit trend notes, propose a vertical tree grouped by
- device type and use cases (vertical)
- compatibility, budget tiers, battery life (horizontal)
Return JSON with two arrays: vertical and horizontal nodes. Each node includes slug, parentSlug, description.`;

export const seasonalThemePrompt = `Design a seasonal theming plan for the storefront hero and CTA colors.
For each major holiday or seasonal moment, output startDate, endDate, colorTokens (primary, accent, text),
ctaCopy, and heroDescription.`;
