/* Admin Portal Logic
   - Login gate: Holyone77
   - Price management (per suit)
   - End-of-day report with PDF download/share
   - Full inventory view
   - All rentals visible with prices
*/
import {
  getSuits, getRentals, updateSuitPrice, subscribeAll,
  fmtDate, fmtMoney, getRentalStatus, SIZES, PANTS_SIZES, ADMIN_PASSWORD
} from './db.js';

/* ── AUTH ── */
const SESSION_KEY = 'ian_admin_auth';
let authed = sessionStorage.getItem(SESSION_KEY) === 'yes';

function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appShell').classList.remove('hidden');
  boot();
}
function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appShell').classList.add('hidden');
}
document.getElementById('loginForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const pw = document.getElementById('loginPassword').value;
  if (pw === ADMIN_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, 'yes');
    authed = true;
    document.getElementById('loginError').classList.add('hidden');
    showApp();
  } else {
    document.getElementById('loginError').classList.remove('hidden');
    document.getElementById('loginPassword').value = '';
  }
});
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  sessionStorage.removeItem(SESSION_KEY);
  showLogin();
});

/* ── TOAST ── */
function showToast(msg) {
  const el = document.getElementById('toastAlert');
  const m  = document.getElementById('toastMessage');
  if (!el||!m) return;
  m.innerHTML = msg;
  el.classList.remove('hidden');
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(window._tt);
  window._tt = setTimeout(() => el.classList.remove('show'), 5500);
}
document.getElementById('toastCloseBtn')?.addEventListener('click', () => {
  document.getElementById('toastAlert')?.classList.remove('show');
});

/* ── STATE ── */
let suits = [], rentals = [], currentTab = 'prices';

/* ── DATA ── */
async function loadData() {
  [suits, rentals] = await Promise.all([getSuits(), getRentals()]);
}

/* ── REALTIME ── */
subscribeAll(async () => { await loadData(); renderCurrentTab(); });

/* ── KPIs ── */
function renderKPIs() {
  const total = suits.reduce((a,s)=>{
    const szArr = s.category === 'Pants' ? PANTS_SIZES : SIZES;
    return a+szArr.reduce((b,sz)=>b+(s.stock?.[sz]||0),0);
  },0);
  const active = rentals.filter(r=>r.status!=='Returned');
  const today = new Date(); today.setHours(0,0,0,0);
  const overdue = active.filter(r=>new Date(r.return_date)<today).length;

  // Today's revenue = rentals created today × price
  const todayStr = today.toISOString().split('T')[0];
  const todayRentals = rentals.filter(r=>(r.created_at||'').startsWith(todayStr));
  const revenue = todayRentals.reduce((a,r)=>{
    const suit = suits.find(s=>s.id===r.suit_id);
    return a + (suit?.price_rwf || r.suits?.price_rwf || 0);
  }, 0);

  document.getElementById('kpiStock').textContent = total;
  document.getElementById('kpiActiveRentals').textContent = active.length;
  document.getElementById('kpiOverdue').textContent = overdue;
  document.getElementById('kpiTodayRevenue').textContent = revenue > 0 ? (revenue/1000).toFixed(0)+'K' : '0';
}

/* ── TAB: PRICES ── */
function renderPrices() {
  const container = document.getElementById('pricesList');
  if (!container) return;
  if (!suits.length) {
    container.innerHTML = `<div class="empty-state"><p>No suits found. Add suits from the Staff Portal.</p></div>`;
    return;
  }
  container.innerHTML = suits.map(suit => `
    <div class="price-row">
      <div class="price-suit-info">
        <img class="price-thumb" src="${suit.image_path}" alt="${suit.title}" onerror="this.src='/suits/2037-white.png'"/>
        <div>
          <div class="price-name">${suit.title}</div>
          <div class="price-code">${suit.code} · ${suit.color}</div>
        </div>
      </div>
      <div class="price-input-wrap">
        <input class="price-input" type="number" min="0" step="1000"
          value="${suit.price_rwf || 0}" id="price-${suit.id}"
          placeholder="RWF"/>
        <button class="price-save-btn" onclick="window.savePrice('${suit.id}')">Save</button>
      </div>
    </div>
  `).join('');
}

window.savePrice = async function(suitId) {
  const input = document.getElementById(`price-${suitId}`);
  const price = parseInt(input?.value) || 0;
  try {
    await updateSuitPrice(suitId, price);
    showToast(`✅ Price updated to ${fmtMoney(price)}`);
    await loadData(); renderKPIs();
  } catch(e) { showToast(`❌ ${e.message}`); }
};

