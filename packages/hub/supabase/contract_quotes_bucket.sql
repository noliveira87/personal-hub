-- Create the contract-quotes storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contract-quotes',
  'contract-quotes',
  true,
  10485760, -- 10MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Authenticated users can upload quote PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Public can read quote PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update quote PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete quote PDFs" ON storage.objects;

-- Policy: allow upload (anon + authenticated)
CREATE POLICY "Anyone can upload quote PDFs"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'contract-quotes');

-- Policy: allow public read
CREATE POLICY "Public can read quote PDFs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'contract-quotes');

-- Policy: allow update (anon + authenticated)
CREATE POLICY "Anyone can update quote PDFs"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'contract-quotes');

-- Policy: allow delete (anon + authenticated)
CREATE POLICY "Anyone can delete quote PDFs"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'contract-quotes');
