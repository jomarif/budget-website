// Supabase client for cloud sync. Reads config from Vite env vars (see .env.local).
// The anon/publishable key is safe to expose in frontend code — access is
// enforced server-side by Row Level Security policies on each table.

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn('Supabase env vars missing — cloud sync disabled. See .env.local.');
}

export const supabase = url && anonKey ? createClient(url, anonKey) : null;
