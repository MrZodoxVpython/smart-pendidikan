import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_URL, SUPABASE_ANON_KEY, dan SUPABASE_SERVICE_KEY wajib diisi di backend/.env');
  process.exit(1);
}
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
export const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, opts);
export const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, opts);
