// Run with: node run_migration.mjs
// Adds landing_image_path column to suits table in Supabase
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ztvznseyaihsptbvvxdb.supabase.co',
  'sb_publishable_DYO5nIWJBiNdr8A7FQbp-Q_9ib2BKBa'
);

// Test if column already exists by reading a suit
const { data, error } = await supabase.from('suits').select('landing_image_path').limit(1);

if (error && error.message.includes('landing_image_path')) {
  console.log('⚠️  Column does not exist yet.');
  console.log('');
  console.log('Please run this SQL in your Supabase dashboard:');
  console.log('👉  https://supabase.com/dashboard/project/ztvznseyaihsptbvvxdb/sql/new');
  console.log('');
  console.log('ALTER TABLE suits ADD COLUMN IF NOT EXISTS landing_image_path TEXT;');
  console.log('');
  console.log('Then re-run this script to verify.');
} else {
  console.log('✅ landing_image_path column is already in the database!');
}
