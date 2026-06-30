// src/config/supabase.js
// Supabase client singleton – backend only (Service Role key)
// WARNING: This file is never bundled for the frontend; it lives only on the server (Render).

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // service_role key – keep secret!

let supabase = null;

export function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn('[Supabase] SUPABASE_URL or SUPABASE_SERVICE_KEY not set');
    return null;
  }
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
  return supabase;
}

export default getSupabaseClient();