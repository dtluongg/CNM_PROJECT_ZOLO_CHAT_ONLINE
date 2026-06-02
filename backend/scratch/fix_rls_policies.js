const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Sử dụng schema 'storage' để can thiệp vào cấu hình
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'storage' }
});

async function fixPolicies() {
  try {
    console.log(`Attempting to add policies for bucket 'stories' in ${supabaseUrl}`);

    // BƯỚC 1: Kiểm tra xem đã có policy nào chưa
    const { data: existingPolicies, error: listError } = await supabase
      .from('policies')
      .select('*')
      .eq('bucket_id', 'stories');

    if (listError) {
      console.log('Cant access storage.policies directly, trying RPC or another way...');
      throw listError;
    }

    console.log('Existing policies:', existingPolicies.length);

    // BƯỚC 2: Thêm chính sách cho phép toàn quyền (INSERT, SELECT, UPDATE, DELETE)
    // Supabase storage policies thường có định dạng:
    // name, definition, check, operation
    const policiesToAdd = [
      { name: 'Public_Insert', bucket_id: 'stories', operation: 'INSERT', definition: '(role() = \'authenticated\')' },
      { name: 'Public_Select', bucket_id: 'stories', operation: 'SELECT', definition: 'true' },
      { name: 'Public_Update', bucket_id: 'stories', operation: 'UPDATE', definition: '(role() = \'authenticated\')' },
      { name: 'Public_Delete', bucket_id: 'stories', operation: 'DELETE', definition: '(role() = \'authenticated\')' }
    ];

    for (const p of policiesToAdd) {
      const exists = existingPolicies.find(ep => ep.name === p.name);
      if (!exists) {
        console.log(`Adding policy: ${p.name}...`);
        const { error: insertError } = await supabase.from('policies').insert(p);
        if (insertError) console.error(`Failed to add ${p.name}:`, insertError.message);
        else console.log(`✅ Added ${p.name}`);
      } else {
        console.log(`Policy ${p.name} already exists.`);
      }
    }

    console.log('🎉 Done!');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\n--- Hướng dẫn cho người dùng ---');
    console.log('Tôi không thể can thiệp bằng code vào SQL. Bạn hãy mở link sau và chọn "Enable all access":');
    console.log(`https://supabase.com/dashboard/project/jtkqwhkrpsryzgnxbsfx/storage/policies`);
  }
}

fixPolicies();
