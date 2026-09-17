/* ==========================================================================
   IAN BOUTIQUE KIGALI & IAN COLLECTION — App Logic (Mobile-First Redesign)
   ========================================================================== */

const DEFAULT_SUITS = [
  { id:"suit-2037-white", code:"2037-WHITE", title:"Ian 2037 White Patterned Tuxedo", color:"White / Black Velvet", colorHex:"#FFFFFF", priceRwf:45000, image:"/suits/2037-white.png",
    stock:{ "Ian Boutique Kigali":{"46":1,"48":2,"50":3,"52":2,"54":1,"56":1}, "Ian Collection":{"46":1,"48":1,"50":2,"52":2,"54":1,"56":0} } },
  { id:"suit-slim-grey", code:"SLIM-GREY", title:"Ian Slim Fit Slate Grey Tuxedo", color:"Slate Grey", colorHex:"#6B7280", priceRwf:35000, image:"/suits/slim-grey.png",
    stock:{ "Ian Boutique Kigali":{"46":2,"48":2,"50":2,"52":3,"54":1,"56":1}, "Ian Collection":{"46":1,"48":2,"50":3,"52":1,"54":1,"56":1} } },
  { id:"suit-brown-db", code:"BROWN-DB", title:"Ian Royal Double Breasted Brown", color:"Mocha Brown", colorHex:"#78350F", priceRwf:40000, image:"/suits/brown-db.png",
    stock:{ "Ian Boutique Kigali":{"46":1,"48":1,"50":2,"52":2,"54":1,"56":0}, "Ian Collection":{"46":0,"48":2,"50":2,"52":1,"54":1,"56":1} } },
  { id:"suit-daniel-navy", code:"628-15#", title:"Daniel Collin Navy Grid 3-Piece", color:"Deep Navy Plaid", colorHex:"#1E3A8A", priceRwf:38000, image:"/suits/daniel-navy.png",
    stock:{ "Ian Boutique Kigali":{"46":2,"48":3,"50":4,"52":3,"54":2,"56":1}, "Ian Collection":{"46":1,"48":2,"50":3,"52":2,"54":1,"56":1} } },
  { id:"suit-daniel-black", code:"628-6#", title:"Daniel Collin Obsidian Black 3-Piece", color:"Obsidian Black", colorHex:"#111827", priceRwf:38000, image:"/suits/daniel-black.png",
    stock:{ "Ian Boutique Kigali":{"46":2,"48":2,"50":3,"52":3,"54":2,"56":1}, "Ian Collection":{"46":1,"48":3,"50":2,"52":2,"54":1,"56":1} } }
];

const SIZES = ["46","48","50","52","54","56"];

let state = {
  activeLocation: "Ian Boutique Kigali",
  suits: [],
  rentals: [],
  activities: [],
  unreadNotifications: 0,
  audioEnabled: true,
  searchQuery: "",
  sizeFilter: "all",
  availFilter: "all",
  currentTab: "catalog"
};

const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ian_boutique_rental_sync') : null;

/* ── DATA ── */
function loadState() {
  try { state.suits = JSON.parse(localStorage.getItem('ian_suits') || 'null') || DEFAULT_SUITS; } catch { state.suits = DEFAULT_SUITS; }
  try { state.rentals = JSON.parse(localStorage.getItem('ian_rentals') || '[]'); } catch { state.rentals = []; }
  try {
    state.activities = JSON.parse(localStorage.getItem('ian_activities') || 'null') || [{
      id:'init', timestamp: new Date().toISOString(), location:'System', message:'Rental sync initialised for both locations.'
    }];
  } catch { state.activities = []; }
}
function saveState() {
  localStorage.setItem('ian_suits', JSON.stringify(state.suits));
  localStorage.setItem('ian_rentals', JSON.stringify(state.rentals));
  localStorage.setItem('ian_activities', JSON.stringify(state.activities));
}

/* ── DATES ── */
function addBusinessDays(date, days) {
  let d = new Date(date), added = 0;
  while (added < days) { d.setDate(d.getDate()+1); if (d.getDay() !== 0 && d.getDay() !== 6) added++; }
  return d;
}
function fmtDate(d) { return new Date(d).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}); }

