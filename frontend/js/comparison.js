const AtCompare = (() => {
  let currentProductId = null;
  let currentSort = 'best_value';

  async function open(productId) {
    currentProductId = productId;
    currentSort = 'best_value';
    document.getElementById('compare').style.display = 'block';
    document.getElementById('compareRows').innerHTML = `<tr><td colspan="7" class="spinner-text">Loading sellers…</td></tr>`;
    document.getElementById('compare').scrollIntoView({ behavior: 'smooth' });
    await load();
  }

  async function load() {
    const loc = AtLocation.getCurrent();
    const params = new URLSearchParams({ sort: currentSort });
    if (loc?.lat) { params.set('lat', loc.lat); params.set('lng', loc.lng); }
    try {
      const { product, listings } = await Api.compare(currentProductId, `?${params.toString()}`);
      document.getElementById('compareTitle').textContent = 'Compare: ' + product.name;
      renderRows(listings, product);
    } catch (e) {
      document.getElementById('compareRows').innerHTML = `<tr><td colspan="7"><div class="notice error">${escapeHtml(e.message)}</div></td></tr>`;
    }
  }

  function renderRows(listings, product) {
    const tbody = document.getElementById('compareRows');
    if (!listings.length) {
      tbody.innerHTML = `<tr><td colspan="7">No sellers currently list this product in your area.</td></tr>`;
      return;
    }
    tbody.innerHTML = listings
      .map(
        (l) => `<tr class="${l.isBestLocalPrice ? 'low' : ''}">
          <td><b>${escapeHtml(l.sellerName)}</b>${l.sellerVerified ? ' <span class="verified">✓</span>' : ''}<br><span class="muted">★ ${l.sellerRating || '—'} (${l.sellerRatingCount || 0})</span></td>
          <td>${l.distanceText || 'Set location'}</td>
          <td><b>₹${l.price.toLocaleString('en-IN')}</b>${l.discountPct ? `<br><span class="muted">${l.discountPct}% off MRP</span>` : ''}</td>
          <td>${availabilityLabel(l.availability)}</td>
          <td>${l.deliveryAvailable ? 'Delivery' : ''}${l.deliveryAvailable && l.pickupAvailable ? ' / ' : ''}${l.pickupAvailable ? 'Pickup' : ''}</td>
          <td class="${l.stalePrice ? 'stale' : ''}">Updated ${l.updatedText}${l.stalePrice ? '<br>Price may be outdated' : ''}${l.isBestLocalPrice ? '<br><span class="best">BEST LOCAL PRICE</span>' : ''}</td>
          <td><button class="btn" ${l.availability === 'OUT_OF_STOCK' ? 'disabled' : ''} onclick='AtCheckout.open(${JSON.stringify({ productName: product.name, listingId: l.listingId, sellerId: l.sellerId, sellerName: l.sellerName, price: l.price, minimumOrderQty: l.minimumOrderQty, pickupAvailable: l.pickupAvailable, deliveryAvailable: l.deliveryAvailable })})'>Order & Pay</button></td>
        </tr>`
      )
      .join('');
  }

  function availabilityLabel(a) {
    if (a === 'IN_STOCK') return '<span style="color:#15803d">● In stock</span>';
    if (a === 'LOW_STOCK') return '<span style="color:#b45309">● Low stock</span>';
    return '<span style="color:#b91c1c">● Out of stock</span>';
  }

  function sortBy(sort) {
    currentSort = sort;
    document.querySelectorAll('.compare-sort').forEach((b) => b.classList.toggle('active', b.dataset.sort === sort));
    load();
  }

  return { open, sortBy };
})();
