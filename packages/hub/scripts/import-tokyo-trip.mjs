#!/usr/bin/env node
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const desktopDir = '/Users/olivenun/Desktop';
const BUCKET = 'trip-photos';

const { error: bucketCheckError } = await supabase.storage.from(BUCKET).list('', { limit: 1 });
if (bucketCheckError) {
  console.error(`Cannot access bucket "${BUCKET}". Create a PUBLIC bucket named "trip-photos" in the Supabase dashboard.`);
  process.exit(1);
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tokyo-trip-'));

const buildCompressedPhoto = (absolutePath, index) => {
  const outputPath = path.join(tmpDir, `photo-${index + 1}.jpg`);

  try {
    execFileSync('sips', [
      '-s', 'format', 'jpeg',
      '-s', 'formatOptions', '55',
      '-Z', '1280',
      absolutePath,
      '--out', outputPath,
    ], { stdio: 'ignore' });

    return outputPath;
  } catch {
    return absolutePath;
  }
};

const uploadPhoto = async (absolutePath, storagePath) => {
  const buffer = fs.readFileSync(absolutePath);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(`Upload failed for ${storagePath}: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
};

const photoFiles = [
  '93420898-4BD4-4202-8BB3-D1FDE8BBA37F_1_105_c.jpeg',
  '70570A6D-A147-4A53-963D-E0BBADF7675A_1_105_c.jpeg',
  '93264375-865B-4B48-A11E-D4A65DCA8443_1_105_c.jpeg',
  'C7ABB23C-2FAC-4D91-A702-3E968BAA9D5A_1_105_c.jpeg',
  'DDAC7491-751A-425D-B88C-65C526CDC633_1_105_c.jpeg',
];

const tripId = '33333333-3333-3333-3333-333333333333';

console.log('Compressing and uploading photos to Supabase Storage...');
const photos = await Promise.all(photoFiles.map(async (fileName, index) => {
  const absolutePath = path.join(desktopDir, fileName);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Photo file not found: ${absolutePath}`);
  }
  const processedPath = buildCompressedPhoto(absolutePath, index);
  const url = await uploadPhoto(processedPath, `${tripId}/photo-${index + 1}.jpg`);
  console.log(`  ✓ photo-${index + 1}: ${url}`);
  return url;
}));

const tripRow = {
  id: tripId,
  title: 'Toquio 2026',
  destination: 'Toquio, Japao',
  start_date: '2026-04-02',
  end_date: '2026-04-15',
  cost: 4812.79,
  photos,
  tickets: [],
  travel: {
    outbound: [
      {
        from: 'Porto (OPO)',
        to: 'Frankfurt (FRA)',
        departure: '06h00',
        arrival: '09h45',
        carrier: 'Lufthansa',
        flightNumber: 'LH1181',
      },
      {
        from: 'Frankfurt (FRA)',
        to: 'Toquio Haneda (HND)',
        departure: '12h10',
        arrival: '08h10 (+1)',
        carrier: 'Lufthansa',
        flightNumber: 'LH4948',
      },
    ],
    returnTrip: [
      {
        from: 'Toquio Haneda (HND)',
        to: 'Frankfurt (FRA)',
        departure: '21h40',
        arrival: '05h20 (+1)',
        carrier: 'Lufthansa',
        flightNumber: 'LH4921',
      },
      {
        from: 'Frankfurt (FRA)',
        to: 'Porto (OPO)',
        departure: '09h25',
        arrival: '11h15',
        carrier: 'Lufthansa',
        flightNumber: 'LH1176',
      },
    ],
    cost: 2923.67,
  },
  hotels: [
    {
      name: 'B&B Hotel Porto',
      checkIn: '2026-04-02',
      checkOut: '2026-04-03',
      cost: 55.93,
      confirmationNumber: '12394852839831907011',
    },
    {
      name: 'Sotetsu Fresa Inn Tokyo Roppongi',
      checkIn: '2026-04-04',
      checkOut: '2026-04-14',
      cost: 1781.19,
      confirmationNumber: '4999168895',
    },
  ],
  expenses: [
    { label: 'Voos Lufthansa (ida e volta)', amount: 2923.67 },
    { label: 'Hotel B&B Porto (1 noite)', amount: 55.93 },
    { label: 'Hotel Sotetsu Fresa Inn Tokyo Roppongi (10 noites)', amount: 1781.19 },
    { label: 'Parking SAFE PARKING LOW COST', amount: 52.00 },
  ],
  foods: [],
  notes: 'Viagem ao Japao em abril de 2026. Ref cliente voos: 40-583122888 (PIN: 8848). B&B Hotel Porto PIN: 991651. Hotel Toquio PIN: 3806. Parking ref: L4P-1-6805972.',
  tags: ['toquio', 'japao', 'city-break', 'couple'],
};

console.log('Upserting Tokyo trip into public.trips...');
const { error } = await supabase
  .from('trips')
  .upsert([tripRow], { onConflict: 'id' });

if (error) {
  console.error('Failed to import Tokyo trip:', error);
  process.exit(1);
}

const { data: inserted, error: verifyError } = await supabase
  .from('trips')
  .select('id, title, destination, start_date, end_date, photos, cost')
  .eq('id', tripId)
  .single();

if (verifyError) {
  console.error('Trip inserted, but verification failed:', verifyError);
  process.exit(1);
}

const photoCount = Array.isArray(inserted.photos) ? inserted.photos.length : 0;
console.log(`Imported trip: ${inserted.title} (${inserted.destination})`);
console.log(`Trip id: ${inserted.id}`);
console.log(`Total cost: ${inserted.cost} EUR`);
console.log(`Photos imported: ${photoCount}`);
