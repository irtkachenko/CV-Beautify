# Migration to Supabase - CV Builder AI

## Overview

This document describes the migration of the CV Builder AI application from a traditional PostgreSQL database with Drizzle ORM to a full Supabase backend architecture.

## Architecture Changes

### 1. **Database Migration**
- **From**: PostgreSQL + Drizzle ORM
- **To**: Supabase PostgreSQL + Row Level Security (RLS)

### 2. **Authentication**
- **From**: Custom middleware with local user storage
- **To**: Supabase Auth + automatic user synchronization

### 3. **API Layer**
- **From**: Direct database queries
- **To**: Supabase client with RLS policies

## New Components

### 1. **Supabase API Configuration** (`shared/supabase-api.ts`)
```typescript
export enum SupabaseTable {
  USERS = 'users',
  CV_TEMPLATES = 'cv_templates',
  GENERATED_CVS = 'generated_cvs',
  CONVERSATIONS = 'conversations',
  MESSAGES = 'messages'
}

export enum SupabaseOperation {
  SELECT = 'select',
  INSERT = 'insert',
  UPDATE = 'update',
  DELETE = 'delete',
  UPSERT = 'upsert',
  // ... more operations
}
```

### 2. **Database Schema** (`database/migrations/001_initial_schema.sql`)
- Complete SQL schema for Supabase
- RLS policies for data security
- Automatic timestamp triggers
- Default data seeding

### 3. **Supabase Client** (`server/supabase/client.ts`)
- Service role client (admin operations)
- User context client (respects RLS)
- Generic API handler with type safety
- Parameter substitution helpers

### 4. **Storage Layer** (`server/supabase/storage.ts`)
- `SupabaseStorage` - Admin operations
- `UserSupabaseStorage` - User-specific operations
- Interface compatibility with existing code

### 5. **Enhanced Middleware** (`server/auth/supabase-middleware.ts`)
- Token validation via Supabase Auth
- Automatic user data synchronization
- Helper functions for user context
- Optional authentication support

### 6. **New API Routes** (`server/api/cv-supabase.ts`)
- Complete rewrite of CV routes using Supabase
- Maintains API compatibility
- Uses existing service functions
- Proper error handling and logging

## Migration Steps

### Step 1: Database Setup
1. Create Supabase project
2. Run migration script: `001_initial_schema.sql`
3. Set up environment variables:
   ```bash
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

### Step 2: Code Integration
1. Update imports to use new Supabase modules
2. Replace storage instances with Supabase storage
3. Update authentication middleware usage
4. Test API endpoints

### Step 3: Data Migration (Optional)
```sql
-- Export existing data
pg_dump -h localhost -U postgres cv_builder > existing_data.sql

-- Import to Supabase
psql -h your-project.supabase.co -U postgres -d postgres < existing_data.sql
```

## API Compatibility

The migration maintains full API compatibility:

| Legacy Endpoint | Supabase Endpoint | Status |
|----------------|-------------------|---------|
| `/api/templates` | `/api/templates` | Compatible |
| `/api/generate` | `/api/generate` | Compatible |
| `/api/my-resumes` | `/api/my-resumes` | Compatible |
| `/api/resumes/:id` | `/api/resumes/:id` | Compatible |
| `/api/resumes/:id/ai-edit` | `/api/resumes/:id/ai-edit` | Compatible |

## Security Improvements

### 1. **Row Level Security (RLS)**
- Users can only access their own data
- Automatic enforcement at database level
- No bypassing possible

### 2. **Enhanced Authentication**
- JWT token validation via Supabase
- Automatic user synchronization
- Secure session management

### 3. **Type Safety**
- Compile-time type checking
- Runtime validation
- Better developer experience

## Environment Variables

Add these to your `.env` file:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# Existing variables (unchanged)
DATABASE_URL=postgresql://localhost/cv_builder
# ... other variables
```

## Usage Examples

### 1. **Using Supabase Storage**
```typescript
import { createSupabaseStorage, createUserSupabaseStorage } from '../supabase/storage';

// Admin operations
const adminStorage = createSupabaseStorage();
const templates = await adminStorage.getTemplates();

// User operations (respects RLS)
const userStorage = createUserSupabaseStorage(accessToken);
const userCvs = await userStorage.getUserGeneratedCvs(userId);
```

### 2. **Enhanced Authentication**
```typescript
import { supabaseIsAuthenticated, getAuthenticatedUserId } from '../auth';

// In route handlers
app.get('/api/my-data', supabaseIsAuthenticated, (req, res) => {
  const userId = getAuthenticatedUserId(req);
  // User is authenticated and data is synced
});
```

### 3. **API Handler Usage**
```typescript
import { createAdminApiHandler } from '../supabase/client';

const apiHandler = createAdminApiHandler();
const users = await apiHandler.executeWithParams('getUserById', { userId: '123' });
```

## Testing

### 1. **Unit Tests**
```bash
npm run test:supabase
```

### 2. **Integration Tests**
```bash
npm run test:integration:supabase
```

### 3. **Manual Testing**
1. Start the application
2. Test all API endpoints
3. Verify RLS policies work correctly
4. Check user synchronization

## Rollback Plan

If issues arise, you can rollback:

1. **Database**: Restore from backup
2. **Code**: Revert to previous commit
3. **Environment**: Remove Supabase variables

## Benefits

### 1. **Security**
- RLS policies at database level
- No data leaks possible
- Automatic user isolation

### 2. **Scalability**
- Managed PostgreSQL
- Automatic backups
- Global CDN

### 3. **Development**
- Type-safe API calls
- Better error handling
- Simplified authentication

### 4. **Maintenance**
- Less code to maintain
- Managed infrastructure
- Built-in monitoring

## Next Steps

1. **Complete Migration Testing**
2. **Performance Optimization**
3. **Add Real-time Features**
4. **Implement File Storage in Supabase**
5. **Add Database Functions**

## Support

For issues during migration:
1. Check Supabase documentation
2. Review migration logs
3. Test with development database
4. Contact development team

---

**Note**: This migration is designed to be backward compatible. You can run both legacy and Supabase endpoints side by side during the transition period.
