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

const MIME_BY_EXT = {
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const toDataUrl = (absolutePath) => {
  const ext = path.extname(absolutePath).toLowerCase();
  const mimeType = MIME_BY_EXT[ext] || 'application/octet-stream';
  const base64 = fs.readFileSync(absolutePath).toString('base64');
  return `data:${mimeType};base64,${base64}`;
};

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'malta-trip-'));

const buildCompressedPhoto = (absolutePath, index) => {
  const outputPath = path.join(tmpDir, `photo-${index + 1}.jpg`);

  try {
    execFileSync('sips', [
      '-s',
      'format',
      'jpeg',
      '-s',
      'formatOptions',
      '55',
      '-Z',
      '1280',
      absolutePath,
      '--out',
      outputPath,
    ], { stdio: 'ignore' });
    return outputPath;
  } catch {
    return absolutePath;
  }
};

const photoFiles = [
  'IMG_1272.JPG',
  'IMG_1381.JPG',
  'IMG_1516.JPG',
  'IMG_1553.JPG',
  'IMG_1573.JPG',
];

const photos = photoFiles.map((fileName, index) => {
  const absolutePath = path.join(desktopDir, fileName);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Photo file not found: ${absolutePath}`);
  }

  const processedPath = buildCompressedPhoto(absolutePath, index);
  return toDataUrl(processedPath);
});

const tripId = '22222222-2222-2222-2222-222222222222';

const tripRow = {
  id: tripId,
  title: 'Malta 2024',
  destination: 'Malta',
  start_date: '2024-04-21',
  end_date: '2024-04-26',
  cost: 587.22,
  photos,
  tickets: [],
  travel: {
    outbound: [
      {
        from: 'Porto (OPO)',
        to: 'Malta (MLT)',
        departure: '16h50',
        arrival: '20h55',
        carrier: 'Ryanair',
        flightNumber: 'FR1510',
      },
    ],
    returnTrip: [
      {
        from: 'Malta (MLT)',
        to: 'Porto (OPO)',
        departure: '07h00',
        arrival: '09h20',
        carrier: 'Ryanair',
        flightNumber: 'FR1509',
      },
    ],
    cost: 316.72,
  },
  hotels: [
    {
      name: 'Buccaneers Boutique Guest House',
      checkIn: '2024-04-21',
      checkOut: '2024-04-26',
      cost: 250.05,
      confirmationNumber: '3752315509',
    },
  ],
  expenses: [
    { label: 'Voos Ryanair (ida e volta)', amount: 316.72 },
    { label: 'Hotel - Buccaneers Boutique Guest House', amount: 250.05 },
    { label: 'Parking Looking4Parking', amount: 20.45 },
  ],
  foods: [],
  notes: 'Viagem a Malta de 21 a 26 de abril. Parking reservado na Looking4Parking (ref: L4P-1-5453747). Safe Parking: Av. Mario Brito 5494, 4455-494 Perafita, Portugal. Coordenadas GPS: 41.2326974977184, -8.672278317295465.',
  tags: ['malta', 'city-break', 'couple'],
};

console.log('Upserting Malta trip into public.trips...');
const { error } = await supabase
  .from('trips')
  .upsert([tripRow], { onConflict: 'id' });

if (error) {
  console.error('Failed to import Malta trip:', error);
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