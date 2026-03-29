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

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'california-trip-'));

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
  '168A8538-7FAB-4265-B072-2AE561921314_1_105_c.jpeg',
  '4A9087D9-CF9A-4F48-B68A-93610044F4F9_1_102_o.jpeg',
  '4BA2BA88-916E-4EF9-AE72-2E3237888329_4_5005_c.jpeg',
  '91A59415-AB4E-4ACB-92A0-E97AB0EB1ADF_1_105_c.jpeg',
  'A5F2697A-147C-4426-B097-53694320B661_1_102_o.jpeg',
  'B42422E9-94D7-4154-86E1-A533000C961D_4_5005_c.jpeg',
  'CC623738-89DF-4D7B-B857-257763816D7F_1_105_c.jpeg',
];

const tripId = '44444444-4444-4444-4444-444444444444';

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
  title: 'California 2024',
  destination: 'California, USA',
  start_date: '2024-02-06',
  end_date: '2024-02-20',
  cost: 4412,
  photos,
  tickets: [],
  travel: {
    outbound: [
      {
        from: 'Porto (OPO)',
        to: 'Madrid (MAD)',
        departure: '08h20',
        arrival: '10h40',
        carrier: 'Iberia',
        flightNumber: 'IB3091',
      },
      {
        from: 'Madrid (MAD)',
        to: 'Chicago (ORD)',
        departure: '11h35',
        arrival: '14h30',
        carrier: 'Iberia',
        flightNumber: 'IB6275',
      },
      {
        from: 'Chicago (ORD)',
        to: 'San Francisco (SFO)',
        departure: '16h05',
        arrival: '18h55',
        carrier: 'Alaska Airlines / Iberia',
        flightNumber: 'IB0734',
      },
    ],
    returnTrip: [
      {
        from: 'Las Vegas (LAS)',
        to: 'Dallas (DFW)',
        departure: '11h10',
        arrival: '15h51',
        carrier: 'American Airlines / Iberia',
        flightNumber: 'IB4859',
      },
      {
        from: 'Dallas (DFW)',
        to: 'Madrid (MAD)',
        departure: '17h40',
        arrival: '09h25 (+1)',
        carrier: 'American Airlines / Iberia',
        flightNumber: 'IB4607',
      },
      {
        from: 'Madrid (MAD)',
        to: 'Porto (OPO)',
        departure: '11h25',
        arrival: '11h45',
        carrier: 'Iberia',
        flightNumber: 'IB3092',
      },
    ],
    cost: 2165.8,
  },
  hotels: [
    {
      name: 'Park Hotel Porto',
      checkIn: '2024-02-06',
      checkOut: '2024-02-07',
      address: 'Avenida do Aeroporto 241, 4470-558 Maia, Portugal',
      link: 'https://parkhotel.pt/en/Menu/Hotels/Porto-Aeroporto.aspx',
      confirmationNumber: '4088283317',
      cost: 55.48,
    },
    {
      name: 'Executive Hotel Vintage Court',
      checkIn: '2024-02-07',
      checkOut: '2024-02-11',
      address: '650 Bush Street, San Francisco, CA 94108, USA',
      link: 'https://www.google.com/maps/search/?api=1&query=Executive%20Hotel%20Vintage%20Court%2C%20650%20Bush%20Street%2C%20San%20Francisco%2C%20CA%2094108',
      confirmationNumber: '4070584581',
      cost: 499.37,
    },
    {
      name: 'Comfort Inn Near Old Town Pasadena in Eagle Rock',
      checkIn: '2024-02-11',
      checkOut: '2024-02-15',
      address: '2300 Colorado Boulevard, Los Angeles, CA 90041, USA',
      link: 'https://www.google.com/maps/search/?api=1&query=Comfort%20Inn%20Near%20Old%20Town%20Pasadena%20in%20Eagle%20Rock%2C%202300%20Colorado%20Boulevard%2C%20Los%20Angeles%2C%20CA%2090041',
      confirmationNumber: '4245382901',
      cost: 483.08,
    },
    {
      name: 'Best Western McCarran Inn',
      checkIn: '2024-02-15',
      checkOut: '2024-02-19',
      address: '4970 Paradise Road, Las Vegas, NV 89119, USA',
      link: 'https://www.google.com/maps/search/?api=1&query=Best%20Western%20McCarran%20Inn%2C%204970%20Paradise%20Road%2C%20Las%20Vegas%2C%20NV%2089119',
      confirmationNumber: '4154938401',
      cost: 732.94,
    },
  ],
  expenses: [
    { label: 'Voos Iberia/American/Alaska', amount: 2165.8 },
    { label: 'Executive Hotel Vintage Court (San Francisco)', amount: 499.37 },
    { label: 'Comfort Inn Near Old Town Pasadena in Eagle Rock (Los Angeles)', amount: 483.08 },
    { label: 'Best Western McCarran Inn (Las Vegas)', amount: 732.94 },
    { label: 'RentalCars - ALAMO', amount: 359.89 },
    { label: 'RentalCover - seguro automovel', amount: 45.29 },
    { label: 'Boeing Park (Porto)', amount: 69.99 },
    { label: 'Park Hotel Porto', amount: 55.48 },
  ],
  foods: [],
  notes: 'Road trip California em fevereiro de 2024: San Francisco, Los Angeles e Las Vegas. Alamo reserva: 771 537 000. RentalCover: WBNV-JPNR-INS. Parking Porto (Boeing Park) ref: R734772248. Bilhete/booking voos: IB/HFE78QSZAAT.',
  tags: ['california', 'usa', 'road-trip', 'couple'],
};

console.log('Upserting California trip into public.trips...');
const { error } = await supabase
  .from('trips')
  .upsert([tripRow], { onConflict: 'id' });

if (error) {
  console.error('Failed to import California trip:', error);
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
