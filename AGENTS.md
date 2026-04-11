# AI Collaboration Rules

This file is the source of truth for AI assistant behavior in this repository.

## Core principles

1. Make small, reviewable, low-risk changes.
2. Search the codebase before introducing new files, APIs, or abstractions.
3. Prefer editing existing code over broad rewrites.
4. Never run destructive commands without explicit user approval.
5. Security-sensitive code (auth, RLS, secrets) requires extra validation.
6. Update docs when behavior, architecture, or setup changes.

## Definition of done for AI-generated changes

1. Typecheck/build passes for touched areas, or known failures are documented.
2. No broken imports or stale file references are introduced.
3. API contracts remain aligned between frontend hooks and backend routes.
4. Auth and data-access changes are verified against Supabase RLS expectations.

## Documentation to keep updated

1. `README.md`
2. `project.md`
3. `docs/README.md`
4. Topic-specific docs under `docs/` that are affected by the change
