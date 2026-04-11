# CV Beautify

> **🔗 Live demo:** [https://cv-builder-ai--devitkachenko.replit.app/](https://cv-builder-ai--devitkachenko.replit.app/)

An AI-powered web app that generates polished, professional resumes from any uploaded document in seconds. Simply upload your existing CV (PDF, DOCX, or plain text), pick a template — and the AI rewrites, structures, and formats your content into a pixel-perfect resume, ready to download as a PDF.

---

## ✨ Features

- **AI Content Extraction** — Upload a DOCX. file. The AI reads your raw content, understands it as a resume, and adapts it to the selected template.
- **10 Professional Templates** — Carefully crafted HTML/CSS templates ranging from minimalist to two-column designs, with full color backgrounds.
- **PDF Generation** — Browser print-based PDF flow with preserved styles, colors, and predictable A4 output.
- **Multi-language UI** — Interface available in English and Ukrainian (i18n via i18next).
- **Resume Management** — Save, view, and re-download all previously generated resumes from your dashboard.
- **Responsive Design** — Works on desktop and mobile, including collapsible navigation for smaller screens.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui |
| **Backend** | Node.js, Express 5, TypeScript (tsx) |
| **Database** | PostgreSQL + Drizzle ORM |
| **AI** | OpenAI API (GPT-4o) |
| **PDF** | Native browser print flow |
| **Auth** | Supabase Auth (OAuth/JWT) |
| **File Parsing** | mammoth (DOCX), native PDF text extraction |
| **Routing** | wouter (client), Express (server) |
| **State** | TanStack React Query |

---

## 🚀 Deployment

This project is hosted and deployed on **[Replit](https://replit.com)**.
All infrastructure, secrets, and environment configuration are managed there.

To run your own instance, fork the project on Replit and set the following secrets in the Replit Secrets panel:

| Secret | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `OPENAI_API_KEY` | OpenAI API key (`sk-...`) |
| `SUPABASE_URL` | Supabase project URL (server-side) |
| `SUPABASE_ANON_KEY` | Supabase anon key (server-side JWT verification) |
| `VITE_SUPABASE_URL` | Supabase project URL (client-side) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (client-side) |

Replit handles the rest automatically on every run.

---

## 📁 Project Structure

```
├── client/                   # React frontend (Vite)
│   ├── public/
│   │   └── templates/        # 10 HTML resume templates (template-1.html … template-10.html)
│   └── src/
│       ├── components/       # Reusable UI components
│       ├── hooks/            # Custom React hooks (use-generate, use-resumes, …)
│       ├── lib/
│       │   ├── pdf-generator-fixed.ts   # Browser print-based PDF generation
│       │   └── i18n.ts            # Internationalization setup
│       └── pages/            # Route-level page components
├── server/
│   ├── routes.ts             # All API routes (resumes, generate, auth, templates)
│   ├── lib/
│   │   └── cv-validator.ts   # AI-based CV content validation
│   └── storage.ts            # Database access layer
├── shared/
│   └── schema.ts             # Drizzle schema + Zod validation types
└── docs/
    ├── README.md             # Documentation index
    ├── pdf-generator.md      # PDF generation flow documentation
    ├── migration-to-supabase.md
    └── client-requirements.md
```

---

## 🔄 How It Works

```
User uploads CV file
        ↓
Server extracts text (DOCX → mammoth, PDF → text extraction)
        ↓
AI validates it's actually a CV (cv-validator.ts)
        ↓
User picks a template in the modal
        ↓
Server calls OpenAI GPT-4o to rewrite & inject content into the HTML template
        ↓
Generated HTML is saved to the database (resumes table)
        ↓
CvViewPage fetches the HTML and renders it in an iframe
        ↓
User clicks "Download PDF" → pdf-generator-fixed.ts opens a print-ready document
        ↓
Browser Save-to-PDF renders the final document with preserved styles
```

---

## 📄 PDF Generation

See **[docs/pdf-generator.md](docs/pdf-generator.md)** for implementation details of the current PDF generation flow.

## 📚 Documentation

- **Docs index**: [docs/README.md](docs/README.md)
- **Supabase migration**: [docs/migration-to-supabase.md](docs/migration-to-supabase.md)
- **Client requirements**: [docs/client-requirements.md](docs/client-requirements.md)
