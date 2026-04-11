# Context

This repo contains a CV generation web app.

Key flows:
- Upload CV -> extract text -> validate as CV -> AI rewrite into template -> store generated HTML -> render -> print-to-PDF.

Key folders:
- client/: Vite React frontend
- server/: Express backend
- shared/: shared TS types
- database/: SQL migrations
- docs/: documentation
