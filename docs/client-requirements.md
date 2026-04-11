## Packages
framer-motion | Page animations and beautiful micro-interactions
clsx | Utility for constructing className strings conditionally
tailwind-merge | Utility for merging Tailwind classes safely

## Notes
- Supabase Auth is integrated, and API calls use Bearer JWT tokens.
- Wouter handles routing.
- The templates use screenshot images from `/images/templates/*.png`.
- The frontend tracks CV generation progress by polling `/api/generate/:jobId`.
- Zod is used for runtime validation of all API responses.
