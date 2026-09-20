/* Staff Portal — Logic
   - Login gate (password: ian123)
   - Shared stock (both locations from one pool)
   - Rent = decrease shared stock
   - Return = increase shared stock
   - No prices shown
*/
import {
  getSuits, getRentals, createRental, markReturned, upsertSuit, updateSuitStock,
  subscribeAll, addBusinessDays, fmtDate, getRentalStatus, playPingSound,
  SIZES, PANTS_SIZES, LOCATIONS, STAFF_PASSWORD
} from './db.js';

/* ── AUTH ── */
const SESSION_KEY = 'ian_staff_auth';
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
  if (pw === STAFF_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, 'yes');
    authed = true;
    document.getElementById('loginError').classList.add('hidden');
    showApp();
  } else {
    document.getElementById('loginError').classList.remove('hidden');
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginPassword').focus();
  }
});

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  authed = false;
  showLogin();
}
document.getElementById('logoutBtn')?.addEventListener('click', logout);
document.getElementById('tbLogout')?.addEventListener('click', logout);

/* ── STATE ── */
let suits = [], rentals = [];
let activeLocation = 'Ian Boutique Kigali';
let searchQuery = '', sizeFilter = 'all', availFilter = 'all';
let currentTab = 'catalog';
let audioEnabled = true;

/* ── TOAST ── */
function showToast(msg) {
  const el = document.getElementById('toastAlert');
  const m  = document.getElementById('toastMessage');
  if (!el || !m) return;
  m.innerHTML = msg;
  el.classList.remove('hidden');
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(window._toastT);
  window._toastT = setTimeout(() => el.classList.remove('show'), 5500);
}
document.getElementById('toastCloseBtn')?.addEventListener('click', () => {
  document.getElementById('toastAlert')?.classList.remove('show');
});

/* ── CHIME ── */
function chime() {
  if (!audioEnabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [[659.25,0,0.3,0.5],[987.77,0.15,0.35,0.8]].forEach(([f,t,g,d]) => {
      const o = ctx.createOscillator(), g_ = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g_.gain.setValueAtTime(g, ctx.currentTime+t);
      g_.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+t+d);
      o.connect(g_); g_.connect(ctx.destination);
      o.start(ctx.currentTime+t); o.stop(ctx.currentTime+t+d);
    });
  } catch {}
}

/* ── DATA LOAD ── */
async function loadData() {
  [suits, rentals] = await Promise.all([getSuits(), getRentals()]);
}

/* ── REALTIME ── */
subscribeAll(async (payload) => {
  await loadData();
  renderAll();
  if (payload.table === 'rentals' && payload.eventType === 'INSERT') {
    const r = payload.new;
    showToast(`🔔 <b>${r.location}</b> just rented a suit (Size ${r.size}) to <b>${r.customer_name}</b>`);
    chime();
  }
});

/* ── FILTERS ── */
function filteredSuits() {
  const q = searchQuery.toLowerCase();
  return suits.filter(s => {
    if (q && !s.title?.toLowerCase().includes(q) && !s.code?.toLowerCase().includes(q) && !s.color?.toLowerCase().includes(q)) return false;
    const sizesToUse = s.category === 'Pants' ? PANTS_SIZES : SIZES;
    const total = sizesToUse.reduce((a,sz) => a + (s.stock?.[sz]||0), 0);
    if (availFilter === 'suits' && s.category === 'Pants') return false;
    if (availFilter === 'pants' && s.category !== 'Pants') return false;
    if (availFilter === 'available' && total <= 0) return false;
    if (availFilter === 'rented' && !rentals.some(r=>r.suit_id===s.id && r.status!=='Returned')) return false;
    if (sizeFilter !== 'all' && (s.stock?.[sizeFilter]||0) <= 0) return false;
    return true;
  });
}

