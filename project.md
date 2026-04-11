# Project

## Product

CV Builder AI: web app that turns an uploaded CV into a polished resume using templates + AI rewriting, and lets the user download a PDF.

## Stack (current repo)

- TypeScript
- React + Vite (client)
- Node.js + Express (server)
- Supabase Auth
- PostgreSQL

## Repo layout

- `client/` - frontend
- `server/` - backend
- `shared/` - shared types/helpers
- `database/` - migrations/schema
- `docs/` - documentation

## Working agreements (AI-assisted)

- Keep changes small and shippable.
- Prefer explicit types and runtime validation at boundaries.
- Don’t invent APIs/files. If unsure, search the codebase first.

## PR / commit conventions

- One logical change per PR.
- Descriptive commits.
- Include:
  - what changed,
  - why,
  - how to verify.

## Code review checklist (AI-generated code)

- No hidden breaking changes.
- Errors handled (especially network/auth).
- Security-sensitive code double-checked (Supabase policies, auth middleware).
- Types align with actual runtime shapes.
