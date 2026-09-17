// Supabase config shared across all portals
export const SUPABASE_URL = 'https://ztvznseyaihsptbvvxdb.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_DYO5nIWJBiNdr8A7FQbp-Q_9ib2BKBa';

// Role passwords (client-side for simplicity — suitable for boutique internal use)
export const STAFF_PASSWORD = 'ian123';
export const ADMIN_PASSWORD = 'Holyone77';

export const SIZES = ['46','48','50','52','54','56'];
export const LOCATIONS = ['Ian Boutique Kigali', 'Ian Collection'];

export const DEFAULT_SUITS = [
  { id:'suit-2037-white', code:'2037-WHITE', title:'Ian 2037 White Patterned Tuxedo', color:'White / Black Velvet', color_hex:'#F5F5F5', price_rwf:45000, image_path:'/suits/2037-white.png', stock:{"46":3,"48":4,"50":5,"52":4,"54":3,"56":2} },
  { id:'suit-slim-grey',  code:'SLIM-GREY',  title:'Ian Slim Fit Slate Grey Tuxedo', color:'Slate Grey', color_hex:'#6B7280', price_rwf:35000, image_path:'/suits/slim-grey.png', stock:{"46":4,"48":4,"50":5,"52":6,"54":3,"56":2} },
  { id:'suit-brown-db',   code:'BROWN-DB',   title:'Ian Royal Double Breasted Brown', color:'Mocha Brown', color_hex:'#78350F', price_rwf:40000, image_path:'/suits/brown-db.png', stock:{"46":2,"48":3,"50":4,"52":4,"54":2,"56":1} },
  { id:'suit-daniel-navy',code:'628-15#',    title:'Daniel Collin Navy Grid 3-Piece', color:'Deep Navy Plaid', color_hex:'#1E3A8A', price_rwf:38000, image_path:'/suits/daniel-navy.png', stock:{"46":3,"48":5,"50":7,"52":5,"54":3,"56":2} },
  { id:'suit-daniel-black',code:'628-6#',   title:'Daniel Collin Obsidian Black 3-Piece', color:'Obsidian Black', color_hex:'#1C1C1E', price_rwf:38000, image_path:'/suits/daniel-black.png', stock:{"46":3,"48":4,"50":6,"52":5,"54":3,"56":2} },
];