/* ── TAB: REPORT ── */
function renderReport(dateStr) {
  const dayRentals = rentals.filter(r => {
    const d = (r.created_at||'').split('T')[0];
    return d === dateStr;
  });
  const dayReturns = rentals.filter(r => {
    const d = (r.returned_at||r.updated_at||'').split('T')[0];
    return d === dateStr && r.status === 'Returned';
  });
  const revenue = dayRentals.reduce((a,r)=>{
    const suit = suits.find(s=>s.id===r.suit_id);
    return a + (suit?.price_rwf || r.suits?.price_rwf || 0);
  }, 0);

  document.getElementById('rptRentals').textContent  = dayRentals.length;
  document.getElementById('rptReturns').textContent  = dayReturns.length;
  document.getElementById('rptRevenue').textContent  = fmtMoney(revenue);

  const rows = dayRentals.length ? dayRentals.map(r => {
    const suit = suits.find(s=>s.id===r.suit_id);
    const price = suit?.price_rwf || r.suits?.price_rwf || 0;
    const st = getRentalStatus(r.return_date);
    const badgeMap = { 'on-rent':'On Rent','due-today':'Due Today','overdue':'Overdue','returned':'Returned' };
    return `<tr>
      <td><b>${suit?.title||r.suits?.title||'—'}</b><br/><small style="color:var(--text2)">${suit?.code||''}</small></td>
      <td><b>${r.size}</b></td>
      <td>${r.customer_name}<br/><small style="color:var(--text2)">${r.customer_phone}</small></td>
      <td>${r.location}</td>
      <td><span class="status-badge ${r.status==='Returned'?'returned':st}">${r.status==='Returned'?'Returned':badgeMap[st]||st}</span></td>
      <td><b>${fmtMoney(price)}</b></td>
    </tr>`;
  }).join('') : `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text2);">No rentals on this date</td></tr>`;

  document.getElementById('reportTableBody').innerHTML = rows;

  // Prepare print content
  document.getElementById('printDate').textContent = `Date: ${dateStr} | Generated: ${new Date().toLocaleString()}`;
  document.getElementById('printSummary').innerHTML = `
    <div style="background:#f5f5f5;border-radius:8px;padding:12px;text-align:center;">
      <div style="font-size:28px;font-weight:800;color:#8B5CF6;">${dayRentals.length}</div>
      <div style="font-size:11px;color:#666;text-transform:uppercase;margin-top:4px;">Rentals</div>
    </div>
    <div style="background:#f5f5f5;border-radius:8px;padding:12px;text-align:center;">
      <div style="font-size:28px;font-weight:800;color:#30D158;">${dayReturns.length}</div>
      <div style="font-size:11px;color:#666;text-transform:uppercase;margin-top:4px;">Returns</div>
    </div>
    <div style="background:#f5f5f5;border-radius:8px;padding:12px;text-align:center;">
      <div style="font-size:20px;font-weight:800;color:#D4AF37;">${fmtMoney(revenue)}</div>
      <div style="font-size:11px;color:#666;text-transform:uppercase;margin-top:4px;">Revenue</div>
    </div>`;
  document.getElementById('printTableBody').innerHTML = dayRentals.map(r=>{
    const suit = suits.find(s=>s.id===r.suit_id);
    const price = suit?.price_rwf||r.suits?.price_rwf||0;
    return `<tr>
      <td style="padding:8px;border:1px solid #ddd;">${suit?.title||'—'}</td>
      <td style="padding:8px;border:1px solid #ddd;">${r.size}</td>
      <td style="padding:8px;border:1px solid #ddd;">${r.customer_name} · ${r.customer_phone}</td>
      <td style="padding:8px;border:1px solid #ddd;">${r.location}</td>
      <td style="padding:8px;border:1px solid #ddd;">${r.status}</td>
      <td style="padding:8px;border:1px solid #ddd;font-weight:700;">${fmtMoney(price)}</td>
    </tr>`;
  }).join('');
}

// Set today as default date
document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('reportDateInput');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    dateInput.addEventListener('change', e => { if (suits.length) renderReport(e.target.value); });
  }
});

/* ── PDF DOWNLOAD ── */
document.getElementById('downloadPdfBtn')?.addEventListener('click', () => {
  const printEl = document.getElementById('printReport');
  if (!printEl) return;
  printEl.style.display = 'block';
  document.title = `Ian Boutique Report — ${document.getElementById('reportDateInput')?.value || new Date().toISOString().split('T')[0]}`;
  window.print();
  setTimeout(() => { printEl.style.display = 'none'; document.title = 'Ian Boutique — Admin Portal'; }, 1000);
});

