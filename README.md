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
- `GROQ_MODEL` (preferred generation model, default chain starts with `mixtral-8x7b-32768`)
- `GROQ_MODELS` (comma-separated fallback model chain, tried in order)

## Auth + RLS notes

- All protected API routes must run Supabase queries in the authenticated user context (Bearer token), not anonymous context.
- RLS is enabled on user data tables. If token context is not forwarded, requests will fail even after successful OAuth.
- Route auth is centralized in `lib/server-auth.ts` (header/cookie token resolution + user validation).
- Canonical CV deletion endpoint is `DELETE /api/resumes/:id` (no query-param fallback path).

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

## AI prompt behavior

- Prompt templates for CV generation/editing live in `prompts/` and are split into dedicated `system-*` and `user-*` templates.
- User instructions are normalized into an explicit `USER DIRECTIVES` block before being sent to the model.
- Explicit user requests for styling and structure should be honored when safe, including changes like font size, colors, spacing, section order, and removing a specific block.
- Default preservation of the template/layout applies only when the user does not ask for a visual or structural change.
- Prompt validation errors are returned as request errors for UI toasts and should not create broken CV jobs or failed cards.
