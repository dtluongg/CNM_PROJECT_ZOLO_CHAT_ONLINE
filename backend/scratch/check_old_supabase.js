const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qrtlxbxfhrzdsyftrnoe.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFydGx4YnhmaHJ6ZHN5ZnRybm9lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTEyNjQwNSwiZXhwIjoyMDkwNzAyNDA1fQ.T3fTIyJI9AU208vpQ-Z9md4BDzAGYc9xu2tcRINkUxQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOldBuckets() {
  try {
    console.log(`Checking OLD project: ${supabaseUrl}`);
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    console.log('--- Current Buckets ---');
    buckets.forEach(b => {
      console.log(`- Name: "${b.name}", Public: ${b.public}`);
    });
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}
checkOldBuckets();
