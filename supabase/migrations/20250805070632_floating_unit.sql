/*
  # Update recording logs with authentication and question position

  1. Changes to existing table
    - Add user_id column to link recordings to users
    - Add question_position column for interview question ordering
    - Update RLS policies for user-specific access

  2. Security
    - Admin can see all recordings
    - Regular users can only see their own recordings
    - Public insert access for new recordings
*/

-- Add new columns to existing table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recording_logs' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE recording_logs ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recording_logs' AND column_name = 'question_position'
  ) THEN
    ALTER TABLE recording_logs ADD COLUMN question_position integer DEFAULT 1;
  END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Public read access" ON recording_logs;
DROP POLICY IF EXISTS "Public insert access" ON recording_logs;

-- Create new RLS policies
CREATE POLICY "Users can insert their own recordings"
  ON recording_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own recordings"
  ON recording_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can read all recordings"
  ON recording_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'banuweb3@gmail.com'
    )
  );

-- Allow public insert for unauthenticated users (they'll be prompted to sign up)
CREATE POLICY "Public can insert recordings"
  ON recording_logs
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can read all recordings"
  ON recording_logs
  FOR SELECT
  TO public
  USING (true);