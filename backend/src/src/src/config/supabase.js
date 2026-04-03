const { createClient } = require('@supabase/supabase-js');

// Client cho admin operations (server-side only)
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY, // ⚠️ PHẢI là SERVICE ROLE KEY, không phải anon key
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// Client cho user operations
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

module.exports = { supabase, supabaseAdmin };