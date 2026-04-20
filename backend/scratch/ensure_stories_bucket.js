const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function ensureStoriesBucket() {
  try {
    console.log(`Checking project: ${supabaseUrl}`);
    
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) throw listError;

    const exists = buckets.find(b => b.name === 'stories');

    if (exists) {
      console.log('✅ Bucket "stories" already exists.');
      if (!exists.public) {
        console.log('Updating bucket to be public...');
        const { error: updateError } = await supabase.storage.updateBucket('stories', { public: true });
        if (updateError) throw updateError;
        console.log('✅ Bucket "stories" is now PUBLIC.');
      }
    } else {
      console.log('Creating bucket "stories"...');
      const { error: createError } = await supabase.storage.createBucket('stories', { public: true });
      if (createError) throw createError;
      console.log('✅ Bucket "stories" created SUCCESSFULLY.');
    }

    // List again to verify
    const { data: finalBuckets } = await supabase.storage.listBuckets();
    console.log('--- Final Buckets ---');
    finalBuckets.forEach(b => console.log(`- ${b.name} (Public: ${b.public})`));

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

ensureStoriesBucket();
