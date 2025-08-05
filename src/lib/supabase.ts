import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface RecordingLog {
  id?: string;
  candidate_name: string;
  question_label: string;
  question_position?: number;
  file_url: string;
  user_id?: string;
  created_at?: string;
}

export interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
  };
}

// Check if user is admin
export const isAdmin = (user: User | null): boolean => {
  return user?.email === 'banuweb3@gmail.com';
};