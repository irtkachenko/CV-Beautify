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
