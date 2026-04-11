# Vercel Deployment Guide for CV Builder AI

This guide covers deploying the CV Builder AI to Vercel after migrating from Express to Next.js API routes.

## Prerequisites

- Supabase project set up (see [supabase-setup.md](supabase-setup.md))
- GitHub repository connected to Vercel
- Environment variables configured in Supabase

## Step 1: Install Dependencies

Before deploying, install the new Next.js dependencies:

```bash
npm install
```

This will install:
- `next@^14.2.5` - Next.js framework
- Other existing dependencies

## Step 2: Configure Vercel Environment Variables

In Vercel dashboard, go to **Settings** → **Environment Variables** and add:

### Client-side (public - prefixed with NEXT_PUBLIC_)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Server-side (private - NOT prefixed with NEXT_PUBLIC_)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GROQ_API_KEY=gsk_...
```

**Important**: Never expose `SUPABASE_SERVICE_ROLE_KEY` or `GROQ_API_KEY` to the client.

## Step 3: Deploy to Vercel

### Option A: Via Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js
5. Configure build settings:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build:next`
   - **Output Directory**: `.next`
6. Add environment variables (see Step 2)
7. Click "Deploy"

### Option B: Via Vercel CLI
```bash
npm install -g vercel
vercel login
vercel
```

Follow the prompts to configure your project.

## Step 4: Verify Deployment

After deployment:
1. Visit your Vercel URL
2. Check `/api/health` returns `{"status":"ok",...}`
3. Test Supabase auth flow
4. Verify API routes work correctly

## Step 5: Configure Custom Domain (Optional)

1. Go to **Settings** → **Domains** in Vercel
2. Add your custom domain
3. Update DNS records as instructed by Vercel
4. Configure redirect URLs in Supabase Auth to match your custom domain

## Migration from Express to Next.js API Routes

### What Changed
- **Before**: Express server (`server/index.ts`) handling all API routes
- **After**: Next.js API routes (`app/api/*/route.ts`) handling the same endpoints

### API Endpoints Mapping
| Express Route | Next.js Route | Status |
|--------------|---------------|--------|
| `GET /api/health` | `GET /api/health` | ✅ Implemented |
| `GET /api/auth/user` | `GET /api/auth/user` | ✅ Implemented |
| `GET /api/templates` | `GET /api/templates` | ✅ Implemented |
| `GET /api/resumes` | `GET /api/resumes` | ✅ Implemented |
| `DELETE /api/resumes/:id` | `DELETE /api/resumes?id=...` | ✅ Implemented |
| `GET /api/resumes/:id` | `GET /api/resumes/[id]` | ✅ Implemented |
| `POST /api/resumes/:id/ai-edit` | `POST /api/resumes/[id]/ai-edit` | ✅ Implemented |
| `POST /api/generate/start` | `POST /api/generate/start` | ✅ Implemented |
| `GET /api/generate/:jobId` | `GET /api/generate/[jobId]` | ✅ Implemented |
| `GET /api/generated-cv/:id/render` | `GET /api/generated-cv/[id]/render` | ✅ Implemented |

### TODO Items (Not Yet Implemented)
The following features need additional implementation:

1. **DOCX Parsing**: The `generate/start` route currently has placeholder text extraction. Implement `mammoth` for actual DOCX parsing on the server side.

2. **Groq Integration**: The AI generation and edit routes return 202 Accepted but don't actually trigger background jobs. Implement:
   - Background job processing (Vercel Cron Jobs or Supabase Edge Functions)
   - Groq API calls for CV generation using models like `llama-3.3-70b-versatile`
   - Status updates in the database

3. **File Upload Handling**: The `generate/start` route expects multipart form data. Ensure proper file handling in Next.js.

## Troubleshooting

### Build Fails
- Ensure all dependencies are installed: `npm install`
- Check TypeScript errors: `npm run check`
- Verify environment variables are set in Vercel

### API Routes Return 401/403
- Verify Supabase Auth is working
- Check that JWT tokens are being passed correctly
- Ensure RLS policies are enabled in Supabase

### Supabase Connection Errors
- Verify `SUPABASE_URL` and keys are correct
- Check Supabase project is active
- Ensure RLS policies allow the operations

### Groq API Errors
- Verify `GROQ_API_KEY` is set and valid
- Check Groq API quota/limits
- Ensure Groq API is accessible from Vercel

## Next Steps After Deployment

1. **Remove Express Legacy Code** (optional, after verifying Next routes work):
   - Delete `server/` directory
   - Remove Express dependencies from `package.json`
   - Update scripts to only use Next.js

2. **Implement Background Jobs**:
   - Set up Vercel Cron Jobs for CV generation
   - Or use Supabase Edge Functions for async processing

3. **Monitor and Scale**:
   - Set up Vercel Analytics
   - Configure Supabase monitoring
   - Set up error tracking (Sentry, etc.)

## Support

For issues:
- Check [Vercel documentation](https://vercel.com/docs)
- Check [Supabase documentation](https://supabase.com/docs)
- Review [project.md](../project.md) for project-specific guidelines
