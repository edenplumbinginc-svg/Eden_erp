import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase env missing: check VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in Replit Secrets.');
  console.error('VITE_SUPABASE_URL should be https://[project-ref].supabase.co (not the database URL)');
  throw new Error('Supabase misconfigured - missing environment variables');
}

if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
  console.error('❌ VITE_SUPABASE_URL is incorrect:', supabaseUrl);
  console.error('Expected format: https://[project-ref].supabase.co');
  console.error('Got:', supabaseUrl);
  throw new Error('Supabase misconfigured - incorrect URL format');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
