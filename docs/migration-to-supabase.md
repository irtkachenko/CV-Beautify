# Migration to Supabase

## Status

Migration is complete. The application now uses **Next.js App Router + Supabase API** as the only backend architecture.

Legacy ORM artifacts were removed from runtime architecture:

- Drizzle ORM schemas and models removed from `shared/`
- Unused Supabase config registry removed (`shared/supabase-api.ts`)
- API contracts now rely on `shared/types/*` and `shared/routes.ts`

## Current architecture

- `app/api/*` - server routes (Next.js)
- `lib/supabase-server.ts` - server Supabase client factory
- `lib/server-auth.ts` - token validation + user context client
- `lib/cv-mappers.ts` - mapping DB `snake_case` rows to API `camelCase` responses
- `shared/types/*` - canonical TypeScript domain types
- `shared/routes.ts` - API contract paths/methods + response validation contracts

## Important auth/RLS rule

For protected routes:

1. Validate bearer token.
2. Build Supabase client with `Authorization: Bearer <token>`.
3. Query tables using that authenticated client.

Without step 2, RLS checks run in anonymous context and fail for authenticated users.

## Endpoint shape guarantees

All frontend-facing API responses are normalized to `camelCase` before returning JSON.

Examples:

- `file_name` -> `fileName`
- `pdf_url` -> `pdfUrl`
- `cv_templates` -> `template`

## Post-migration checklist

1. `npm run check`
2. `npm run build`
3. OAuth login test
4. `GET /api/auth/user` test with bearer token
5. `GET /api/resumes` returns only current user rows (RLS)

## Notes

If additional legacy references appear, remove them in favor of `shared/types/*` and Supabase route handlers.
