# AI Workflow

## Rule source

Use `AGENTS.md` as the canonical AI rule set in this repository.

Editor-specific adapters:

- `.cursorrules`
- `.windsurf/rules.md`
- `.github/copilot-instructions.md`

## Workflow expectations

1. Iterate in small, reviewable steps.
2. Search before introducing new APIs/files.
3. Validate auth/RLS/security-sensitive changes manually.
4. Update docs for behavior or architecture changes.
5. Keep API contract and route implementation aligned.

## CV prompt behavior

- Runtime prompt templates live in `prompts/system-generate-cv.txt`, `prompts/user-generate-cv.txt`, `prompts/system-edit-cv.txt`, and `prompts/user-edit-cv.txt`.
- Prompt assembly is handled in `lib/cv-prompt-builder.ts`.
- Safety and factual rules stay strict.
- Layout and styling preservation is the default only when the user gives no explicit visual/structural direction.
- Prompt validation failures should be surfaced as request errors/toasts before a generation or edit job is created or moved into processing.
- Explicit user requests should be honored when safe, including:
  - changing font sizes
  - changing colors of a specific section
  - adjusting spacing/alignment
  - reordering sections
  - removing a specific block/section
- Raw user text is preserved and also normalized into an explicit directive list so concrete requests are easier for the model to follow.
- Edits should stay targeted; do not redesign unrelated parts of the document when a local change is enough.
