#!/usr/bin/env node
// Creates the contract-quotes storage bucket in Supabase.
// Run from packages/hub: source ../../.env.local && node scripts/create-quotes-bucket.mjs

import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

const { data, error } = await supabase.storage.createBucket('contract-quotes', {
  public: true,
  fileSizeLimit: 10485760, // 10MB
  allowedMimeTypes: ['application/pdf'],
});

if (error && error.message !== 'The resource already exists') {
  console.error('Error creating bucket:', error.message);
  process.exit(1);
}

console.log('Bucket contract-quotes ready.', data ?? '(already existed)');