/* ── AUDIO CHIME ── */
function chime() {
  if (!state.audioEnabled) return;
  try {
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    [[659.25, 0, 0.3, 0.5],[987.77, 0.15, 0.35, 0.8]].forEach(([f,t,g,dur])=>{
      const o=ctx.createOscillator(), gn=ctx.createGain();
      o.type='sine'; o.frequency.value=f;
      gn.gain.setValueAtTime(g, ctx.currentTime+t);
      gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+t+dur);
      o.connect(gn); gn.connect(ctx.destination);
      o.start(ctx.currentTime+t); o.stop(ctx.currentTime+t+dur);
    });
  } catch {}
}

/* ── TOAST ALERT ── */
function showToast(msg) {
  const el = document.getElementById('toastAlert');
  const msgEl = document.getElementById('toastMessage');
  if (!el || !msgEl) return;
  msgEl.innerHTML = msg;
  el.classList.remove('hidden');
  // Force reflow then animate
  requestAnimationFrame(() => { el.classList.add('show'); });
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => el.classList.remove('show'), 5500);
}
document.getElementById('toastCloseBtn')?.addEventListener('click', ()=>{
  document.getElementById('toastAlert')?.classList.remove('show');
});

/* ── BROADCAST SYNC ── */
function broadcast(type, payload) {
  const msg = { type, payload, from: state.activeLocation, ts: new Date().toISOString() };
  channel?.postMessage(msg);
  localStorage.setItem('ian_last_evt', JSON.stringify(msg));
}
function handleRemoteEvent(msg) {
  if (!msg?.type) return;
  loadState(); // re-sync from storage
  const { type, payload, from } = msg;
  if (type === 'RENTED') {
    showToast(`🚨 <b>${from}</b> rented out <b>${payload.title} (Size ${payload.size})</b> — due ${fmtDate(payload.returnDate)}`);
    chime(); state.unreadNotifications++;
  } else if (type === 'RESTOCKED') {
    showToast(`✅ <b>${from}</b> restocked <b>${payload.title} (Size ${payload.size})</b>`);
    state.unreadNotifications++;
  } else if (type === 'NEW_SUIT') {
    showToast(`✨ New suit added: <b>${payload.title}</b>`);
  }
  renderAll();
}
if (channel) channel.onmessage = e => handleRemoteEvent(e.data);
window.addEventListener('storage', e => {
  if (e.key === 'ian_last_evt' && e.newValue) {
    try { handleRemoteEvent(JSON.parse(e.newValue)); } catch {}
  }
});

/* ── FILTER HELPERS ── */
function filteredSuits() {
  const q = state.searchQuery.toLowerCase();
  return state.suits.filter(s => {
    if (q && !s.title.toLowerCase().includes(q) && !s.code.toLowerCase().includes(q) && !s.color.toLowerCase().includes(q)) return false;
    const loc = s.stock[state.activeLocation] || {};
    const totalAvail = SIZES.reduce((a,sz)=> a + Math.max(0, loc[sz]||0), 0);
    if (state.sizeFilter !== 'all' && (loc[state.sizeFilter]||0) <= 0 && state.availFilter === 'available') return false;
    if (state.availFilter === 'available' && totalAvail <= 0) return false;
    if (state.availFilter === 'rented' && !state.rentals.some(r=>r.suitId===s.id && r.status!=='Returned')) return false;
    return true;
  });
}

