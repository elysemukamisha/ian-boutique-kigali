/* Shared DB layer */
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://ztvznseyaihsptbvvxdb.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_DYO5nIWJBiNdr8A7FQbp-Q_9ib2BKBa';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const SIZES = ['46','48','50','52','54','56'];
export const PANTS_SIZES = ['28','30','32','34','36','38','40','42','44'];
export const LOCATIONS = ['Ian Boutique Kigali','Ian Collection'];
export const STAFF_PASSWORD = 'ian123';
export const ADMIN_PASSWORD = 'Holyone77';

/* ── SUITS ── */
export async function getSuits() {
  const { data, error } = await supabase.from('suits').select('*').order('title');
  if (error) { console.error(error); return []; }
  return data || [];
}
export async function updateSuitStock(id, stock) {
  const { error } = await supabase.from('suits').update({ stock }).eq('id', id);
  if (error) throw error;
}
export async function updateSuitPrice(id, price_rwf) {
  const { error } = await supabase.from('suits').update({ price_rwf }).eq('id', id);
  if (error) throw error;
}
export async function upsertSuit(suit) {
  const { error } = await supabase.from('suits').upsert(suit, { onConflict: 'id' });
  if (error) throw error;
}

/* ── RENTALS ── */
export async function getRentals() {
  const { data, error } = await supabase
    .from('rentals')
    .select('*, suits(title,code,color,image_path,price_rwf)')
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}
export async function createRental(r) {
  const { data, error } = await supabase.from('rentals').insert(r).select().single();
  if (error) throw error;
  return data;
}
export async function markReturned(id, condition, restock_location) {
  const { error } = await supabase.from('rentals')
    .update({ status: 'Returned', condition, return_location: restock_location, returned_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/* ── REALTIME ── */
export function subscribeAll(onChange) {
  return supabase.channel('ian_live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'suits' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rentals' }, onChange)
    .subscribe();
}

/* ── UTILS ── */
export function addBusinessDays(date, n) {
  let d = new Date(date), added = 0;
  while(added < n){ d.setDate(d.getDate()+1); if(d.getDay()!==0&&d.getDay()!==6) added++; }
  return d;
}
export function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
}
export function fmtMoney(n) {
  return Number(n||0).toLocaleString() + ' RWF';
}
export function getRentalStatus(returnDate) {
  const today = new Date().setHours(0,0,0,0);
  const ret = new Date(returnDate).setHours(0,0,0,0);
  if (ret < today) return 'overdue';
  if (ret === today) return 'due-today';
  return 'on-rent';
}
