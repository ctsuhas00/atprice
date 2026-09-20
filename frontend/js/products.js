const AtProducts = (() => {
  let categories = [];

  const CATEGORY_IMAGES = {
    'Building Materials': 'https://images.pexels.com/photos/1216589/pexels-photo-1216589.jpeg?auto=compress&cs=tinysrgb&w=600',
    'Plumbing & Sanitary': 'https://images.pexels.com/photos/8486944/pexels-photo-8486944.jpeg?auto=compress&cs=tinysrgb&w=600',
    'Electrical': 'https://images.pexels.com/photos/6473303/pexels-photo-6473303.jpeg?auto=compress&cs=tinysrgb&w=600',
    'Tools & Machinery': 'https://images.pexels.com/photos/4483610/pexels-photo-4483610.jpeg?auto=compress&cs=tinysrgb&w=600',
    'Paints & Chemicals': 'https://images.pexels.com/photos/1669799/pexels-photo-1669799.jpeg?auto=compress&cs=tinysrgb&w=600',
    'Steel & Metal': 'https://images.pexels.com/photos/2760242/pexels-photo-2760242.jpeg?auto=compress&cs=tinysrgb&w=600',
  };
  const DEFAULT_CAT_IMAGE = 'https://images.pexels.com/photos/5691646/pexels-photo-5691646.jpeg?auto=compress&cs=tinysrgb&w=600';

  async function loadCategories() {
    const { categories: cats } = await Api.categories();
    categories = cats;
    return categories;
  }

  function buildCategoryUI() {
    const grid = document.getElementById('categoryGrid');
    if (!grid) return;
    grid.innerHTML = categories
      .map(
        (c) => `<a class="cat" style="--cat-image:url('${CATEGORY_IMAGES[c.name] || DEFAULT_CAT_IMAGE}')" onclick="AtSearch.filterByCategory(${c.id}, ${JSON.stringify(c.name)})"><span>${c.name}</span></a>`
      )
      .join('');
    const select = document.getElementById('catSearch');
    if (select) {
      select.innerHTML = `<option value="">All categories</option>` + categories.map((c) => `<option value="${c.name}">${c.name}</option>`).join('');
    }
  }

  function priceCardHtml(p) {
    const image = p.image || DEFAULT_CAT_IMAGE;
    const hasPrice = p.lowestPrice !== null && p.lowestPrice !== undefined;
    const href = `product.html?id=${encodeURIComponent(p.id)}`;
    return `<div class="card">
      <a href="${href}" class="pic" style="display:block"><img src="${image}" alt="${escapeHtml(p.name)}" loading="lazy"></a>
      <div class="body">
        <div class="brand">${escapeHtml(p.brand || '')} • ${p.sellerCount} seller${p.sellerCount === 1 ? '' : 's'}</div>
        <h3><a href="${href}" style="color:inherit;text-decoration:none">${escapeHtml(p.name)}</a></h3>
        <div class="stars">★★★★☆ <span style="color:#64748b">(${p.sellerCount * 8 + 12})</span></div>
        ${hasPrice
          ? `<div class="price">₹${p.lowestPrice.toLocaleString('en-IN')} ${p.mrp ? `<span class="old">MRP ₹${p.mrp.toLocaleString('en-IN')}</span>` : ''}</div>
             <span class="best">BEST LOCAL PRICE</span>
             <div class="seller">
               <div class="sellerline"><span>${escapeHtml(p.lowestPriceSeller || '')}</span><b>${p.category || ''}</b></div>
               <div class="sellerline"><span>● In stock nearby</span><span class="${p.updated?.stale ? 'stale' : ''}">Updated ${p.updated?.text || '—'}</span></div>
             </div>`
          : `<div class="notice">No sellers currently list this product.</div>`}
        <a class="btn" style="display:block;text-align:center;text-decoration:none;box-sizing:border-box" href="${href}">View Product</a>
      </div>
    </div>`;
  }

  function render(products, { emptyMessage = 'No products found.' } = {}) {
    const el = document.getElementById('products');
    if (!el) return;
    if (!products.length) {
      el.innerHTML = `<div class="spinner-text">${emptyMessage}</div>`;
      return;
    }
    el.innerHTML = products.map(priceCardHtml).join('');
  }

  function renderLoading() {
    const el = document.getElementById('products');
    if (el) el.innerHTML = `<div class="spinner-text">Loading products…</div>`;
  }

  function renderError(message) {
    const el = document.getElementById('products');
    if (el) el.innerHTML = `<div class="notice error">${escapeHtml(message)}</div>`;
  }

  return { loadCategories, buildCategoryUI, render, renderLoading, renderError, get categories() { return categories; } };
})();

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
