#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Read .env file
const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');

// Parse SUPABASE_URL and extract project ref
const supabaseUrlMatch = envContent.match(/SUPABASE_URL=https:\/\/([^.]+)\.supabase\.co/);

if (!supabaseUrlMatch) {
  console.error('Error: SUPABASE_URL not found in .env file');
  process.exit(1);
}

const projectRef = supabaseUrlMatch[1];
console.log(`Found project ref: ${projectRef}`);

// Link to Supabase project
try {
  execSync(`npx supabase link --project-ref ${projectRef}`, { stdio: 'inherit' });
  console.log('Successfully linked to Supabase project!');
} catch (error) {
  console.error('Error linking to Supabase project:', error.message);
  process.exit(1);
}