/* ── RENDER: KPI ── */
function renderKPIs() {
  const loc = state.activeLocation;
  let avail = 0;
  state.suits.forEach(s => { const l=s.stock[loc]||{}; SIZES.forEach(sz=>{ avail+=Math.max(0,l[sz]||0); }); });
  const rented = state.rentals.filter(r=>r.status!=='Returned').length;
  const today = new Date().setHours(0,0,0,0);
  const overdue = state.rentals.filter(r=>r.status!=='Returned' && new Date(r.returnDate).setHours(0,0,0,0)<=today).length;

  document.getElementById('activeLocationNameDisplay').textContent = loc;
  document.getElementById('headerLocationSub').textContent = loc === 'Ian Boutique Kigali' ? 'KIGALI' : 'COLLECTION';
  document.getElementById('kpiAvailableSuits').textContent = avail;
  document.getElementById('kpiRentedSuits').textContent = rented;
  document.getElementById('kpiOverdueSuits').textContent = overdue;

  const badge = document.getElementById('unreadNotificationBadge');
  if (badge) {
    badge.textContent = state.unreadNotifications;
    badge.classList.toggle('hidden', state.unreadNotifications === 0);
  }
  const rentBadge = document.getElementById('activeRentalsCountBadge');
  if (rentBadge) { rentBadge.textContent = rented; rentBadge.classList.toggle('hidden', rented===0); }
  const tbBadge = document.getElementById('tbRentalsBadge');
  if (tbBadge) { tbBadge.textContent = rented; tbBadge.classList.toggle('hidden', rented===0); }

  document.getElementById('audioToggleBtn').style.color = state.audioEnabled ? '#D4AF37' : '';
}

/* ── RENDER: CAROUSEL (Featured) ── */
function renderCarousel() {
  const container = document.getElementById('suitsCarousel');
  if (!container) return;
  const suits = filteredSuits();
  document.getElementById('featuredCount').textContent = `${suits.length} style${suits.length!==1?'s':''}`;

  container.innerHTML = suits.map(suit => {
    const loc = suit.stock[state.activeLocation] || {};
    const totalAvail = SIZES.reduce((a,sz)=>a+Math.max(0,loc[sz]||0),0);
    return `
      <div class="suit-card-featured">
        <div class="scf-image-wrap">
          <img class="scf-image" src="${suit.image}" alt="${suit.title}" loading="lazy" onerror="this.src='/suits/2037-white.png'"/>
          <div class="scf-overlay"></div>
          <span class="scf-code">${suit.code}</span>
        </div>
        <div class="scf-body">
          <div class="scf-title">${suit.title}</div>
          <div class="scf-color">
            <span class="scf-swatch" style="background:${suit.colorHex}"></span>
            ${suit.color}
          </div>
          <div class="scf-price">${(suit.priceRwf||35000).toLocaleString()} RWF <span>/ 3 days</span></div>
        </div>
        <button class="scf-rent-btn" onclick="window.quickRent('${suit.id}','52')">
          Rent — ${totalAvail} available
        </button>
      </div>
    `;
  }).join('');
}

/* ── RENDER: SUITS LIST ── */
function renderSuitsList() {
  const container = document.getElementById('suitsGridContainer');
  if (!container) return;
  const suits = filteredSuits();
  document.getElementById('allSuitsCount').textContent = `${suits.length} results`;

  if (!suits.length) {
    container.innerHTML = `<div class="empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><p>No suits match your search</p><small>Try a different color, model or size</small></div>`;
    return;
  }

  container.innerHTML = suits.map(suit => {
    const loc = suit.stock[state.activeLocation] || {};
    const sizePills = SIZES.map(sz => {
      const qty = loc[sz]||0;
      let cls = qty>0 ? 'avail' : 'empty';
      const isRented = state.rentals.some(r=>r.suitId===suit.id&&r.size===sz&&r.status!=='Returned');
      if (isRented && qty<=0) cls='rented';
      return `<span class="slr-size-chip ${cls}">${sz}</span>`;
    }).join('');

    return `
      <div class="suit-list-row" onclick="window.quickRent('${suit.id}','52')">
        <img class="slr-thumb" src="${suit.image}" alt="${suit.title}" loading="lazy" onerror="this.src='/suits/2037-white.png'"/>
        <div class="slr-info">
          <div class="slr-title">${suit.title}</div>
          <div class="slr-meta">${suit.code} · ${suit.color}</div>
          <div class="slr-sizes">${sizePills}</div>
        </div>
        <div class="slr-action">+</div>
      </div>
    `;
  }).join('');
}

