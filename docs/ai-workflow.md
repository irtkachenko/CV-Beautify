# AI Workflow (Cursor/Windsurf)

## Goal

Use AI as a force multiplier while keeping the repo maintainable and correct.

## Iteration style

- Small, reviewable changes.
- Prefer incremental PRs.
- Avoid large refactors unless explicitly requested.

## When to trust AI vs stop

- Trust AI for:
  - boilerplate, wiring, repetitive code, doc restructuring.
- Stop AI and verify manually for:
  - auth/security, billing, data access (RLS), migrations,
  - anything that can delete or corrupt user data,
  - complex concurrency/state.

## Definition of done

- Build/typecheck passes.
- No broken imports.
- Docs updated when behavior changes.

## Files that should stay up to date

- `project.md`
- `.cursorrules` and/or `.windsurf/*`
- `docs/README.md`
