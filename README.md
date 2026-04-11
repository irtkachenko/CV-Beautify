# CV Builder AI

AI-powered web app for generating polished CVs from uploaded documents with Supabase auth and template-based rendering.

## Tech stack

- Next.js 14 (App Router)
- React 18 + TypeScript
- Supabase (Auth + Postgres)
- TanStack Query
- TailwindCSS + shadcn/ui

No Drizzle ORM layer is used in the current architecture.

## Quick start

1. Install dependencies:
   `npm install`
2. Create `.env` from `.env.example`.
3. Run dev server:
   `npm run dev`
4. Open `http://localhost:3000`.

## Environment variables

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GROQ_API_KEY`

Optional:

- `NEXT_PUBLIC_AUTH_REDIRECT_URL` (explicit OAuth redirect URL, useful on preview/proxy domains)

## Auth + RLS notes

- All protected API routes must run Supabase queries in the authenticated user context (Bearer token), not anonymous context.
- RLS is enabled on user data tables. If token context is not forwarded, requests will fail even after successful OAuth.

## Useful scripts

- `npm run dev` - start local development
- `npm run build` - production build
- `npm run start` - run production build
- `npm run check` - TypeScript typecheck

## Documentation

- [docs/README.md](docs/README.md)
- [docs/supabase-setup.md](docs/supabase-setup.md)
- [docs/auth-troubleshooting.md](docs/auth-troubleshooting.md)
- [docs/request-processing-flow.md](docs/request-processing-flow.md)
- [docs/ai-workflow.md](docs/ai-workflow.md)