/* ── RENDER KPIs ── */
function renderKPIs() {
  const totalAvail = suits.reduce((a,s) => {
    const sizesToUse = s.category === 'Pants' ? PANTS_SIZES : SIZES;
    return a + sizesToUse.reduce((b,sz)=>b+(s.stock?.[sz]||0),0);
  }, 0);
  const activeRentals = rentals.filter(r => r.status !== 'Returned');
  const today = new Date().setHours(0,0,0,0);
  const overdue = activeRentals.filter(r => new Date(r.return_date).setHours(0,0,0,0) <= today).length;

  document.getElementById('kpiAvailableSuits').textContent = totalAvail;
  document.getElementById('kpiRentedSuits').textContent = activeRentals.length;
  document.getElementById('kpiOverdueSuits').textContent = overdue;
  document.getElementById('kpiSuitsTotal').textContent = suits.length;

  const rBadge = document.getElementById('activeRentalsCountBadge');
  rBadge?.classList.toggle('hidden', activeRentals.length === 0);
  if (rBadge) rBadge.textContent = activeRentals.length;

  const tbBadge = document.getElementById('tbRentalsBadge');
  tbBadge?.classList.toggle('hidden', activeRentals.length === 0);
  if (tbBadge) tbBadge.textContent = activeRentals.length;

  document.getElementById('audioToggleBtn').style.color = audioEnabled ? 'var(--gold)' : '';
}

/* ── SIZE PILL INTERACTION & POPUP STATUS ── */
window.handleSizePillClick = function(suitId, sz) {
  const suit = suits.find(s => s.id === suitId);
  if (!suit) return;

  const qty = suit.stock?.[sz] || 0;
  const activeRental = rentals.find(r => r.suit_id === suitId && r.size === sz && r.status !== 'Returned');

  if (qty > 0) {
    // Available size clicked -> open rent sheet directly with size pre-selected!
    window.openRentForSuit(suitId, sz);
    return;
  }

  // Unavailable size clicked -> play audio ping notification & show status popup toast
  playPingSound();

  if (activeRental) {
    const retDateFmt = fmtDate(activeRental.return_date);
    const msg = `📅 <b>SIZE ${sz} IS CURRENTLY ON RENT</b><br/><br/>` +
      `👔 <b>Item:</b> ${suit.title} (${suit.code})<br/>` +
      `👤 <b>Rented to:</b> ${activeRental.customer_name} (${activeRental.location})<br/><br/>` +
      `⏰ <b>Expected Return Date:</b> ${retDateFmt}<br/>` +
      `✨ <span style="color:var(--gold);font-weight:600;">Will be cleaned & ready within next 5 business days (${fmtDate(addBusinessDays(new Date(), 5))}).</span>`;
    showToast(msg);
  } else {
    const next5Days = fmtDate(addBusinessDays(new Date(), 5));
    const msg = `⚠️ <b>SIZE ${sz} IS CURRENTLY OUT OF STOCK</b><br/><br/>` +
      `👔 <b>Item:</b> ${suit.title} (${suit.code})<br/>` +
      `📦 <b>Stock:</b> 0 units currently available.<br/><br/>` +
      `🗓️ <b>Next Estimated Availability:</b> ${next5Days} (next 5 business days).`;
    showToast(msg);
  }
};

