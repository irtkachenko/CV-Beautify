#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Read migration file
try {
  const migrationPath = path.join(process.cwd(), 'database', 'migrations', '001_initial_schema.sql');
  const migrationContent = fs.readFileSync(migrationPath, 'utf-8');

  console.log('Applying migration to remote Supabase database...');
  execSync(`npx supabase db query --linked --file "${migrationPath}"`, { stdio: 'inherit' });
  console.log('✅ Migration applied successfully!');
} catch (error) {
  console.error('Error applying migration:', error.message);
  process.exit(1);
}
