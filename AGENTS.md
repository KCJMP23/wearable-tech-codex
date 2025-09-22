# Repository Guidelines

## Project Structure & Module Organization
This monorepo uses pnpm workspaces (see `pnpm-workspace.yaml`). Feature apps live under `apps/`: `web` (Next.js 15 storefront), `worker` (background orchestration), and `mobile` (React Native shell). Shared domain logic, integrations, and UI kits are in `packages/` (for example `packages/sdk`, `packages/ui`, `packages/ai-optimizer`). Deployment and infrastructure assets sit in `infra/` and `deploy/`, while cross-cutting E2E specifications reside in `tests/`. Agent prompt libraries and operating guides remain in the root Markdown files (`AI_AGENTS_CONFIGURATION.md`, `NEXT_CHAT_PROMPT.md`).

## Build, Test, and Development Commands
Run `pnpm install` once to hydrate workspaces. Use `pnpm dev` for the main web experience (`pnpm --filter web dev` is invoked under the hood). Ship-ready bundles come from `pnpm build`, which fans out with Turbo across all packages. Quality gates include `pnpm lint`, `pnpm typecheck`, and `pnpm test`. Scenario-specific helpers: `pnpm test:unit` (Vitest), `pnpm test:e2e` (Playwright), and `pnpm format` (Prettier write mode).

## Coding Style & Naming Conventions
TypeScript is required everywhere; keep files typed strictly and colocate declarations with features (e.g. `packages/sdk/src` helpers, `apps/web/app` routes). Follow Prettier defaults (2-space indent, single quotes in TSX) and Next.js ESLint rules; let the configured Husky hook run lint-staged before commits. Name React components in PascalCase, hooks in camelCase starting with `use`, and GraphQL schema/modules using the `*.schema.ts` pattern already present in `apps/web`.

## Testing Guidelines
Write unit tests beside the code under test using `*.spec.ts` and execute them with `pnpm test:unit`. End-to-end journeys belong in `tests/`—mirror existing Playwright specs like `tests/critical-user-journey.spec.ts` and reuse shared utilities in `tests/playwright`. When adding major features, extend smoke coverage to include login, checkout, and agent orchestration flows. Keep Supabase or external keys mocked via `.env.test` overrides; never embed secrets directly in specs.

## Commit & Pull Request Guidelines
Follow the conventional, emoji-prefixed style visible in `git log` (e.g. `✨ feat: Add wearable insights dashboard`). Each PR should: describe scope and rationale, link relevant issues or specs, include screenshots for UI work, and summarize test evidence (`pnpm test` or targeted suites). Draft PRs are welcome while iterating, but convert to ready-for-review only after lint, type-check, and automated tests succeed.

## Environment & Security Notes
Start from `.env.example` and layer app-specific overrides such as `apps/web/.env.local` and `apps/worker/.env`. Guard API keys—use the secrets managers referenced in `DEPLOYMENT.md` and ensure rate limiting stays enabled (`graphql-rate-limit`, `rate-limiter-flexible` configs). Agents that call external services must surface configuration changes in `AI_AGENTS_CONFIGURATION.md` so the orchestration layer remains consistent.