/* ── RENDER SUITS LIST ── */
function renderSuitsList() {
  const container = document.getElementById('suitsGridContainer');
  if (!container) return;
  const fs = filteredSuits();
  const countEl = document.getElementById('allSuitsCount');
  if (countEl) countEl.textContent = `${fs.length} items`;

  if (!fs.length) {
    container.innerHTML = `<div class="empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><p>No items found</p><small>Try a different search or filter</small></div>`;
    return;
  }

  container.innerHTML = fs.map(suit => {
    const sizesToUse = suit.category === 'Pants' ? PANTS_SIZES : SIZES;
    const totalAvail = sizesToUse.reduce((a,sz) => a + (suit.stock?.[sz]||0), 0);
    const isRentedAny = rentals.some(r => r.suit_id === suit.id && r.status !== 'Returned');

    const sizePills = sizesToUse.map(sz => {
      const qty = suit.stock?.[sz] || 0;
      const isRented = rentals.some(r => r.suit_id === suit.id && r.size === sz && r.status !== 'Returned');
      let cls = qty > 0 ? 'avail' : (isRented ? 'rented' : 'empty');
      const pillTitle = qty > 0 
        ? `Size ${sz}: ${qty} available (Click to rent)` 
        : (isRented ? `Size ${sz}: On rent (Click for return date)` : `Size ${sz}: Out of stock (Click for info)`);

      return `<span class="sc-size-pill ${cls}" title="${pillTitle}" onclick="event.stopPropagation(); window.handleSizePillClick('${suit.id}', '${sz}')">${sz}</span>`;
    }).join('');

    const availBadge = totalAvail > 0 
      ? `<div class="sc-avail-badge avail">• ${totalAvail} available</div>`
      : (isRentedAny ? `<div class="sc-avail-badge rented">On Rent</div>` : `<div class="sc-avail-badge empty">Out of Stock</div>`);

    return `<div class="suit-card" onclick="window.openRentForSuit('${suit.id}')">
      <img class="sc-bg-img" src="${suit.image_path}" alt="${suit.title}" loading="lazy" onerror="this.src='/suits/2037-white.png'"/>
      <div class="sc-overlay"></div>
      <div class="sc-badge">${suit.code}</div>
      ${availBadge}
      <div class="sc-body">
        <div class="sc-title">${suit.title}</div>
        <div class="sc-meta">${suit.color}</div>
        <div class="sc-sizes">${sizePills}</div>
      </div>
      <div class="sc-add-btn">
        <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </div>
    </div>`;
  }).join('');
}

/* ── RENDER RENTALS ── */
function renderRentals() {
  const container = document.getElementById('rentalsTableBody');
  if (!container) return;
  const active = rentals.filter(r => r.status !== 'Returned');

  if (!active.length) {
    container.innerHTML = `<div class="empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg><p>No active rentals</p><small>Tap the gold + button to record a rental</small></div>`;
    return;
  }

  container.innerHTML = active.map(r => {
    const suit = suits.find(s=>s.id===r.suit_id) || { title:r.suit_title||'Suit', image_path:'/suits/2037-white.png', code:'', color:'' };
    const st = getRentalStatus(r.return_date);
    const badgeMap = { 'on-rent':'On Rent', 'due-today':'Due Today', 'overdue':'Overdue' };
    return `<div class="rental-card">
      <div class="rental-card-top">
        <img class="rc-thumb" src="${suit.image_path}" alt="${suit.title}" onerror="this.src='/suits/2037-white.png'"/>
        <div class="rc-info">
          <div class="rc-title">${suit.title || r.suits?.title}</div>
          <div class="rc-sub">${suit.code || r.suits?.code} · ${suit.color || r.suits?.color}</div>
        </div>
        <div class="rc-size">${r.size}</div>
      </div>
      <div class="rental-card-meta">
        <div><div class="rc-customer">${r.customer_name}</div><div class="rc-phone">${r.customer_phone}</div></div>
        <div class="rc-return">Due<strong>${fmtDate(r.return_date)}</strong></div>
      </div>
      <div class="rental-card-footer">
        <div style="display:flex;flex-direction:column;gap:4px;">
          <span class="status-badge ${st}">${badgeMap[st]||st}</span>
          <span class="rc-location-badge">${r.location}</span>
        </div>
        <button class="return-btn" onclick="window.openReturn('${r.id}')">Return &amp; Restock</button>
      </div>
    </div>`;
  }).join('');
}