/* ── RENDER: RENTALS ── */
function renderRentals() {
  const container = document.getElementById('rentalsTableBody');
  if (!container) return;
  const active = state.rentals.filter(r=>r.status!=='Returned');

  if (!active.length) {
    container.innerHTML = `<div class="empty-state" style="padding:40px 24px;"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg><p>No active rentals</p><small>Tap "+" or use Rent a Suit to record a rental</small></div>`;
    return;
  }

  const today = new Date().setHours(0,0,0,0);
  container.innerHTML = active.map(r => {
    const suit = state.suits.find(s=>s.id===r.suitId)||{ title:r.suitTitle||'Suit', image:'/suits/2037-white.png', code:r.suitCode||'', color:r.color||'' };
    const rTime = new Date(r.returnDate).setHours(0,0,0,0);
    let badgeCls='on-rent', badgeLabel='On Rent';
    if (rTime===today) { badgeCls='due-today'; badgeLabel='Due Today'; }
    else if (rTime<today) { badgeCls='overdue'; badgeLabel='Overdue'; }

    return `
      <div class="rental-card">
        <div class="rental-card-top">
          <img class="rc-thumb" src="${suit.image}" alt="${suit.title}" onerror="this.src='/suits/2037-white.png'"/>
          <div class="rc-info">
            <div class="rc-title">${suit.title}</div>
            <div class="rc-sub">${suit.code} · ${suit.color}</div>
          </div>
          <div class="rc-size">${r.size}</div>
        </div>
        <div class="rental-card-meta">
          <div>
            <div class="rc-customer">${r.customerName}</div>
            <div class="rc-phone">${r.customerPhone}</div>
          </div>
          <div class="rc-return">
            Due
            <strong>${fmtDate(r.returnDate)}</strong>
          </div>
        </div>
        <div class="rental-card-footer">
          <span class="status-badge ${badgeCls}">${badgeLabel}</span>
          <button class="return-btn" onclick="window.openReturn('${r.id}')">Return &amp; Restock</button>
        </div>
      </div>
    `;
  }).join('');
}

/* ── RENDER: ACTIVITY ── */
function renderActivity() {
  const container = document.getElementById('activityFeedContainer');
  if (!container) return;
  if (!state.activities.length) {
    container.innerHTML = `<div class="empty-state"><p>No activity yet</p></div>`;
    return;
  }
  container.innerHTML = [...state.activities].reverse().map(a => `
    <div class="tl-item">
      <div class="tl-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      </div>
      <div class="tl-body">
        <div class="tl-msg">${a.message}</div>
        <div class="tl-time">${new Date(a.timestamp).toLocaleString()} · ${a.location}</div>
      </div>
    </div>
  `).join('');
}

/* ── RENDER ALL ── */
function renderAll() {
  renderKPIs();
  renderCarousel();
  renderSuitsList();
  renderRentals();
  renderActivity();
}

/* ── SHEET OPEN / CLOSE ── */
function openSheet(overlayId) {
  const el = document.getElementById(overlayId);
  if (!el) return;
  el.classList.remove('hidden');
  requestAnimationFrame(() => el.classList.add('open'));
  document.body.style.overflow = 'hidden';
}
function closeSheet(overlayId) {
  const el = document.getElementById(overlayId);
  if (!el) return;
  el.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => el.classList.add('hidden'), 420);
}

// Close sheet on backdrop click
['rentModalOverlay','returnModalOverlay','addSuitModalOverlay'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', e => {
    if (e.target.id === id) closeSheet(id);
  });
});

/* ── RENT FLOW ── */
window.quickRent = function(suitId, defaultSize='52') {
  const sel = document.getElementById('rentSuitModelSelect');
  if (sel) sel.innerHTML = state.suits.map(s=>`<option value="${s.id}"${s.id===suitId?' selected':''}>${s.code} — ${s.title}</option>`).join('');
  const szSel = document.getElementById('rentSuitSizeSelect');
  if (szSel) szSel.value = defaultSize;
  const locSel = document.getElementById('rentLocationSelect');
  if (locSel) locSel.value = state.activeLocation;
  updateReturnPreview();
  openSheet('rentModalOverlay');
};

