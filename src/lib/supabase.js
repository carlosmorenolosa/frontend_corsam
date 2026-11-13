// src/lib/supabase.js
// Single Supabase client instance for the whole app.
//
// Credentials come from Vite environment variables (VITE_SUPABASE_URL,
// VITE_SUPABASE_ANON_KEY). The anon key is a public browser key: access
// control is enforced by Supabase RLS policies, never by hiding the key.
//
// Fails fast with a clear message when environment configuration is
// missing, instead of letting every screen break later with cryptic
// fetch errors.

import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client = null;

export const getSupabaseClient = () => {
  if (client) return client;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      'Falta configuracion de Supabase: define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'
    );
  }
  client = createClient(SUPABASE_URL, SUPABASE_KEY);
  return client;
};
