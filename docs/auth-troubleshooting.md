# Auth Troubleshooting

## Symptoms

- User successfully completes OAuth but app still behaves as unauthorized.
- `/api/auth/user` returns `401` or `500`.
- Protected endpoints fail under RLS.

## Checklist

1. Verify env vars are set in runtime (`NEXT_PUBLIC_*` and server-side `SUPABASE_*`).
2. Confirm OAuth redirect URL is whitelisted in Supabase Auth settings.
3. Confirm optional `NEXT_PUBLIC_AUTH_REDIRECT_URL` matches actual domain for current environment.
4. Ensure protected API routes authenticate request token and execute DB queries with that same token context.
5. Verify RLS policies on `users` and `generated_cvs` allow `auth.uid()` access.

## Important implementation detail

Token validation alone is not enough for RLS-protected queries.

You must create Supabase server client with bearer token in global headers:

- `Authorization: Bearer <access_token>`

This repository uses `lib/server-auth.ts` + `createSupabaseServerClient(token)` for that.

## Quick debug endpoints

- `GET /api/auth/user` with Authorization header should return mapped profile.
- `GET /api/resumes` should return only current user records.

## Common failure causes

- Using `supabaseServerClient` (anonymous context) for protected queries.
- Missing Auth provider setup in Supabase (Google disabled or misconfigured).
- Mismatch between redirect URL and current host.
- Stale browser session after env/domain change.