function updateReturnPreview() {
  const el = document.getElementById('expectedReturnDateDisplay');
  if (el) el.textContent = fmtDate(addBusinessDays(new Date(), 3));
}

document.getElementById('rentSuitForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const suitId  = document.getElementById('rentSuitModelSelect').value;
  const size    = document.getElementById('rentSuitSizeSelect').value;
  const location= document.getElementById('rentLocationSelect').value;
  const name    = document.getElementById('customerNameInput').value.trim();
  const phone   = document.getElementById('customerPhoneInput').value.trim();
  const notes   = document.getElementById('rentNotesInput').value.trim();

  const suit = state.suits.find(s=>s.id===suitId);
  if (!suit) return;
  if ((suit.stock[location]?.[size]||0) <= 0) {
    showToast(`⚠️ Size ${size} is out of stock at ${location}`); return;
  }

  suit.stock[location][size] = Math.max(0, (suit.stock[location][size]||0) - 1);
  const returnDate = addBusinessDays(new Date(), 3);

  const rental = {
    id:'rent-'+Date.now(), suitId:suit.id, suitTitle:suit.title,
    suitCode:suit.code, color:suit.color, size, location,
    customerName:name, customerPhone:phone,
    rentalDate:new Date().toISOString(), returnDate:returnDate.toISOString(),
    notes, status:'On Rent'
  };
  state.rentals.push(rental);
  state.activities.push({ id:'act-'+Date.now(), timestamp:new Date().toISOString(), location,
    message:`${location} rented ${suit.title} (Size ${size}) to ${name}. Return by ${fmtDate(returnDate)}.` });

  saveState();
  broadcast('RENTED',{ title:suit.title, size, returnDate:returnDate.toISOString() });
  closeSheet('rentModalOverlay');
  e.target.reset();
  renderAll();
});

/* ── RETURN FLOW ── */
window.openReturn = function(rentalId) {
  const r = state.rentals.find(x=>x.id===rentalId);
  if (!r) return;
  document.getElementById('returnRentalIdInput').value = r.id;
  document.getElementById('returnItemCodeDisplay').textContent = `${r.suitCode} · ${r.location}`;
  document.getElementById('returnItemTitleDisplay').textContent = r.suitTitle;
  document.getElementById('returnItemSizeDisplay').textContent = `Size ${r.size}`;
  document.getElementById('restockLocationSelect').value = r.location;
  openSheet('returnModalOverlay');
};

document.getElementById('returnSuitForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const id = document.getElementById('returnRentalIdInput').value;
  const targetLoc = document.getElementById('restockLocationSelect').value;
  const condition = document.getElementById('returnConditionSelect').value;
  const r = state.rentals.find(x=>x.id===id);
  if (!r) return;

  r.status = 'Returned';
  const suit = state.suits.find(s=>s.id===r.suitId);
  if (suit) {
    if (!suit.stock[targetLoc]) suit.stock[targetLoc] = Object.fromEntries(SIZES.map(s=>[s,0]));
    suit.stock[targetLoc][r.size] = (suit.stock[targetLoc][r.size]||0) + 1;
  }
  state.activities.push({ id:'act-'+Date.now(), timestamp:new Date().toISOString(), location:targetLoc,
    message:`${targetLoc} restocked ${r.suitTitle} (Size ${r.size}) returned by ${r.customerName}. Condition: ${condition}.` });

  saveState();
  broadcast('RESTOCKED',{ title:r.suitTitle, size:r.size });
  closeSheet('returnModalOverlay');
  renderAll();
});

