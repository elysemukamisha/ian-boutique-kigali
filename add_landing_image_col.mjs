// Run with: node add_landing_image_col.mjs
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ztvznseyaihsptbvvxdb.supabase.co',
  'sb_publishable_DYO5nIWJBiNdr8A7FQbp-Q_9ib2BKBa'
);

// We can't run DDL via anon key — just update Mario Casa with its AI landing image
// The column needs to be added via Supabase SQL Editor:
// ALTER TABLE suits ADD COLUMN IF NOT EXISTS landing_image_path TEXT;

console.log('ℹ️  Please run this SQL in your Supabase SQL Editor:');
console.log('ALTER TABLE suits ADD COLUMN IF NOT EXISTS landing_image_path TEXT;');
console.log('');
console.log('Then run this script again after the column is added.');