/* ── RENDER ACTIVITY ── */
async function renderActivity() {
  const container = document.getElementById('activityFeedContainer');
  if (!container) return;
  const allRentals = await getRentals();
  const returned = allRentals.filter(r => r.status === 'Returned');
  const recent = [...allRentals].slice(0, 30);

  if (!recent.length) {
    container.innerHTML = `<div class="empty-state"><p>No activity yet</p></div>`;
    return;
  }

  container.innerHTML = recent.map(r => {
    const icon = r.status === 'Returned'
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`;
    const suit = suits.find(s=>s.id===r.suit_id);
    const msg = r.status === 'Returned'
      ? `<b>${r.location}</b> restocked <b>${suit?.title||'suit'} (Size ${r.size})</b> from ${r.customer_name}`
      : `<b>${r.location}</b> rented <b>${suit?.title||'suit'} (Size ${r.size})</b> to ${r.customer_name} — due ${fmtDate(r.return_date)}`;
    return `<div class="tl-item">
      <div class="tl-icon">${icon}</div>
      <div class="tl-body"><div class="tl-msg">${msg}</div><div class="tl-time">${new Date(r.created_at).toLocaleString()}</div></div>
    </div>`;
  }).join('');
}

/* ── RENDER ALL ── */
function renderAll() {
  renderKPIs();
  if (currentTab === 'catalog') renderSuitsList();
  if (currentTab === 'rentals') renderRentals();
  if (currentTab === 'activity') renderActivity();
}

/* ── SHEETS ── */
function openSheet(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  requestAnimationFrame(() => el.classList.add('open'));
  document.body.style.overflow = 'hidden';
}
function closeSheet(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => el.classList.add('hidden'), 420);
}
['rentModalOverlay','returnModalOverlay','addSuitModalOverlay'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', e => { if(e.target.id===id) closeSheet(id); });
});

/* ── RENT ── */
window.openRentForSuit = function(suitId, defaultSize) {
  const sel = document.getElementById('rentSuitModelSelect');
  if (sel) sel.innerHTML = suits.map(s=>`<option value="${s.id}"${s.id===suitId?' selected':''}>${s.code} — ${s.title}</option>`).join('');
  document.getElementById('rentLocationSelect').value = activeLocation;
  
  // Trigger update of sizes based on selected item
  updateRentSizes();
  if (defaultSize) {
    const sizeSel = document.getElementById('rentSuitSizeSelect');
    if (sizeSel) sizeSel.value = defaultSize;
  }
  
  updateReturnPreview();
  openSheet('rentModalOverlay');
};

function updateRentSizes() {
  const suitId = document.getElementById('rentSuitModelSelect')?.value;
  const suit = suits.find(s=>s.id===suitId);
  if(suit) {
    const sizes = suit.category === 'Pants' ? PANTS_SIZES : SIZES;
    const sizeSel = document.getElementById('rentSuitSizeSelect');
    if (sizeSel) sizeSel.innerHTML = sizes.map(sz => `<option value="${sz}">${sz}</option>`).join('');
  }
}
document.getElementById('rentSuitModelSelect')?.addEventListener('change', updateRentSizes);
function updateReturnPreview() {
  const el = document.getElementById('expectedReturnDateDisplay');
  if (el) el.textContent = fmtDate(addBusinessDays(new Date(),3));
}

document.getElementById('rentSuitForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const suitId   = document.getElementById('rentSuitModelSelect').value;
  const size     = document.getElementById('rentSuitSizeSelect').value;
  const location = document.getElementById('rentLocationSelect').value;
  const name     = document.getElementById('customerNameInput').value.trim();
  const phone    = document.getElementById('customerPhoneInput').value.trim();
  const notes    = document.getElementById('rentNotesInput').value.trim();

  const suit = suits.find(s=>s.id===suitId);
  if (!suit) return;
  const avail = suit.stock?.[size] || 0;
  if (avail <= 0) { showToast(`⚠️ Size ${size} is out of stock!`); return; }

  // Decrease shared stock
  const newStock = { ...suit.stock, [size]: avail - 1 };
  const returnDate = addBusinessDays(new Date(), 3);

  try {
    await updateSuitStock(suitId, newStock);
    await createRental({
      suit_id: suitId, size, location,
      customer_name: name, customer_phone: phone,
      notes, return_date: returnDate.toISOString(), status: 'On Rent'
    });
    const plainMsg =
      `🚨 *NEW RENTAL CONFIRMED*\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `📦 *Item:* ${suit.title} (${suit.code})\n` +
      `📏 *Size:* ${size}\n` +
      `👤 *Customer:* ${name} (${phone})\n` +
      `📍 *Location:* ${location}\n` +
      `📅 *Return Due:* ${fmtDate(returnDate)}\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `Ian Boutique Kigali Management System`;

    const imgAbsUrl = new URL(suit.image_path, window.location.origin).href;
    const waUrl = `https://wa.me/250788425242?text=${encodeURIComponent(plainMsg + '\n\nItem picture: ' + imgAbsUrl)}`;

    closeSheet('rentModalOverlay');
    e.target.reset();
    showToast(`✅ Rental confirmed! <b>${suit.title} (Size ${size})</b> rented to ${name}. Due ${fmtDate(returnDate)} <br/><a href="${waUrl}" target="_blank" style="color:#25D366;font-weight:700;display:inline-block;margin-top:6px;">📲 Send WhatsApp Notification (+250788425242) →</a>`);
    chime();

    // Try to share with embedded image file (mobile Web Share API)
    if (navigator.share && navigator.canShare) {
      try {
        const resp = await fetch(imgAbsUrl);
        const blob = await resp.blob();
        const file = new File([blob], 'item.jpg', { type: blob.type });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'New Rental — Ian Boutique',
            text: plainMsg,
            files: [file]
          });
          await loadData(); renderAll();
          return; // done — image sent natively
        }
      } catch (shareErr) {
        console.log('Native share unavailable or cancelled, falling back', shareErr);
      }
    }

    // Fallback: open wa.me link (desktop or unsupported browser)
    window.open(waUrl, '_blank');
    await loadData(); renderAll();
  } catch (err) {
    showToast(`❌ Error: ${err.message}`);
  }
});

