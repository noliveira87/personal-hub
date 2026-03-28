#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '../../..');
const assetsDir = path.resolve(workspaceRoot, '../our-travel-story/src/assets');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

const photoFiles = [
  'trip-crossfit-1.jpeg',
  'trip-crossfit-2.jpeg',
  'trip-crossfit-3.jpeg',
  'trip-madison-1.jpeg',
];

const photos = photoFiles.map((fileName) => {
  const absolutePath = path.join(assetsDir, fileName);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Photo file not found: ${absolutePath}`);
  }
  return toDataUrl(absolutePath);
});

const tripId = '11111111-1111-1111-1111-111111111111';

const tripRow = {
  id: tripId,
  title: 'CrossFit Games 2023',
  destination: 'Madison, Wisconsin',
  start_date: '2023-07-31',
  end_date: '2023-08-07',
  cost: 4395.56,
  photos,
  tickets: [
    {
      name: 'Coliseum & Festival Package - 2023 NOBULL CrossFit Games',
      venue: 'Alliant Energy Center',
      address: '1919 Alliant Energy Center Way, Madison, WI 53713',
      seats: 'Sec 313, Row N Seat 11 - Sec 313, Row O Seat 13',
      cost: 438.86,
    },
  ],
  travel: {
    outbound: [
      { from: 'Lisboa', to: 'Madrid', departure: '6h35', arrival: '9h00', carrier: 'American Airlines / Iberia', flightNumber: '8542' },
      { from: 'Madrid', to: 'Chicago', departure: '11h35', arrival: '14h15', carrier: 'American Airlines / Iberia', flightNumber: '8666' },
      { from: 'Chicago (ORD)', to: 'Madison (MSN)', departure: '16h47', arrival: '17h40', carrier: 'Envoy Air', flightNumber: '6231' },
    ],
    returnTrip: [
      { from: 'Madison (MSN)', to: 'Philadelphia (PHL)', departure: '14h38', arrival: '17h48', carrier: 'Envoy Air', flightNumber: '5963' },
      { from: 'Philadelphia (PHL)', to: 'Lisboa', departure: '21h15', arrival: '9h05 (+1)', carrier: 'American Airlines', flightNumber: '258' },
    ],
    cost: 2827.70,
  },
  hotels: [
    {
      name: 'Guest House Guerra Junqueiro',
      checkIn: '2023-07-30',
      checkOut: '2023-07-31',
      cost: 69,
    },
    {
      name: 'La Quinta by Wyndham Madison American Center',
      address: '5217 East Terrace Drive, Madison, WI 53718',
      checkIn: '2023-07-31',
      checkOut: '2023-08-07',
      cost: 1200,
      confirmationNumber: '2929457723',
      phone: '+1 608-245-0123',
    },
  ],
  expenses: [
    { label: 'Bilhetes CrossFit Games', amount: 438.86 },
    { label: 'Voos (ida e volta)', amount: 2827.70 },
    { label: 'Guest House Guerra Junqueiro (1 noite)', amount: 69 },
    { label: 'La Quinta Madison (7 noites)', amount: 1200 },
    { label: 'ESTA', amount: 40 },
    { label: 'CP Comboios', amount: 29 },
  ],
  foods: [
    { name: 'Cheese Curds', description: 'Classic Wisconsin appetizer - crispy, golden, and unforgettable' },
    { name: 'Old Fashioned', description: 'The Wisconsin way with brandy, not bourbon' },
    { name: 'Butter Burger', description: 'A Midwest staple done right' },
  ],
  notes: 'Uma semana incrivel a assistir aos Fittest on Earth! Conhecemos o Rich Froning e exploramos o centro de Madison junto ao lago. A energia foi incomparavel! Viajamos desde Lisboa com escalas em Madrid e Chicago - uma aventura epica do inicio ao fim.',
  tags: ['adventure', 'fitness', 'crossfit'],
};

console.log('Upserting initial trip into public.trips...');
const { error } = await supabase
  .from('trips')
  .upsert([tripRow], { onConflict: 'id' });

if (error) {
  console.error('Failed to import trip:', error);
  process.exit(1);
}

const { data: inserted, error: verifyError } = await supabase
  .from('trips')
  .select('id, title, destination, start_date, end_date, photos')
  .eq('id', tripId)
  .single();

if (verifyError) {
  console.error('Trip inserted, but verification failed:', verifyError);
  process.exit(1);
}

const photoCount = Array.isArray(inserted.photos) ? inserted.photos.length : 0;
console.log(`Imported trip: ${inserted.title} (${inserted.destination})`);
console.log(`Trip id: ${inserted.id}`);
console.log(`Photos imported: ${photoCount}`);
