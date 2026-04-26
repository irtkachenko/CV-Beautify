# Documentation

- [Project overview](../README.md)
- [Supabase setup](supabase-setup.md)
- [Auth troubleshooting](auth-troubleshooting.md)
- [Request processing flow](request-processing-flow.md)
- [Migration to Supabase](migration-to-supabase.md)
- [Client requirements](client-requirements.md)
- [PDF generation](pdf-generator.md)
- [AI workflow](ai-workflow.md)

AI prompt templates for generation/editing are stored in `../prompts/`, with separate `system-*` and `user-*` files for each flow.

Architecture conventions:
- Protected API routes use centralized auth via `lib/server-auth.ts`.
- Generated CV ownership/limit checks are shared via `lib/services/generated-cv-service.ts`.
- Canonical CV deletion contract is `DELETE /api/resumes/:id`.
- Resume list UI reads `generated_cvs` directly through Supabase client with RLS.
- Generation/edit tasks are enqueued in `cv_jobs` and drained through `POST /api/cv-jobs/run-next`.
