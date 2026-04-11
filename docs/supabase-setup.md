# Supabase Setup Guide for CV Builder AI

This guide walks through setting up Supabase for the CV Builder AI project after migrating from a traditional PostgreSQL + Express backend.

## Prerequisites

- Supabase project created (https://supabase.com)
- Supabase project URL and anon/service role keys available

## Step 1: Apply Database Schema

Open your Supabase project dashboard and go to:
- **SQL Editor** → **New Query**
- Paste the contents of `database/migrations/001_initial_schema.sql`
- Run the query

This will create:
- Tables: `users`, `cv_templates`, `generated_cvs`, `conversations`, `messages`
- Indexes for performance
- Row Level Security (RLS) policies
- Automatic timestamp triggers
- Default CV templates (4 templates seeded)

## Step 2: Verify RLS Policies

After running the migration, verify that RLS is enabled and policies are correct:

```sql
-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check policies
SELECT 
  schemaname, 
  tablename, 
  policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

Expected RLS policies:
- `users`: Users can view/update/insert their own profile
- `generated_cvs`: Users can CRUD their own CVs
- `conversations`: Users can CRUD their own conversations
- `messages`: Users can view/create messages in their conversations
- `cv_templates`: Public read-only (anyone can view)

## Step 3: Configure Environment Variables

Add these to your environment (`.env` locally, or Vercel environment variables):

### Client-side (public)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Server-side (Next.js API routes)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GROQ_API_KEY=gsk_...
```

**Important**: Never expose `SUPABASE_SERVICE_ROLE_KEY` or `GROQ_API_KEY` to the client.

## Step 4: Enable Supabase Auth

In Supabase dashboard:
- Go to **Authentication** → **Providers**
- Enable **Google** OAuth (or other providers you need)
- Configure redirect URLs:
  - For local development: `http://localhost:3000`
  - For production: your production URL

## Step 5: Storage (Optional)

If you want to store files (uploaded DOCX, generated PDFs) in Supabase Storage:

1. Create a storage bucket named `cv-uploads`
2. Enable public access for generated CVs if needed
3. Add RLS policies to the bucket

Example bucket policy:
```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload" 
ON storage.objects 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Allow users to read their own files
CREATE POLICY "Users can read their own files" 
ON storage.objects 
FOR SELECT 
USING (auth.uid()::text = (storage.foldername(name))[1]);
```

## Step 6: Test the Setup

After setup, test that:
1. You can sign in via Supabase Auth
2. The `users` table is populated when a new user signs in
3. You can query `cv_templates` as an authenticated user
4. RLS policies prevent users from accessing other users' data

## Troubleshooting

### Migration Fails
- Check if tables already exist (drop them first if needed)
- Verify you have the right permissions in Supabase

### RLS Not Working
- Ensure RLS is enabled on all tables
- Check that policies are correctly defined
- Verify you're using the correct auth token

### Auth Issues
- Verify redirect URLs match your application URLs
- Check that OAuth provider is enabled
- Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly

## Next Steps

After Supabase is set up:
1. Update Next.js API routes to use Supabase instead of direct DB queries
2. Update client code to use Supabase Auth
3. Remove legacy Express backend code
4. Deploy to Vercel
