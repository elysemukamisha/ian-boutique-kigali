-- ============================================================
-- IAN BOUTIQUE — Supabase Database Setup
-- 
-- HOW TO RUN:
-- 1. Go to https://supabase.com/dashboard/project/ztvznseyaihsptbvvxdb
-- 2. Click "SQL Editor" in the left sidebar
-- 3. Paste this entire script and click "Run"
-- ============================================================

-- 1. SUITS TABLE (shared stock across both locations)
CREATE TABLE IF NOT EXISTS suits (
  id          TEXT PRIMARY KEY,
  code        TEXT NOT NULL,
  title       TEXT NOT NULL,
  color       TEXT NOT NULL,
  color_hex   TEXT DEFAULT '#D4AF37',
  price_rwf   INTEGER DEFAULT 35000,
  category    TEXT DEFAULT 'Suit',
  image_path  TEXT DEFAULT '/suits/2037-white.png',
  stock       JSONB DEFAULT '{"46":0,"48":0,"50":0,"52":0,"54":0,"56":0}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RENTALS TABLE
CREATE TABLE IF NOT EXISTS rentals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suit_id         TEXT REFERENCES suits(id),
  size            TEXT NOT NULL,
  location        TEXT NOT NULL,
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT NOT NULL,
  notes           TEXT DEFAULT '',
  rental_date     TIMESTAMPTZ DEFAULT NOW(),
  return_date     TIMESTAMPTZ NOT NULL,
  returned_at     TIMESTAMPTZ,
  return_location TEXT DEFAULT '',
  status          TEXT DEFAULT 'On Rent',
  condition       TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Row Level Security — allow all (client-side auth is sufficient for boutique use)
ALTER TABLE suits   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all suits"   ON suits;
DROP POLICY IF EXISTS "Allow all rentals" ON rentals;
CREATE POLICY "Allow all suits"   ON suits   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all rentals" ON rentals FOR ALL USING (true) WITH CHECK (true);

-- 4. Enable Realtime for cross-location live sync
ALTER PUBLICATION supabase_realtime ADD TABLE suits;
-- 5. Seed dynamic examples (56 tuxedos, 77 pants exactly)
-- Clears previous dummy data to guarantee exact counts
TRUNCATE TABLE suits CASCADE;

INSERT INTO suits (id, code, title, color, color_hex, price_rwf, category, image_path, stock) VALUES
  -- 56 Tuxedos Total
  ('suit-1-white', '2037-WHT', 'Ian 2037 White Patterned Tuxedo',  'White / Black Velvet', '#F5F5F5', 45000, 'Suit', '/suits/2037-white.png',   '{"46":2,"48":2,"50":2,"52":1,"54":1,"56":1}'), -- 9
  ('suit-2-grey',  'SLIM-GRY', 'Ian Slim Fit Slate Grey Tuxedo',   'Slate Grey',           '#6B7280', 35000, 'Suit', '/suits/slim-grey.png',    '{"46":1,"48":3,"50":3,"52":2,"54":1,"56":0}'), -- 10
  ('suit-3-brown', 'BROWN-DB', 'Ian Royal Double Breasted Brown',  'Mocha Brown',          '#78350F', 40000, 'Suit', '/suits/brown-db.png',     '{"46":2,"48":2,"50":2,"52":2,"54":1,"56":1}'), -- 10
  ('suit-4-navy',  '628-15#',  'Daniel Collin Navy Grid 3-Piece',  'Deep Navy Plaid',      '#1E3A8A', 38000, 'Suit', '/suits/daniel-navy.png',  '{"46":1,"48":2,"50":3,"52":2,"54":1,"56":1}'), -- 10
  ('suit-5-black', '628-6#',   'Daniel Collin Obsidian Black',     'Obsidian Black',       '#1C1C1E', 38000, 'Suit', '/suits/daniel-black.png', '{"46":1,"48":1,"50":2,"52":2,"54":1,"56":1}'), -- 8
  ('suit-6-wine',  '628-9#',   'Daniel Collin Wine Velvet Tuxedo', 'Burgundy / Wine',      '#722F37', 42000, 'Suit', '/suits/daniel-black.png', '{"46":2,"48":2,"50":2,"52":1,"54":1,"56":1}'), -- 9

  -- 77 Pants Total
  ('pant-1-blk',   'PNT-BLK',  'Classic Obsidian Black Tux Pant',  'Black',                '#000000', 15000, 'Pants','/suits/daniel-black.png', '{"28":1,"30":2,"32":3,"34":2,"36":2,"38":1,"40":1,"42":1,"44":0}'), -- 13
  ('pant-2-navy',  'PNT-NVY',  'Daniel Collin Navy Tailored Pant', 'Navy Blue',            '#1E3A8A', 15000, 'Pants','/suits/daniel-navy.png',  '{"28":2,"30":2,"32":2,"34":2,"36":2,"38":1,"40":1,"42":1,"44":0}'), -- 13
  ('pant-3-grey',  'PNT-GRY',  'Slim Slate Grey Formal Pant',      'Slate Grey',           '#6B7280', 15000, 'Pants','/suits/slim-grey.png',    '{"28":1,"30":2,"32":2,"34":3,"36":2,"38":1,"40":1,"42":1,"44":0}'), -- 13
  ('pant-4-brwn',  'PNT-BRN',  'Royal Mocha Brown Dress Pant',     'Mocha Brown',          '#78350F', 15000, 'Pants','/suits/brown-db.png',     '{"28":1,"30":1,"32":3,"34":3,"36":2,"38":1,"40":1,"42":1,"44":0}'), -- 13
  ('pant-5-wht',   'PNT-WHT',  'Ian White Patterned Pant',         'White',                '#F5F5F5', 18000, 'Pants','/suits/2037-white.png',   '{"28":1,"30":1,"32":2,"34":2,"36":3,"38":2,"40":1,"42":1,"44":0}'), -- 13
  ('pant-6-khk',   'PNT-KHK',  'Classic Khaki Dress Pant',         'Khaki / Beige',        '#C3B091', 12000, 'Pants','/suits/brown-db.png',     '{"28":1,"30":2,"32":2,"34":2,"36":2,"38":1,"40":1,"42":1,"44":0}')  -- 12
ON CONFLICT (id) DO NOTHING;

-- Done! ✅
SELECT 'Database setup complete! ' || COUNT(*) || ' suits seeded.' AS status FROM suits;
