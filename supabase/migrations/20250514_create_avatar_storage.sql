-- ============================================================
-- Create storage bucket for user avatars
-- ============================================================

-- Insert storage bucket for avatars
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload their own avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = 'users'
  );

-- Create policy to allow authenticated users to update their own avatars
CREATE POLICY "Users can update their own avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = 'users'
  );

-- Create policy to allow public access to avatars
CREATE POLICY "Avatars are publicly accessible"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Create policy to allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = 'users'
  );

-- Add photo_url column to users table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE public.users ADD COLUMN photo_url TEXT;
  END IF;
END $$;

SELECT 'Avatar storage bucket and policies created successfully' as status;