/* ── SHARE ── */
document.getElementById('sharePdfBtn')?.addEventListener('click', async () => {
  const dateStr = document.getElementById('reportDateInput')?.value || new Date().toISOString().split('T')[0];
  const dayRentals = rentals.filter(r=>(r.created_at||'').startsWith(dateStr));
  const revenue = dayRentals.reduce((a,r)=>{
    const suit = suits.find(s=>s.id===r.suit_id);
    return a + (suit?.price_rwf||r.suits?.price_rwf||0);
  },0);

  const text = `📊 Ian Boutique Report — ${dateStr}
━━━━━━━━━━━━━━━━━
Rentals: ${dayRentals.length}
Returns: ${rentals.filter(r=>(r.returned_at||'').startsWith(dateStr)).length}
Revenue: ${fmtMoney(revenue)}
━━━━━━━━━━━━━━━━━
${dayRentals.map(r=>{
  const suit = suits.find(s=>s.id===r.suit_id);
  return `• ${suit?.title||'Suit'} (${r.size}) → ${r.customer_name} [${r.location}]`;
}).join('\n')}
Generated by Ian Boutique Management System`;

  if (navigator.share) {
    try { await navigator.share({ title:`Ian Boutique Report ${dateStr}`, text }); return; } catch {}
  }
  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(text);
    showToast('📋 Report copied to clipboard!');
  } catch {
    showToast('⚠️ Use Download PDF to export the report');
  }
});

/* ── TAB: INVENTORY ── */
function renderInventory() {
  const container = document.getElementById('inventoryList');
  if (!container) return;
  container.innerHTML = suits.map(suit => {
    const szArr = suit.category === 'Pants' ? PANTS_SIZES : SIZES;
    const sizePills = szArr.map(sz => {
      const qty = suit.stock?.[sz] || 0;
      const cls = qty === 0 ? 'empty' : qty <= 1 ? 'rented' : 'avail';
      return `<span class="slr-size-chip ${cls}">${sz}: ${qty}</span>`;
    }).join('');
    const total = szArr.reduce((a,sz)=>a+(suit.stock?.[sz]||0),0);
    return `<div class="price-row">
      <div class="price-suit-info">
        <img class="price-thumb" src="${suit.image_path}" alt="${suit.title}" onerror="this.src='/suits/2037-white.png'"/>
        <div style="min-width:0;">
          <div class="price-name">${suit.title}</div>
          <div class="price-code" style="margin-bottom:6px;">${suit.code} · ${fmtMoney(suit.price_rwf||0)}/3days</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;">${sizePills}</div>
        </div>
      </div>
      <div style="flex-shrink:0;text-align:center;">
        <div style="font-size:24px;font-weight:800;color:${total===0?'var(--red)':total<=3?'var(--amber)':'var(--green)'};">${total}</div>
        <div style="font-size:10px;color:var(--text2);">total</div>
      </div>
    </div>`;
  }).join('');
}

/* ── TAB: RENTALS (admin, with prices) ── */
function renderAdminRentals() {
  const container = document.getElementById('adminRentalsList');
  if (!container) return;
  const active = rentals.filter(r=>r.status!=='Returned');
  if (!active.length) {
    container.innerHTML = `<div class="empty-state"><p>No active rentals</p></div>`;
    return;
  }
  container.innerHTML = active.map(r => {
    const suit = suits.find(s=>s.id===r.suit_id);
    const price = suit?.price_rwf || r.suits?.price_rwf || 0;
    const st = getRentalStatus(r.return_date);
    const badgeMap={'on-rent':'On Rent','due-today':'Due Today','overdue':'Overdue'};
    return `<div class="price-row" style="flex-direction:column;gap:8px;align-items:flex-start;">
      <div style="display:flex;align-items:center;gap:10px;width:100%;">
        <img class="price-thumb" src="${suit?.image_path||'/suits/2037-white.png'}" alt="" onerror="this.src='/suits/2037-white.png'"/>
        <div style="flex:1;min-width:0;">
          <div class="price-name">${suit?.title||'Suit'} — Size ${r.size}</div>
          <div class="price-code">${r.customer_name} · ${r.customer_phone}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-weight:800;color:var(--gold);font-size:14px;">${fmtMoney(price)}</div>
          <span class="status-badge ${st}" style="display:inline-flex;margin-top:4px;">${badgeMap[st]||st}</span>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;width:100%;font-size:12px;color:var(--text2);">
        <span>📍 ${r.location}</span>
        <span>Due: ${fmtDate(r.return_date)}</span>
      </div>
    </div>`;
  }).join('');
}

/* ── RENDER CURRENT TAB ── */
function renderCurrentTab() {
  renderKPIs();
  if (currentTab === 'prices')    renderPrices();
  if (currentTab === 'report')    { const d=document.getElementById('reportDateInput')?.value; if(d) renderReport(d); }
  if (currentTab === 'inventory') renderInventory();
  if (currentTab === 'rentals')   renderAdminRentals();
}

/* ── TAB SWITCHING ── */
function switchTab(tab) {
  currentTab = tab;
  ['prices','report','inventory','rentals'].forEach(t=>{
    document.getElementById(t+'View')?.classList.toggle('hidden',t!==tab);
  });
  document.querySelectorAll('.itab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  renderCurrentTab();
}
document.querySelectorAll('.itab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));

/* ── BOOT ── */
async function boot() {
  await loadData();
  renderKPIs();
  renderPrices();
  // Generate today's report automatically
  const today = new Date().toISOString().split('T')[0];
  renderReport(today);
}

if (authed) showApp(); else showLogin();
