# Request Processing Flow (Next.js + Supabase)

This document describes the canonical request processing path in the current architecture.

## 1. Client action

UI calls hooks in `app/hooks/*` (for example `use-generate`, `use-cvs`, `use-auth`).

## 2. Authenticated fetch

Hooks use `authedFetch` (`lib/authed-fetch.ts`), which attaches Supabase access token as bearer header when session exists.

## 3. Next.js API route

Request hits `app/api/*/route.ts`.

Protected routes call `authenticateRequest` (`lib/server-auth.ts`):

1. Extract token from `Authorization` header.
2. Validate token via Supabase Auth.
3. Create user-context Supabase client with bearer token.

## 4. Supabase query (RLS-aware)

Route queries Supabase tables using the user-context client, so RLS policies are applied correctly.

## 5. Response normalization

Before returning JSON, routes map DB rows (`snake_case`) to API shape (`camelCase`) via `lib/cv-mappers.ts`.

## 6. Contract usage on client

Client validates and consumes response using contracts in `shared/routes.ts` and shared types in `shared/types/*`.

## 7. UI state updates

TanStack Query caches results and invalidates related queries on mutations.

## Error handling path

- 401: missing/invalid token
- 403: resource belongs to another user
- 404: record does not exist
- 500: server/internal route or DB errors

## Design rules

1. Keep API contracts in `shared/routes.ts`.
2. Keep domain types in `shared/types/*`.
3. Do not return raw Supabase table rows directly to frontend.
4. Keep mapping logic centralized in mappers.
