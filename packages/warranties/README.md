# Home Warranty Hub

Track product warranties with purchase date, duration, receipt, and store details.

## Run locally

1. Install dependencies:

	`npm install`

2. Create local env file:

	`cp .env.example .env.local`

3. Fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`.

4. Start dev server:

	`npm run dev`

## Supabase setup

1. Open Supabase SQL Editor.
2. Run [supabase/schema.sql](supabase/schema.sql).
3. Confirm table `public.warranties` exists.
4. Keep Row Level Security enabled and verify the 4 anon policies were created.

## Build and tests

- Build: `npm run build`
- Tests: `npm test`
