#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const migrationsDir = path.join(process.cwd(), 'database', 'migrations');

try {
  // Get all migration files sorted by name
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  if (migrationFiles.length === 0) {
    console.log('No migration files found.');
    process.exit(0);
  }

  console.log(`Found ${migrationFiles.length} migration(s) to apply...\n`);

  let successCount = 0;
  let failCount = 0;

  for (const file of migrationFiles) {
    const migrationPath = path.join(migrationsDir, file);
    console.log(`📄 Applying ${file}...`);
    try {
      execSync(`${path.join(process.cwd(), 'supabase-cli.exe')} db query --linked --file "${migrationPath}"`, { stdio: 'inherit' });
      console.log(`✅ ${file} applied successfully!\n`);
      successCount++;
    } catch (error) {
      console.log(`⚠️ ${file} failed (may already be applied): ${error.message}\n`);
      failCount++;
    }
  }

  console.log(`\n📊 Results: ${successCount} succeeded, ${failCount} failed`);
  console.log('🎉 Migration process completed!');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
