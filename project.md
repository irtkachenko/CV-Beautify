# Project

## Product

CV Builder AI is a web app that turns uploaded CV documents into polished resume outputs using AI and templates.

## Current stack

- Next.js 14 + React 18 + TypeScript
- Supabase Auth + Postgres
- TanStack Query
- TailwindCSS / shadcn-ui

## Repo layout

- `app/` - Next.js App Router UI and API routes
- `lib/` - shared runtime utilities (supabase, fetch, pdf, i18n)
- `lib/resume-list-store.ts` - resume list normalization helpers
- `lib/services/` - shared server-side business services (ownership checks, limits, AI completion, HTML post-processing)
- `shared/` - API contracts and canonical domain types
- `database/migrations/` - SQL schema, policies, triggers
- `docs/` - developer and operations docs

## Working agreements

- Keep changes small and reviewable.
- Validate auth/RLS changes manually.
- Keep API contracts in sync between `shared/routes.ts` and `app/api/*`.
- Update docs when behavior changes.

## AI rules

Canonical AI rules are in `AGENTS.md`.
Adapters:

- `.cursorrules`
- `.windsurf/rules.md`
- `.github/copilot-instructions.md`

## AI prompt behavior

- Runtime prompt templates are stored in `prompts/` and split into dedicated `system-*` and `user-*` templates.
- CV generation and AI edit run through the same generation prompt pipeline; AI edit uses the current CV HTML as its template input.
- Both flows preserve the base layout by default, but explicit user requests for style or structure changes take priority.
- User input is normalized into a directive block before prompt assembly so layout/style requests are not buried inside generic instructions.
- Supported instruction types include targeted typography, color, spacing, section reorder, and removing a specific section/block when requested.
- Prompt validation failures should stop the request early and surface in UI feedback without mutating generated CV job state.

## Recent reliability fixes (2026-04-12)

- Fixed tab navigation routes so authenticated users stay on `/gallery` and are not bounced through `/`.
- Stabilized generation status polling query keys to prevent stale "processing forever" UI states.
- Improved image loading resilience for cached template previews (prevents blank cards after tab/page switches).
- Preserved template styles in secure CV render/preview by sanitizing full HTML documents and normalizing preview markup.
- Disabled i18next suspense mode to avoid intermittent blank first render on the landing page.

## Recent architecture fixes (2026-04-26)

- Unified protected API auth flow to `authenticateRequest` and removed route-local auth parsing.
- Consolidated generated CV ownership/limit checks in `lib/services/generated-cv-service.ts`.
- Reduced `lib/cv-jobs.ts` responsibilities by extracting Groq fallback/completion and CV HTML helpers into `lib/services/`.
- Removed duplicate CV delete endpoint shape and kept the canonical `DELETE /api/resumes/:id` contract.
- Simplified resume list rendering to server-driven fetches on page load plus lightweight refresh while any CV remains in `processing`.
- Prevented infinite generation polling loops by treating `404/401/403` job-status responses as terminal client states.
- Reduced unnecessary UI refresh churn by running resume-list polling only when `watchProcessing=true` and active jobs exist.
- Added resume-list auto-retry polling on transient fetch errors so cards recover without manual logout/login.
- Hardened authenticated client fetches with automatic Supabase session refresh and one-time retry on `401`.
- Migrated `useMyResumes` to TanStack Query with periodic refetch + explicit invalidation to avoid stale local hook state.
- Added durable `cv_jobs` queue with authenticated worker endpoint (`/api/cv-jobs/run-next`) for unified generation and AI-edit execution.
