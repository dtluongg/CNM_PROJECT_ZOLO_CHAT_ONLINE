const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBuckets() {
  try {
    console.log(`Checking project: ${supabaseUrl}`);
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error('❌ Error listing buckets:', error.message);
      return;
    }

    console.log('--- Current Buckets ---');
    if (buckets.length === 0) {
      console.log('No buckets found! You MUST create them.');
    } else {
      buckets.forEach(b => {
        console.log(`- Name: "${b.name}", Public: ${b.public}, ID: ${b.id}`);
      });
    }

    // Kiểm tra chính xác bucket 'stories'
    const storiesBucket = buckets.find(b => b.name === 'stories');
    if (!storiesBucket) {
      console.log('\n❌ Bucket "stories" is MISSING!');
    } else {
      console.log('\n✅ Bucket "stories" exists.');
      if (!storiesBucket.public) {
        console.log('⚠️ WARNING: Bucket "stories" is NOT PUBLIC. Please set it to Public.');
      }
    }

  } catch (err) {
    console.error('❌ Critical error:', err.message);
  }
}

checkBuckets();