/* ── RETURN ── */
window.openReturn = function(rentalId) {
  const r = rentals.find(x=>x.id===rentalId); if (!r) return;
  document.getElementById('returnRentalIdInput').value = r.id;
  const suit = suits.find(s=>s.id===r.suit_id);
  document.getElementById('returnItemCodeDisplay').textContent = `${suit?.code||''} · ${r.location}`;
  document.getElementById('returnItemTitleDisplay').textContent = suit?.title || 'Suit';
  document.getElementById('returnItemSizeDisplay').textContent = `Size ${r.size}`;
  openSheet('returnModalOverlay');
};

document.getElementById('returnSuitForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const id        = document.getElementById('returnRentalIdInput').value;
  const condition = document.getElementById('returnConditionSelect').value;
  const r = rentals.find(x=>x.id===id); if (!r) return;
  const suit = suits.find(s=>s.id===r.suit_id);

  try {
    // Increase shared stock
    if (suit) {
      const newStock = { ...suit.stock, [r.size]: (suit.stock?.[r.size]||0) + 1 };
      await updateSuitStock(r.suit_id, newStock);
    }
    await markReturned(id, condition, r.location);
    closeSheet('returnModalOverlay');
    showToast(`✅ ${suit?.title||'Suit'} (Size ${r.size}) restocked to shared inventory.`);
    await loadData(); renderAll();
  } catch (err) {
    showToast(`❌ Error: ${err.message}`);
  }
});

/* ── ADD SUIT / ITEM ── */
function populateAddSizes() {
  const isPants = document.getElementById('newItemCategorySelect')?.value === 'Pants';
  const sizes = isPants ? PANTS_SIZES : SIZES;
  const grid = document.getElementById('newSuitSizesGrid');
  if(grid) grid.innerHTML = sizes.map(sz => `<div class="ssg-cell"><span>${sz}</span><input type="number" min="0" value="2" class="form-input size-stock-input" data-size="${sz}"/></div>`).join('');
}
document.getElementById('newItemCategorySelect')?.addEventListener('change', populateAddSizes);

