/*
# Voice Interview Recording System

1. New Tables
   - `recording_logs`
     - `id` (uuid, primary key)
     - `candidate_name` (text, required)
     - `question_label` (text, required) 
     - `file_url` (text, required) - public URL to audio file
     - `created_at` (timestamp with timezone, default now)

2. Storage
   - Create 'recordings' bucket for audio files
   - Enable public access for audio playback

3. Security
   - Enable RLS on recording_logs table
   - Allow public read access for recordings list
   - Allow public insert for new recordings
*/

-- Create the recording_logs table
CREATE TABLE IF NOT EXISTS recording_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_name text NOT NULL,
  question_label text NOT NULL,
  file_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE recording_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all recording logs
CREATE POLICY "Public read access"
  ON recording_logs
  FOR SELECT
  TO public
  USING (true);

-- Allow public insert access for new recordings
CREATE POLICY "Public insert access"
  ON recording_logs
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create storage bucket for recordings (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to recordings bucket
CREATE POLICY "Public read access to recordings"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'recordings');

-- Allow public upload to recordings bucket
CREATE POLICY "Public upload to recordings"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'recordings');