import { getSuits, subscribeAll, playPingSound, SIZES, PANTS_SIZES } from './db.js';

// Nav scroll effect
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav?.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// Mobile menu
document.getElementById('navMenuBtn')?.addEventListener('click', () => {
  document.getElementById('mobileMenu')?.classList.toggle('hidden');
});

// Load & render suits
let suits = [];
let activeFilter = 'all';

async function loadSuits() {
  suits = await getSuits();
  renderSuits();
  document.getElementById('statSuits').textContent = suits.length + '+';
}

function renderSuits() {
  const container = document.getElementById('suitsShowcase');
  if (!container) return;

  const filtered = suits.filter(s => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'available') {
      const total = SIZES.reduce((a,sz)=>a+(s.stock?.[sz]||0),0);
      return total > 0;
    }
    if (activeFilter === 'tuxedo') return s.title.toLowerCase().includes('tuxedo') || s.category === 'Suit';
    if (activeFilter === '3piece') return s.title.toLowerCase().includes('3-piece') || s.title.toLowerCase().includes('3 piece');
    if (activeFilter === 'pants') return s.category === 'Pants';
    return true;
  });

  if (!filtered.length) {
    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:#9A9A96;font-size:16px;">No suits match this filter</div>`;
    return;
  }

  container.innerHTML = filtered.map(suit => {
    const isPant = suit.category === 'Pants';
    const itemSizes = isPant ? PANTS_SIZES : SIZES;
    const itemName = isPant ? 'pant' : 'suit';
    const btnText = isPant ? 'Book This Pant →' : 'Book This Suit →';
    
    const total = itemSizes.reduce((a,sz)=>a+(suit.stock?.[sz]||0),0);
    const sizePills = itemSizes.map(sz => {
      const qty = suit.stock?.[sz] || 0;
      if (qty > 0) {
        return `<button class="ssc-size avail sel-size" data-id="${suit.id}" data-size="${sz}">${sz}</button>`;
      } else {
        return `<span class="ssc-size empty">${sz}</span>`;
      }
    }).join('');

    // Landing page shows AI-styled image if available; real photo used for WhatsApp
    const displayImg = suit.landing_image_path || suit.image_path;
    const realImgUrl = new URL(suit.image_path, window.location.origin).href;
    const waMsg = `Hello Ian Boutique! I'd like to book this ${itemName}: ${suit.title}.\n\nPicture: ${realImgUrl}\n\nPlease advise on availability.`;

    return `
      <div class="suit-showcase-card">
        <div class="ssc-img-wrap">
          <img class="ssc-img" src="${displayImg}" alt="${suit.title}" loading="lazy" onerror="this.src='${suit.image_path}'"/>
          <div class="ssc-overlay"></div>
          <span class="ssc-badge">${suit.code}</span>
          <span class="ssc-avail">
            <span class="avail-dot"></span>
            ${total > 0 ? total + ' available' : 'Limited'}
          </span>
        </div>
        <div class="ssc-body">
          <div class="ssc-title">${suit.title}</div>
          <div class="ssc-color">
            <span class="ssc-swatch" style="background:${suit.color_hex}"></span>
            ${suit.color}
          </div>
          <div class="ssc-sizes" id="sizes-${suit.id}">${sizePills}</div>
          <a href="#" class="ssc-cta book-btn" data-id="${suit.id}" data-image="${realImgUrl}" data-msg="${encodeURIComponent(waMsg)}">
            ${btnText}
          </a>
        </div>
      </div>
    `;
  }).join('');

  // Add event listeners for size selection
  document.querySelectorAll('.sel-size').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const suitId = btn.dataset.id;
      document.querySelectorAll(`#sizes-${suitId} .sel-size`).forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  // Add event listeners for booking buttons
  document.querySelectorAll('.book-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const suitId = btn.dataset.id;
      const selectedSizeBtn = document.querySelector(`#sizes-${suitId} .sel-size.selected`);
      let waMsg = decodeURIComponent(btn.dataset.msg);
      
      if (selectedSizeBtn) {
        waMsg = waMsg.replace('Please advise on availability.', `Size: ${selectedSizeBtn.dataset.size}\n\nPlease advise on availability.`);
      } else {
        alert("Please select a size first!");
        return;
      }
      
      // Play audio notification ping
      playPingSound();
      
      // Try Web Share API (Mobile native sharing to embed file directly)
      const imgUrl = btn.dataset.image;
      if (navigator.share && navigator.canShare) {
        try {
          const response = await fetch(imgUrl);
          const blob = await response.blob();
          const file = new File([blob], 'suit.jpg', { type: blob.type });
          
          if (navigator.canShare({ files: [file] })) {
            const cleanText = waMsg.replace(/Picture: .*\n\n/, ''); // Remove ugly link
            await navigator.share({
              title: 'Ian Boutique Booking',
              text: cleanText,
              files: [file]
            });
            return; // Success, stop here
          }
        } catch (err) {
          console.log("Native share failed or cancelled", err);
        }
      }
      
      // Fallback for Desktop / unsupported browsers
      window.open(`https://wa.me/250788535737?text=${encodeURIComponent(waMsg)}`, '_blank');
    });
  });
}

// Filter chips
document.querySelectorAll('.fchip').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.fchip').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderSuits();
  });
});

// Realtime updates (inventory changes)
subscribeAll(() => loadSuits());

// Boot
loadSuits();
