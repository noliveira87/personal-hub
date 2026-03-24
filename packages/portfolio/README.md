# Portfolio App

Portfolio tracker with local-first behavior and Supabase synchronization.

## Setup Supabase

1. Open your Supabase project dashboard.
2. Go to SQL Editor and run `supabase/schema.sql`.
3. In `packages/portfolio`, create `.env.local` from `.env.example`.
4. Fill these variables:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Run

```bash
npm run dev
```

## How sync works

- App still boots from localStorage for fast load.
- If Supabase is configured, data is hydrated from DB.
- If DB is empty, initial local data is seeded automatically.
- Changes are persisted to both localStorage and Supabase.