document.getElementById('addSuitForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const category = document.getElementById('newItemCategorySelect')?.value || 'Suit';
  let code = document.getElementById('newSuitCodeInput').value.trim().toUpperCase();
  if (category === 'Pants' && !code.startsWith('PNT-')) {
    code = 'PNT-' + code.replace(/^PNT-?/, '');
  } else if (category === 'Suit' && !code.startsWith('TUX-')) {
    code = 'TUX-' + code.replace(/^TUX-?/, '');
  }
  const title = document.getElementById('newSuitTitleInput').value.trim();
  const color = document.getElementById('newSuitColorInput').value.trim();
  const hex   = document.getElementById('newSuitColorHex').value;
  const image = document.getElementById('newSuitImageSelect').value;
  const stock = Object.fromEntries(
    [...document.querySelectorAll('.size-stock-input')].map(i=>[i.dataset.size, parseInt(i.value)||0])
  );
  try {
    await upsertSuit({ id:'item-'+Date.now(), category, code, title, color, color_hex:hex, price_rwf:35000, image_path:image, stock });
    closeSheet('addSuitModalOverlay');
    e.target.reset();
    showToast(`✨ ${title} (${code}) added to shared inventory.`);
    await loadData(); renderAll();
  } catch(err) { showToast(`❌ ${err.message}`); }
});

/* ── NAVIGATION ── */
function switchTab(tab) {
  currentTab = tab;
  ['catalog','rentals','activity'].forEach(t => {
    document.getElementById(t+'View')?.classList.toggle('hidden', t!==tab);
  });
  document.querySelectorAll('.itab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  document.querySelectorAll('.tb-item[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  document.getElementById('searchFilterBar')?.classList.toggle('hidden', tab!=='catalog');
  renderAll();
}
document.querySelectorAll('.itab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
document.querySelectorAll('.tb-item[data-tab]').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));

/* ── LOCATION ── */
['locKigaliBtn','locCollectionBtn'].forEach(id=>{
  document.getElementById(id)?.addEventListener('click',e=>{
    activeLocation = e.currentTarget.dataset.location;
    document.querySelectorAll('.seg-btn').forEach(b=>b.classList.toggle('active',b.dataset.location===activeLocation));
    document.getElementById('headerLocationSub').textContent = activeLocation === 'Ian Boutique Kigali' ? 'KIGALI' : 'COLLECTION';
    renderAll();
  });
});

/* ── SEARCH & FILTER ── */
document.getElementById('searchInput')?.addEventListener('input',e=>{searchQuery=e.target.value;renderSuitsList();});
document.getElementById('sizeFilterSelect')?.addEventListener('change',e=>{sizeFilter=e.target.value;renderSuitsList();});
document.querySelectorAll('.chip').forEach(c=>c.addEventListener('click',e=>{
  document.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));
  c.classList.add('active'); availFilter=c.dataset.filter; renderSuitsList();
}));

/* ── BUTTONS ── */
document.getElementById('openRentModalBtn')?.addEventListener('click',()=>window.openRentForSuit(suits[0]?.id||''));
document.getElementById('openAddSuitModalBtn')?.addEventListener('click',()=>{
  populateAddSizes(); // ensure sizes match category on open
  openSheet('addSuitModalOverlay');
});
document.getElementById('closeRentModalBtn')?.addEventListener('click',()=>closeSheet('rentModalOverlay'));
document.getElementById('cancelRentBtn')?.addEventListener('click',()=>closeSheet('rentModalOverlay'));
document.getElementById('closeReturnModalBtn')?.addEventListener('click',()=>closeSheet('returnModalOverlay'));
document.getElementById('cancelReturnBtn')?.addEventListener('click',()=>closeSheet('returnModalOverlay'));
document.getElementById('closeAddSuitModalBtn')?.addEventListener('click',()=>closeSheet('addSuitModalOverlay'));
document.getElementById('cancelAddSuitBtn')?.addEventListener('click',()=>closeSheet('addSuitModalOverlay'));
document.getElementById('audioToggleBtn')?.addEventListener('click',()=>{audioEnabled=!audioEnabled;renderKPIs();});

/* ── BOOT ── */
async function boot() {
  await loadData();
  renderAll();
  switchTab('catalog');
}

if (authed) showApp(); else showLogin();
