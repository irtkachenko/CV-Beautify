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

- Runtime prompt templates live in `prompts/generate-cv.txt` and `prompts/edit-cv.txt`.
- Safety and factual rules stay strict.
- Layout and styling preservation is the default only when the user gives no explicit visual/structural direction.
- Explicit user requests should be honored when safe, including:
  - changing font sizes
  - changing colors of a specific section
  - adjusting spacing/alignment
  - reordering sections
  - removing a specific block/section
- Edits should stay targeted; do not redesign unrelated parts of the document when a local change is enough.
