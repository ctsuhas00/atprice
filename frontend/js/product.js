const AtProductPage = (() => {
  const DEFAULT_IMAGE = 'https://images.pexels.com/photos/5691646/pexels-photo-5691646.jpeg?auto=compress&cs=tinysrgb&w=800';

  const SORT_OPTIONS = [
    { id: 'best_value', label: 'Best Value' },
    { id: 'price_asc', label: 'Price — Low to High' },
    { id: 'price_desc', label: 'Price — High to Low' },
    { id: 'nearest', label: 'Nearest First' },
    { id: 'farthest', label: 'Farthest First' },
    { id: 'best_rated', label: 'Best Rated' },
    { id: 'recent', label: 'Recently Updated' },
  ];

  let productId = null;
  let product = null;
  let listings = [];
  let sort = 'best_value';
  let filters = { verifiedOnly: false, inStockOnly: false, maxDistanceKm: null, minPrice: '', maxPrice: '' };

  function getIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || params.get('product');
  }

  async function init() {
    productId = getIdFromUrl();
    if (!productId) {
      renderFatalError('No product was specified.');
      return;
    }
    AtAuth.updateAccountLabel?.();
    const loc = AtLocation.getCurrent();
    if (loc) {
      const el = document.getElementById('currentLoc');
      if (el) el.textContent = `${loc.city}, ${loc.district}`;
    }
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#sortWrap')) closeSortMenu();
    });
    await loadProduct();
  }

  async function loadProduct() {
    document.getElementById('productRoot').innerHTML = `<div class="spinner-text">Loading product…</div>`;
    try {
      const { product: p } = await Api.product(productId);
      product = p;
      document.title = `${p.name} — AtPrice`;
      renderShell();
      await loadListings();
    } catch (e) {
      renderFatalError(e.message || 'Unable to load this product.');
    }
  }

  function renderFatalError(message) {
    document.getElementById('productRoot').innerHTML = `
      <div class="error-state">
        <h2>Unable to load product</h2>
        <p>${escapeHtml(message)}</p>
        <button class="btn outline" style="width:auto" onclick="AtProductPage.retry()">Try again</button>
      </div>`;
  }

  function retry() {
    loadProduct();
  }

  function renderShell() {
    const image = (product.images && product.images[0]) || DEFAULT_IMAGE;
    document.getElementById('productRoot').innerHTML = `
      <button class="back-link" onclick="history.length>1?history.back():location.href='index.html'">← Back to results</button>
      <div class="crumbs">
        <a href="index.html">Home</a> / ${escapeHtml(product.category_name || 'Category')}
      </div>
      <div class="product-hero">
        <div class="pic"><img src="${image}" alt="${escapeHtml(product.name)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;border-radius:10px"></div>
        <div class="product-info">
          <div class="pcat">${escapeHtml(product.category_name || '')}</div>
          <h1>${escapeHtml(product.name)}</h1>
          <div class="pbrand">${product.brand ? `Brand: <b>${escapeHtml(product.brand)}</b>` : ''}${product.model ? ` &nbsp;·&nbsp; Model: ${escapeHtml(product.model)}` : ''}${product.sku ? ` &nbsp;·&nbsp; SKU: ${escapeHtml(product.sku)}` : ''}</div>
          <div id="priceSummary"></div>
          ${product.description ? `<div class="pdesc">${escapeHtml(product.description)}</div>` : ''}
          <div class="pmeta">
            ${product.unit ? `<span>Unit: ${escapeHtml(product.unit)}</span>` : ''}
            ${product.mrp ? `<span>MRP: ₹${Number(product.mrp).toLocaleString('en-IN')}</span>` : ''}
          </div>
        </div>
      </div>

      <div class="section-title">
        <h2>Compare Prices from Local Sellers</h2>
      </div>
      <div id="resultCount" class="result-count"></div>

      <div class="compare-toolbar">
        <button class="tool-btn" id="filterToggleBtn" onclick="AtProductPage.openFilters()">☰ Filter</button>
        <div id="sortWrap" style="position:relative">
          <button class="tool-btn" onclick="AtProductPage.toggleSortMenu()">⇅ Sort By: <span id="sortLabel">Best Value</span></button>
          <div class="sort-menu" id="sortMenu">
            ${SORT_OPTIONS.map((o) => `<div class="sort-opt" data-sort="${o.id}" onclick="AtProductPage.applySort('${o.id}')">${o.label}</div>`).join('')}
          </div>
        </div>
      </div>

      <div id="filterChips" class="chips"></div>
      <div id="sellerList" class="seller-cards"></div>

      <div class="filter-panel" id="filterPanel">
        <div class="fp-backdrop" onclick="AtProductPage.closeFilters()"></div>
        <div class="fp-body">
          <div class="fp-head"><h3>Filter</h3><button class="close" onclick="AtProductPage.closeFilters()">✕</button></div>
          <div class="fp-section">
            <h4>Seller</h4>
            <label class="fp-check"><input type="checkbox" id="f-verified"> Verified Shops</label>
          </div>
          <div class="fp-section">
            <h4>Availability</h4>
            <label class="fp-check"><input type="checkbox" id="f-instock"> In Stock</label>
          </div>
          <div class="fp-section">
            <h4>Distance</h4>
            <label class="fp-radio"><input type="radio" name="f-dist" value=""> Any distance</label>
            <label class="fp-radio"><input type="radio" name="f-dist" value="1"> Within 1 km</label>
            <label class="fp-radio"><input type="radio" name="f-dist" value="3"> Within 3 km</label>
            <label class="fp-radio"><input type="radio" name="f-dist" value="5"> Within 5 km</label>
            <label class="fp-radio"><input type="radio" name="f-dist" value="10"> Within 10 km</label>
          </div>
          <div class="fp-section">
            <h4>Price</h4>
            <div class="fp-price">
              <input type="number" id="f-minprice" placeholder="₹ Minimum">
              <input type="number" id="f-maxprice" placeholder="₹ Maximum">
            </div>
          </div>
          <div class="fp-actions">
            <button class="btn outline" onclick="AtProductPage.clearFilters()">Clear All</button>
            <button class="btn" onclick="AtProductPage.applyFilters()">Apply Filters</button>
          </div>
        </div>
      </div>
    `;
  }

  async function loadListings() {
    const el = document.getElementById('sellerList');
    if (el) el.innerHTML = `<div class="spinner-text">Loading sellers…</div>`;
    const loc = AtLocation.getCurrent();
    const params = new URLSearchParams({ sort });
    if (loc?.lat) { params.set('lat', loc.lat); params.set('lng', loc.lng); }
    if (filters.verifiedOnly) params.set('verifiedOnly', 'true');
    if (filters.inStockOnly) params.set('inStockOnly', 'true');
    if (filters.maxDistanceKm) params.set('maxDistanceKm', filters.maxDistanceKm);
    if (filters.minPrice !== '' && filters.minPrice !== null) params.set('minPrice', filters.minPrice);
    if (filters.maxPrice !== '' && filters.maxPrice !== null) params.set('maxPrice', filters.maxPrice);
    try {
      const result = await Api.compare(productId, `?${params.toString()}`);
      listings = result.listings;
      renderPriceSummary();
      renderResultCount();
      renderChips();
      renderSellerList();
    } catch (e) {
      if (el) el.innerHTML = `<div class="notice error">${escapeHtml(e.message || 'Unable to load sellers.')}</div>`;
    }
  }

  function renderPriceSummary() {
    const box = document.getElementById('priceSummary');
    if (!box) return;
    if (!listings.length) {
      box.innerHTML = `<div class="startprice">No sellers currently list this product.</div>`;
      return;
    }
    const cheapest = listings.reduce((min, l) => (l.price < min ? l.price : min), Infinity);
    box.innerHTML = `<div class="startprice">Starting from <b>₹${cheapest.toLocaleString('en-IN')}</b></div>
      <div class="avail-line">${listings.length} local seller${listings.length === 1 ? '' : 's'}</div>`;
  }

  function renderResultCount() {
    const el = document.getElementById('resultCount');
    if (!el) return;
    const active = hasActiveFilters();
    el.textContent = active
      ? `${listings.length} seller${listings.length === 1 ? '' : 's'} match your filters`
      : `${listings.length} seller${listings.length === 1 ? '' : 's'} available`;
  }

  function hasActiveFilters() {
    return !!(filters.verifiedOnly || filters.inStockOnly || filters.maxDistanceKm || filters.minPrice || filters.maxPrice);
  }

  function renderChips() {
    const el = document.getElementById('filterChips');
    const btn = document.getElementById('filterToggleBtn');
    if (!el) return;
    const chips = [];
    if (filters.verifiedOnly) chips.push(['Verified Shops', () => { filters.verifiedOnly = false; refresh(); }]);
    if (filters.inStockOnly) chips.push(['In Stock', () => { filters.inStockOnly = false; refresh(); }]);
    if (filters.maxDistanceKm) chips.push([`Within ${filters.maxDistanceKm} km`, () => { filters.maxDistanceKm = null; refresh(); }]);
    if (filters.minPrice || filters.maxPrice) {
      const label = `₹${filters.minPrice || 0}–₹${filters.maxPrice || '∞'}`;
      chips.push([label, () => { filters.minPrice = ''; filters.maxPrice = ''; refresh(); }]);
    }
    if (btn) btn.classList.toggle('has-active', chips.length > 0);
    if (!chips.length) { el.innerHTML = ''; return; }
    el.innerHTML = chips
      .map((c, i) => `<span class="chip" data-idx="${i}">${escapeHtml(c[0])} <button onclick="AtProductPage.removeChip(${i})">✕</button></span>`)
      .join('') + `<span class="chip clear" onclick="AtProductPage.clearFilters()">Clear All</span>`;
    el._handlers = chips.map((c) => c[1]);
  }

  function removeChip(i) {
    const el = document.getElementById('filterChips');
    if (el && el._handlers && el._handlers[i]) el._handlers[i]();
  }

  function renderSellerList() {
    const el = document.getElementById('sellerList');
    if (!el) return;
    if (!listings.length) {
      el.innerHTML = `<div class="notice">No sellers currently match. Try adjusting filters or your location.</div>`;
      return;
    }
    const nearestKm = listings.reduce((min, l) => (l.distanceKm !== null && l.distanceKm < min ? l.distanceKm : min), Infinity);
    el.innerHTML = listings
      .map((l) => {
        const isNearest = l.distanceKm !== null && l.distanceKm === nearestKm;
        const stockClass = l.availability === 'IN_STOCK' ? 'stock-in' : l.availability === 'LOW_STOCK' ? 'stock-low' : 'stock-out';
        const stockLabel = l.availability === 'IN_STOCK' ? 'In Stock' : l.availability === 'LOW_STOCK' ? 'Low Stock' : 'Out of Stock';
        return `<div class="seller-card ${l.isBestLocalPrice ? 'best' : ''}">
          <div class="sc-main">
            <div class="sc-name">${escapeHtml(l.sellerName)} ${l.sellerVerified ? '<span title="Verified">✓</span>' : ''}</div>
            <div class="sc-badges">
              ${l.sellerVerified ? '<span class="badge verified">✓ Verified Shop</span>' : ''}
              <span class="badge ${stockClass}">${stockLabel}</span>
              ${l.isBestLocalPrice ? '<span class="badge best">BEST LOCAL PRICE</span>' : ''}
              ${isNearest ? '<span class="badge nearest">NEAREST</span>' : ''}
            </div>
            <div class="sc-meta">
              <span>${l.distanceText || 'Set your location for distance'}</span>
              <span>★ ${l.sellerRating || '—'} (${l.sellerRatingCount || 0})</span>
              <span class="${l.stalePrice ? 'stale-note' : ''}">Updated ${l.updatedText}</span>
              ${l.deliveryAvailable ? '<span>Delivery</span>' : ''}
              ${l.pickupAvailable ? '<span>Pickup</span>' : ''}
            </div>
          </div>
          <div class="sc-price">
            <b>₹${l.price.toLocaleString('en-IN')}</b>
            ${l.discountPct ? `<div class="muted">${l.discountPct}% off MRP</div>` : ''}
          </div>
          <div class="sc-actions">
            <button class="btn" onclick='AtProductPage.contactSeller(${JSON.stringify({ sellerId: l.sellerId, sellerName: l.sellerName, price: l.price, distanceText: l.distanceText, availability: l.availability, sellerVerified: l.sellerVerified })})'>Contact Seller</button>
          </div>
        </div>`;
      })
      .join('');
  }

  // ---- Filters ----
  function openFilters() {
    document.getElementById('f-verified').checked = filters.verifiedOnly;
    document.getElementById('f-instock').checked = filters.inStockOnly;
    document.querySelectorAll('input[name="f-dist"]').forEach((r) => {
      r.checked = String(filters.maxDistanceKm || '') === r.value;
    });
    document.getElementById('f-minprice').value = filters.minPrice || '';
    document.getElementById('f-maxprice').value = filters.maxPrice || '';
    document.getElementById('filterPanel').classList.add('open');
  }
  function closeFilters() {
    document.getElementById('filterPanel').classList.remove('open');
  }
  function applyFilters() {
    filters.verifiedOnly = document.getElementById('f-verified').checked;
    filters.inStockOnly = document.getElementById('f-instock').checked;
    const distEl = document.querySelector('input[name="f-dist"]:checked');
    filters.maxDistanceKm = distEl && distEl.value ? Number(distEl.value) : null;
    filters.minPrice = document.getElementById('f-minprice').value || '';
    filters.maxPrice = document.getElementById('f-maxprice').value || '';
    closeFilters();
    refresh();
  }
  function clearFilters() {
    filters = { verifiedOnly: false, inStockOnly: false, maxDistanceKm: null, minPrice: '', maxPrice: '' };
    closeFilters();
    refresh();
  }

  // ---- Sort ----
  function toggleSortMenu() {
    document.getElementById('sortMenu').classList.toggle('open');
  }
  function closeSortMenu() {
    document.getElementById('sortMenu')?.classList.remove('open');
  }
  function applySort(id) {
    sort = id;
    const label = SORT_OPTIONS.find((o) => o.id === id)?.label || id;
    document.getElementById('sortLabel').textContent = label;
    document.querySelectorAll('.sort-opt').forEach((el) => el.classList.toggle('active', el.dataset.sort === id));
    closeSortMenu();
    refresh();
  }

  function refresh() {
    loadListings();
  }

  // ---- Contact seller ----
  function digitsOnly(s) { return String(s || '').replace(/\D/g, ''); }
  function toWhatsAppNumber(phone) {
    let d = digitsOnly(phone);
    if (!d) return null;
    if (d.length === 10) d = '91' + d;
    else if (d.length === 11 && d.startsWith('0')) d = '91' + d.slice(1);
    return d;
  }
  function toTelHref(phone) {
    let d = digitsOnly(phone);
    if (!d) return null;
    if (d.length === 10) d = '91' + d;
    return `+${d}`;
  }

  async function contactSeller(listingSummary) {
    const body = document.getElementById('modalBody');
    body.innerHTML = `<button class="close" onclick="closeModal()">✕</button>
      <div class="contact-shop">Contact ${escapeHtml(listingSummary.sellerName)}</div>
      <div class="spinner-text">Loading contact details…</div>`;
    document.getElementById('modal').style.display = 'flex';
    try {
      const { seller } = await Api.seller(listingSummary.sellerId);
      const phone = seller.contactPhone;
      const tel = toTelHref(phone);
      const wa = toWhatsAppNumber(phone);
      body.innerHTML = `<button class="close" onclick="closeModal()">✕</button>
        <div class="contact-shop">Contact ${escapeHtml(seller.shopName)}</div>
        <div class="sc-badges" style="margin:6px 0 14px">
          <span class="badge best">₹${listingSummary.price.toLocaleString('en-IN')}</span>
          ${listingSummary.distanceText ? `<span class="badge nearest">${listingSummary.distanceText}</span>` : ''}
          ${seller.verified ? '<span class="badge verified">✓ Verified</span>' : ''}
          <span class="badge ${listingSummary.availability === 'OUT_OF_STOCK' ? 'stock-out' : 'stock-in'}">${listingSummary.availability === 'OUT_OF_STOCK' ? 'Out of stock' : 'In Stock'}</span>
        </div>
        ${tel
          ? `<div class="muted">Phone</div><div class="phone-num">${escapeHtml(phone)}</div>`
          : `<div class="notice">Phone number unavailable</div>`}
        <div class="contact-actions">
          ${tel ? `<a class="btn call" href="tel:${tel}">📞 Call Seller</a>` : ''}
          ${wa ? `<a class="btn whatsapp" target="_blank" rel="noopener" href="https://wa.me/${wa}?text=${encodeURIComponent('Hi, I found your shop on AtPrice and I am interested in a product you have listed.')}">💬 WhatsApp</a>` : ''}
          <button class="btn shop" onclick='AtProductPage.viewShop(${JSON.stringify(listingSummary.sellerId)})'>🏪 View Shop</button>
        </div>`;
    } catch (e) {
      body.innerHTML = `<button class="close" onclick="closeModal()">✕</button>
        <div class="contact-shop">Contact ${escapeHtml(listingSummary.sellerName)}</div>
        <div class="notice error">${escapeHtml(e.message || 'Unable to load seller contact details.')}</div>`;
    }
  }

  async function viewShop(sellerId) {
    const body = document.getElementById('modalBody');
    body.innerHTML = `<button class="close" onclick="closeModal()">✕</button><div class="spinner-text">Loading shop…</div>`;
    document.getElementById('modal').style.display = 'flex';
    try {
      const { seller } = await Api.seller(sellerId);
      const loc = seller.location || {};
      const tel = toTelHref(seller.contactPhone);
      const wa = toWhatsAppNumber(seller.contactPhone);
      body.innerHTML = `<button class="close" onclick="closeModal()">✕</button>
        <div class="contact-shop">${escapeHtml(seller.shopName)}</div>
        ${seller.verified ? '<span class="badge verified">✓ Verified Shop</span>' : '<span class="badge stock-low">Pending verification</span>'}
        <div class="shop-profile" style="margin-top:14px">
          <div class="sp-row"><span>Rating</span><b>★ ${seller.rating || '—'} (${seller.ratingCount || 0})</b></div>
          ${loc.address1 ? `<div class="sp-row"><span>Address</span><b>${escapeHtml([loc.address1, loc.landmark].filter(Boolean).join(', '))}</b></div>` : ''}
          ${loc.city ? `<div class="sp-row"><span>City</span><b>${escapeHtml(loc.city)}</b></div>` : ''}
          ${loc.district ? `<div class="sp-row"><span>District</span><b>${escapeHtml(loc.district)}</b></div>` : ''}
          ${seller.contactPhone ? `<div class="sp-row"><span>Phone</span><b>${escapeHtml(seller.contactPhone)}</b></div>` : ''}
          ${seller.website ? `<div class="sp-row"><span>Website</span><b>${escapeHtml(seller.website)}</b></div>` : ''}
          <div class="sp-row"><span>Delivery</span><b>${seller.deliveryAvailable ? 'Available' : 'Not available'}</b></div>
          <div class="sp-row"><span>Pickup</span><b>${seller.pickupAvailable ? 'Available' : 'Not available'}</b></div>
          ${seller.returnPolicy ? `<div class="sp-row"><span>Return policy</span><b>${escapeHtml(seller.returnPolicy)}</b></div>` : ''}
        </div>
        <div class="contact-actions">
          ${tel ? `<a class="btn call" href="tel:${tel}">📞 Call Seller</a>` : ''}
          ${wa ? `<a class="btn whatsapp" target="_blank" rel="noopener" href="https://wa.me/${wa}">💬 WhatsApp</a>` : ''}
        </div>`;
    } catch (e) {
      body.innerHTML = `<button class="close" onclick="closeModal()">✕</button><div class="notice error">${escapeHtml(e.message || 'Unable to load shop.')}</div>`;
    }
  }

  return {
    init, retry, openFilters, closeFilters, applyFilters, clearFilters, removeChip,
    toggleSortMenu, applySort, contactSeller, viewShop,
  };
})();

document.addEventListener('DOMContentLoaded', AtProductPage.init);