/* ── ADD SUIT FLOW ── */
document.getElementById('addSuitForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const code   = document.getElementById('newSuitCodeInput').value.trim().toUpperCase();
  const title  = document.getElementById('newSuitTitleInput').value.trim();
  const color  = document.getElementById('newSuitColorInput').value.trim();
  const price  = parseInt(document.getElementById('newSuitPriceInput').value)||35000;
  const image  = document.getElementById('newSuitImageSelect').value;

  const kigaliStock = Object.fromEntries([...document.querySelectorAll('.kigali-size-input')].map(i=>[i.dataset.size,parseInt(i.value)||0]));
  const collStock   = Object.fromEntries([...document.querySelectorAll('.collection-size-input')].map(i=>[i.dataset.size,parseInt(i.value)||0]));

  state.suits.unshift({ id:'suit-'+Date.now(), code, title, color, colorHex:'#D4AF37', priceRwf:price, image,
    stock:{ "Ian Boutique Kigali":kigaliStock, "Ian Collection":collStock } });
  state.activities.push({ id:'act-'+Date.now(), timestamp:new Date().toISOString(), location:state.activeLocation,
    message:`New suit "${title}" (${code}) added to inventory.` });

  saveState();
  broadcast('NEW_SUIT',{ title, code });
  closeSheet('addSuitModalOverlay');
  e.target.reset();
  renderAll();
});

/* ── NAVIGATION & TABS ── */
function switchTab(tab) {
  state.currentTab = tab;
  ['catalog','rentals','activity'].forEach(t => {
    document.getElementById(t+'View')?.classList.toggle('hidden', t!==tab);
  });
  // Update inline tabs
  document.querySelectorAll('.itab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  // Update bottom tab bar
  document.querySelectorAll('.tb-item[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  // Show/hide search bar only for catalog
  document.getElementById('searchFilterBar')?.classList.toggle('hidden', tab!=='catalog');
  if (tab==='activity') { state.unreadNotifications=0; renderKPIs(); }
}

// Inline tabs
document.querySelectorAll('.itab').forEach(btn => btn.addEventListener('click', ()=>switchTab(btn.dataset.tab)));
// Bottom tab bar
document.querySelectorAll('.tb-item[data-tab]').forEach(btn => btn.addEventListener('click', ()=>switchTab(btn.dataset.tab)));

// Activity icon in header
document.getElementById('activityTabNavBtn')?.addEventListener('click', ()=>switchTab('activity'));

/* ── LOCATION SWITCHER ── */
['locKigaliBtn','locCollectionBtn'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', e => {
    state.activeLocation = e.currentTarget.dataset.location;
    document.querySelectorAll('.seg-btn').forEach(b=>b.classList.toggle('active',b.dataset.location===state.activeLocation));
    renderAll();
  });
});

/* ── SEARCH & FILTER ── */
document.getElementById('searchInput')?.addEventListener('input', e=>{ state.searchQuery=e.target.value; renderCarousel(); renderSuitsList(); });
document.getElementById('sizeFilterSelect')?.addEventListener('change', e=>{ state.sizeFilter=e.target.value; renderCarousel(); renderSuitsList(); });
document.querySelectorAll('.chip').forEach(c=>c.addEventListener('click',e=>{
  document.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));
  c.classList.add('active');
  state.availFilter=c.dataset.filter;
  renderCarousel(); renderSuitsList();
}));

/* ── FAB & ADD SUIT ── */
document.getElementById('openRentModalBtn')?.addEventListener('click',()=>window.quickRent(state.suits[0]?.id||'','52'));
document.getElementById('openAddSuitModalBtn')?.addEventListener('click',()=>openSheet('addSuitModalOverlay'));

/* ── CLOSE BUTTONS ── */
document.getElementById('closeRentModalBtn')?.addEventListener('click',()=>closeSheet('rentModalOverlay'));
document.getElementById('cancelRentBtn')?.addEventListener('click',()=>closeSheet('rentModalOverlay'));
document.getElementById('closeReturnModalBtn')?.addEventListener('click',()=>closeSheet('returnModalOverlay'));
document.getElementById('cancelReturnBtn')?.addEventListener('click',()=>closeSheet('returnModalOverlay'));
document.getElementById('closeAddSuitModalBtn')?.addEventListener('click',()=>closeSheet('addSuitModalOverlay'));
document.getElementById('cancelAddSuitBtn')?.addEventListener('click',()=>closeSheet('addSuitModalOverlay'));

/* ── AUDIO TOGGLE ── */
document.getElementById('audioToggleBtn')?.addEventListener('click',()=>{ state.audioEnabled=!state.audioEnabled; renderKPIs(); });

/* ── BOOT ── */
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  renderAll();
  switchTab('catalog');
});
