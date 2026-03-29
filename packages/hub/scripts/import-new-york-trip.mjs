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

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'new-york-trip-'));

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
  '57ED1F8C-A299-4690-84DA-E57267D5EA5B_1_102_o.jpeg',
  '4899DF77-BA91-4451-A62C-1FF8B6D020EB_1_102_o.jpeg',
  '10123D3B-BA32-4BA1-97C8-D945A7A4AC7C_1_102_o.jpeg',
  'C740029B-6475-4594-9013-ABA69AAE13F9_4_5005_c.jpeg',
  'E933F707-79C7-440E-8D10-64A2EA200141_1_102_o.jpeg',
  'F4BE4E79-4F88-4963-842C-4688720D889B_1_105_c.jpeg',
  'CC91CD59-2AD3-48F6-A32C-B02E2DAE21E4_1_102_a.jpeg',
];

const tripId = '55555555-5555-5555-5555-555555555555';

console.log('Compressing and uploading New York photos to Supabase Storage...');
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
  title: 'New York 2021',
  destination: 'New York, United States',
  start_date: '2021-12-20',
  end_date: '2021-12-25',
  cost: 2573.8,
  photos,
  tickets: [
    {
      name: 'Broadway Theatre Christmas Spectacular Starring the Radio City Rockettes',
      venue: 'Radio City Music Hall',
      cost: 178.2,
    },
  ],
  travel: {
    outbound: [
      {
        from: 'Porto (OPO)',
        to: 'Frankfurt (FRA)',
        departure: '06h05',
        arrival: '09h55',
        carrier: 'Lufthansa',
        flightNumber: 'LH1181',
      },
      {
        from: 'Frankfurt (FRA)',
        to: 'New York (JFK)',
        departure: '10h50',
        arrival: '13h40',
        carrier: 'Lufthansa',
        flightNumber: 'LH400',
      },
    ],
    returnTrip: [
      {
        from: 'New York (JFK)',
        to: 'Frankfurt (FRA)',
        departure: '15h55',
        arrival: '05h15 (+1)',
        carrier: 'Lufthansa',
        flightNumber: 'LH401',
      },
      {
        from: 'Frankfurt (FRA)',
        to: 'Porto (OPO)',
        departure: '09h50',
        arrival: '11h35',
        carrier: 'Lufthansa',
        flightNumber: 'LH1176',
      },
    ],
    cost: 1443.6,
  },
  hotels: [
    {
      name: 'Holiday Inn Express Times Square South',
      checkIn: '2021-12-20',
      checkOut: '2021-12-25',
      address: '60 West 36th Street, New York, NY 10018, United States',
      cost: 858,
      confirmationNumber: '2826.122.095',
    },
  ],
  expenses: [
    { label: 'Passaporte', amount: 65 },
    { label: 'VISA ESTA', amount: 14 },
    { label: 'Voos Lufthansa (ida e volta)', amount: 1443.6 },
    { label: 'Hotel Holiday Inn Express Times Square South', amount: 858 },
    { label: 'JFK para hotel', amount: 15 },
    { label: 'Christmas Spectacular (Broadway)', amount: 178.2 },
  ],
  foods: [
    { name: 'Cheesesteak', description: 'Classico sandwich quente partilhado numa noite fria em Manhattan.' },
  ],
  notes: 'Uma viagem de Natal em New York com a cidade cheia de luzes, ruas vibrantes e momentos inesqueciveis a dois. Entre Times Square, passeios por Manhattan e a magia do Christmas Spectacular no Broadway, foi uma semana especial, com fotos espontaneas, comida de rua e aquela energia unica que so New York tem em dezembro.',
  tags: ['new-york', 'usa', 'christmas', 'city-break', 'couple'],
};

console.log('Upserting New York trip into public.trips...');
const { error } = await supabase
  .from('trips')
  .upsert([tripRow], { onConflict: 'id' });

if (error) {
  console.error('Failed to import New York trip:', error);
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
