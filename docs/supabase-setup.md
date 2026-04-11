# Supabase Setup Guide

## 1. Required env vars

Client:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_AUTH_REDIRECT_URL` (optional, recommended for non-local domains)

Server:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GROQ_API_KEY`

## 2. Apply SQL migrations

Run in order from `database/migrations/`:

1. `001_initial_schema.sql`
2. `002_add_auth_trigger.sql`
3. `003_add_remaining_templates.sql`

## 3. Configure Auth provider

In Supabase dashboard:

1. Authentication -> Providers
2. Enable Google provider
3. Add redirect URLs:
   - Local: `http://localhost:3000/`
   - Production: your deployed domain root or configured callback URL

## 4. Verify RLS

Ensure RLS is enabled and policies exist:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

## 5. Critical server-side auth detail

For protected API routes:

1. Validate incoming bearer token.
2. Create Supabase server client with `Authorization: Bearer <token>`.
3. Run table queries with that authenticated client.

Without step 2, RLS checks run in anonymous context and requests fail even when token is valid.

## 6. Smoke tests

- OAuth login succeeds and returns to app.
- `GET /api/auth/user` returns profile.
- `GET /api/resumes` returns only current user rows.
- New auth users get profile row in `public.users` (trigger from `auth.users`).
