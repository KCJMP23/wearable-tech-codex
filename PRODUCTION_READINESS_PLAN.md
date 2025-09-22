# Production Readiness Plan

This plan decomposes the critical remediation work discovered in the recent assessment into phased, testable milestones. Each phase lists the primary objectives, success criteria, suggested ownership, and cross-cutting dependencies.

## Tooling Recovery Progress – 2024-10-15
- Re-enabled the workspace packages for `@affiliate-factory/{ab-testing,ai-optimizer,email,intelligence}` so `pnpm install` no longer aborts with `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`.
- Established a repo-wide ESLint configuration (`.eslintrc.cjs`) and supporting dependencies, allowing `pnpm lint` to execute across all packages (pending debt remediation in later phases).
- Pointed `packages/ab-testing/tsconfig.json` at the shared base config to ensure `pnpm typecheck` runs without configuration errors; remaining findings are tracked for Phase 3.

### Verification Commands (Phase 1)
```bash
pnpm install
# Progress: resolved 2456, reused 1229, downloaded 1075, added 2, done
```

```bash
pnpm lint
# executes across 10 workspaces; fails with existing lint findings (e.g. packages/ai-optimizer/src/behavior-analyzer.ts:79 no-explicit-any)
```

```bash
pnpm typecheck
# executes across 10 workspaces; surfaces package typing gaps (e.g. packages/ab-testing/src/client-sdk.ts:419 overload mismatch)
```

## Phase 0 – Immediate Guard Rails (Goal: stop data exposure)
- **Status**: 🔄 In progress – token guard live; service-role rotation scheduled with ops.
- **Objectives**
  - ✅ Replace anonymous access with an internal token guard for `/api/commissions`, `/api/experiments`, and `/api/private-marketplace`.
  - Remove service-role usage from public API routes and require authenticated Supabase sessions or signed service-to-service calls.
  - Rotate the `SUPABASE_SERVICE_ROLE_KEY`, limit its distribution to trusted back-end environments, and double-check Supabase RLS defaults.
  - ✅ Document the internal token (`X-Internal-Token` or `Authorization: Bearer`) workflow so automation clients can be updated quickly.
- **Acceptance criteria**
  - ✅ Requests without a valid authenticated user or internal signature return `401/403`.
  - No endpoint instantiates `createServiceClient` directly from a request context.
  - Incident playbook updated with key-rotation steps.
- **Owner**: Platform security + backend team.
- **Duration**: 1–2 days.

## Phase 1 – Auth & Tenant Isolation (Goal: least-privilege APIs)
- **Objectives**
  - Adopt a unified auth layer (Next Auth + Supabase helpers or custom middleware) that materialises tenant context from the session.
  - Replace direct Supabase service-role queries with RLS-backed policies scoped to `tenant_id`.
  - Add integration tests proving cross-tenant reads/writes are rejected.
- **Acceptance criteria**
  - All REST and server actions call helpers that inject `tenantId` from the authenticated session.
  - Supabase policies enforce `tenant_id = auth.uid()` (or mapped tenant membership) for CRUD tables.
  - CI job `pnpm test:integration` covers the protected endpoints.
- **Owner**: Backend team with support from infra.
- **Duration**: 1 week.
- **Progress (2024-10-15)**
  - Added `requireTenantContext` helper that derives session-bound Supabase clients and enforces tenant membership before API logic executes.
  - Refactored email API routes to consume the tenant-scoped helper and removed inline service-role client usage in favour of session-aware `SupabaseClient` instances.
  - Authored Supabase migration `20241015120000_tenant_rls_email.sql` establishing membership-driven RLS on email lists, campaigns, segments, analytics, and related helpers.
  - Introduced Vitest coverage (`apps/web/app/api/email/__tests__/tenant-isolation.spec.ts`) confirming cross-tenant campaign access yields `404/403` responses.

## Phase 2 – Monorepo Health (Goal: deterministic builds)
- **Objectives**
  - Re-enable the packages excluded from `pnpm-workspace.yaml` **or** stop advertising them as runtime dependencies of the web app.
  - Introduce workspace constraints so each package declares explicit build/lint/test scripts.
  - Wire up CI (GitHub Actions or similar) to run `pnpm install`, `pnpm lint`, `pnpm typecheck`, and `pnpm test` on every push.
- **Acceptance criteria**
  - `pnpm install && pnpm build` passes from a clean clone.
  - Turborepo cache artifacts are stored/validated in CI.
  - Dependency graph documentation added to `/docs/architecture/dependencies.md`.
- **Owner**: Developer productivity team.
- **Duration**: 3–4 days.

## Phase 3 – Integration Fidelity (Goal: real data instead of mocks)
- **Objectives**
  - Replace mock Amazon PA-API calls in the worker and SDK with live integration + error handling/back-off.
  - Implement production search providers (Tavily/SerpAPI) with retries and observability hooks.
  - Flesh out agent orchestration so failed tasks retry safely and results persist with audit logs.
- **Acceptance criteria**
  - Worker agents pull real product, pricing, and trend data in staging.
  - Monitoring dashboards expose success/error rates for each integration.
  - Regression tests verify product ingestion and chat search flows end-to-end.
- **Owner**: Integrations/AI agents team.
- **Duration**: 2 weeks.

## Phase 4 – Mobile & API Contract Alignment (Goal: working clients)
- **Objectives**
  - Specify and build `/mobile/*` API routes (REST or GraphQL) matching the Expo client contract, including auth token issuance.
  - Replace hardcoded API URLs in the mobile app with environment-aware configuration.
  - Add contract tests (Pact or supertest) to guarantee payload compatibility.
- **Acceptance criteria**
  - Mobile smoke test (login → fetch sites → view analytics) succeeds against staging.
  - Documentation for the mobile API published under `docs/mobile-api.md`.
  - Expo release checklist updated with backend readiness checks.
- **Owner**: Mobile + backend teams.
- **Duration**: 1 week.

## Phase 5 – Observability, QA, and Launch Readiness (Goal: stable operations)
- **Objectives**
  - Instrument key flows with tracing/logging (OpenTelemetry, Sentry, Logflare) and add alerting thresholds.
  - Establish regression suites: unit (Vitest), integration (Playwright API/UI), worker smoke tests.
  - Prepare go-live runbook covering feature flags, migrations, and rollback.
- **Acceptance criteria**
  - Dashboards for API latency, worker queue depth, and Supabase errors.
  - Automated nightly job executes `pnpm test`, `pnpm test:e2e` against staging.
  - Runbook stored in `docs/runbooks/launch.md` and signed off by stakeholders.
- **Owner**: QA + SRE.
- **Duration**: 1–2 weeks.

## Cross-Cutting Dependencies
- Environment management: separate `.env.staging` and `.env.production` files with sealed secrets.
- Documentation updates tracked alongside code in feature branches.
- Approval gates: each phase should exit with a demo + checklist sign-off.

## Appendix – Suggested Deliverables by Phase
| Phase | Key Deliverables |
| ----- | ---------------- |
| 0 | Locked-down APIs, rotated keys, updated incident playbook |
| 1 | Auth middleware, RLS policies, integration tests |
| 2 | Restored pnpm workspace, CI pipeline, dependency docs |
| 3 | Live integrations, monitoring dashboards, agent E2E tests |
| 4 | Mobile-ready APIs, contract tests, Expo config docs |
| 5 | Observability stack, regression suites, launch runbook |
