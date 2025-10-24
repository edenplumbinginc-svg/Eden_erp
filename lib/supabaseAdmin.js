const { createClient } = require('@supabase/supabase-js');

// Use VITE_SUPABASE_URL (project URL) instead of SUPABASE_URL (database URL)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️  Supabase Admin client not configured: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.warn('   Admin user lookup features will be unavailable.');
  module.exports = { supabaseAdmin: null };
} else if (!supabaseUrl.startsWith('https://')) {
  console.warn('⚠️  SUPABASE_URL must be an HTTPS URL (e.g., https://xxx.supabase.co)');
  console.warn('   Current value appears to be a database URL, not a Supabase project URL');
  console.warn('   Admin user lookup features will be unavailable.');
  module.exports = { supabaseAdmin: null };
} else {
  const supabaseAdmin = createClient(
    supabaseUrl,
    supabaseServiceKey,
    { 
      auth: { 
        persistSession: false, 
        autoRefreshToken: false 
      } 
    }
  );

  console.log('✅ Supabase Admin client initialized for user management');
  module.exports = { supabaseAdmin };
}
