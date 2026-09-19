// Universal item seeder — add new suits/pants to inventory
// Usage: edit the ITEM object below, then run: node seed_item.mjs
// 
// image_path        = real product photo (used in Staff & Admin portals)
// landing_image_path = AI-styled image (used on public landing page only)
//                      Set to null if you want same photo on landing page

import { createClient } from '@supabase/supabase-js';
import { copyFileSync, existsSync } from 'fs';
import path from 'path';

const supabase = createClient(
  'https://ztvznseyaihsptbvvxdb.supabase.co',
  'sb_publishable_DYO5nIWJBiNdr8A7FQbp-Q_9ib2BKBa'
);

// ─────────────────────────────────────────────
// ✏️  EDIT THIS FOR EACH NEW ITEM
// ─────────────────────────────────────────────
const ITEM = {
  id:                 'suit-mario-casa-blue',           // unique ID (no spaces)
  code:               'TUX-6618-BLUE',                  // must start with TUX- or PNT-
  title:              'Mario Casa Dark Blue Plain',
  color:              'Dark Navy Blue / Plain',
  color_hex:          '#1B2A4A',
  price_rwf:          35000,
  category:           'Suit',                           // 'Suit' or 'Pants'

  // Real product photo — shown in Staff & Admin portals
  image_path:         '/suits/mario-casa-blue.png',

  // AI-styled image for public landing page (null = use image_path)
  landing_image_path: '/suits/mario-casa-blue-landing.png',

  // Stock per size
  // Suit sizes:  46 48 50 52 54 56 58
  // Pants sizes: 28 30 32 34 36 38 40 42 44
  stock: { "46":2, "48":3, "50":3, "52":3, "54":2, "56":2, "58":1 }
};
// ─────────────────────────────────────────────

async function run() {
  const { error } = await supabase.from('suits').upsert(ITEM, { onConflict: 'id' });
  if (error) {
    console.error('❌ Error:', error.message);
  } else {
    const total = Object.values(ITEM.stock).reduce((a,b) => a+b, 0);
    console.log(`✅ ${ITEM.title} (${ITEM.code}) added! ${total} units total.`);
    console.log(`   📸 Staff image:   ${ITEM.image_path}`);
    console.log(`   🖼️  Landing image: ${ITEM.landing_image_path || '(same as staff)'}`);
  }
}

run();
