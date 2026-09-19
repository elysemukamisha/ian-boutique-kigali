// One-time seeder — run with: node seed_mario_casa.mjs
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ztvznseyaihsptbvvxdb.supabase.co',
  'sb_publishable_DYO5nIWJBiNdr8A7FQbp-Q_9ib2BKBa'
);

const { error } = await supabase.from('suits').upsert({
  id:         'suit-mario-casa-blue',
  code:       'TUX-6618-BLUE',
  title:      'Mario Casa Dark Blue Plain',
  color:      'Dark Navy Blue / Plain',
  color_hex:  '#1B2A4A',
  price_rwf:  35000,
  category:   'Suit',
  image_path: '/suits/mario-casa-blue.png',
  stock: { "46":2, "48":3, "50":3, "52":3, "54":2, "56":2, "58":1 }
}, { onConflict: 'id' });

if (error) {
  console.error('❌ Error:', error.message);
} else {
  console.log('✅ Mario Casa Dark Blue Plain added! (16 units across sizes 46–58)');
}
