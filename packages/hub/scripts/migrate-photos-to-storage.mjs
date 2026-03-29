#!/usr/bin/env node
/**
 * One-time migration: moves base64 photos stored in the `trips` table to
 * Supabase Storage and replaces the column values with public URLs.
 *
 * Run once:
 *   source ../../.env.local && node scripts/migrate-photos-to-storage.mjs
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const BUCKET = 'trip-photos';

// Verify bucket is accessible by listing its contents (anon key cannot create buckets —
// create a public bucket named "trip-photos" in the Supabase dashboard first).
const { error: bucketCheckError } = await supabase.storage.from(BUCKET).list('', { limit: 1 });
if (bucketCheckError) {
  console.error(`Cannot access bucket "${BUCKET}".`);
  console.error('Please create a PUBLIC bucket named "trip-photos" in the Supabase Storage section of your Supabase dashboard.');
  console.error('Error:', bucketCheckError.message);
  process.exit(1);
}
console.log(`\u2713 Bucket "${BUCKET}" ready.\n`);

// Fetch all trips
const { data: trips, error: tripsError } = await supabase
  .from('trips')
  .select('id, title, photos');

if (tripsError) {
  console.error('Failed to fetch trips:', tripsError);
  process.exit(1);
}

console.log(`Found ${trips.length} trip(s) to inspect.\n`);

const isDataUrl = (s) => typeof s === 'string' && s.startsWith('data:');

for (const trip of trips) {
  const photos = Array.isArray(trip.photos) ? trip.photos : [];
  const base64Count = photos.filter(isDataUrl).length;

  if (!base64Count) {
    console.log(`[SKIP] ${trip.title} — no base64 photos.`);
    continue;
  }

  console.log(`[MIGRATE] ${trip.title} (${trip.id}) — ${base64Count} base64 photo(s)`);

  const newPhotos = [];

  for (const [n, photo] of photos.entries()) {
    if (!isDataUrl(photo)) {
      // Already a storage URL — keep as-is
      newPhotos.push(photo);
      continue;
    }

    const mimeType = photo.split(';')[0].split(':')[1] ?? 'image/jpeg';
    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const base64Data = photo.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    const storagePath = `${trip.id}/photo-${n + 1}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: mimeType, upsert: true });

    if (uploadError) {
      console.error(`  ✗ Failed to upload photo ${n + 1}:`, uploadError.message);
      process.exit(1);
    }

    const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
    newPhotos.push(publicUrl);
    console.log(`  ✓ photo-${n + 1} → ${publicUrl}`);
  }

  const { error: updateError } = await supabase
    .from('trips')
    .update({ photos: newPhotos })
    .eq('id', trip.id);

  if (updateError) {
    console.error(`  ✗ Failed to update trip photos in DB:`, updateError.message);
    process.exit(1);
  }

  console.log(`  ✓ Updated DB with ${newPhotos.length} storage URL(s).\n`);
}

console.log('✅ Migration complete. All base64 photos have been moved to Supabase Storage.');
