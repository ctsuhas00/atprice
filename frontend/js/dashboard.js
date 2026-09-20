const AtDashboard = (() => {
  let sellerId = null;
  let section = 'overview';

  async function open(id) {
    sellerId = id;
    section = 'overview';
    document.getElementById('modalBody').innerHTML = `<button class="close" onclick="closeModal()">✕</button>
      <div class="dashboard">
        <div class="side" id="dash-side"></div>
        <div class="dashmain" id="dash-main"></div>
      </div>`;
    document.getElementById('modal').style.display = 'flex';
    renderSide();
    await renderSection();
  }

  function renderSide() {
    const items = [
      ['overview', 'Overview'], ['orders', 'Orders'], ['products', 'Products'],
      ['prices', 'Prices & Stock'], ['profile', 'Shop Profile'], ['payouts', 'Payouts'],
    ];
    document.getElementById('dash-side').innerHTML = items
      .map(([key, label]) => `<div class="${section === key ? 'sel' : ''}" onclick="AtDashboard.goto('${key}')">${label}</div>`)
      .join('');
  }

  function goto(key) { section = key; renderSide(); renderSection(); }

  async function renderSection() {
    const main = document.getElementById('dash-main');
    main.innerHTML = `<div class="spinner-text">Loading…</div>`;
    try {
      if (section === 'overview') return renderOverview(main);
      if (section === 'orders') return renderOrders(main);
      if (section === 'products' || section === 'prices') return renderListings(main, section === 'prices');
      if (section === 'profile') return renderProfile(main);
      if (section === 'payouts') return renderPayouts(main);
    } catch (e) {
      main.innerHTML = `<div class="notice error">${escapeHtml(e.message)}</div>`;
    }
  }

  async function renderOverview(main) {
    const { seller, stats } = await Api.sellerDashboard(sellerId);
    main.innerHTML = `
      <h2>${escapeHtml(seller.shopName)} ${seller.verified ? '<span class="verified">✓ Verified</span>' : '<span class="muted">(pending verification)</span>'}</h2>
      <div class="dashcards">
        <div class="stat"><div class="muted">Total products</div><b>${stats.totalProducts}</b></div>
        <div class="stat"><div class="muted">Active listings</div><b>${stats.activeListings}</b></div>
        <div class="stat"><div class="muted">Orders</div><b>${stats.orders}</b></div>
        <div class="stat"><div class="muted">Paid orders</div><b>${stats.paidOrders}</b></div>
        <div class="stat"><div class="muted">Pending orders</div><b>${stats.pendingOrders}</b></div>
        <div class="stat"><div class="muted">Revenue</div><b>₹${stats.revenue.toLocaleString('en-IN')}</b></div>
        <div class="stat"><div class="muted">Low stock items</div><b>${stats.lowStockProducts}</b></div>
      </div>`;
  }

  async function renderOrders(main) {
    const { orders } = await Api.sellerOrders(sellerId);
    if (!orders.length) { main.innerHTML = `<h2>Orders</h2><div class="spinner-text">No orders yet.</div>`; return; }
    const NEXT_STATUS = {
      PAID: 'CONFIRMED', CONFIRMED: 'PROCESSING', PROCESSING: 'OUT_FOR_DELIVERY',
      OUT_FOR_DELIVERY: 'DELIVERED', READY_FOR_PICKUP: 'DELIVERED',
    };
    main.innerHTML = `<h2>Orders</h2>` + orders
      .map((o) => `<div class="order-card ${o.sellerNotification.unread ? 'new' : ''}">
        <b>${escapeHtml(o.orderId)}</b> — ${escapeHtml(o.status)} ${o.sellerNotification.unread ? '<span class="best">NEW</span>' : ''}<br>
        ${escapeHtml(o.customer.name)} • ${escapeHtml(o.customer.phone)}<br>
        ${o.items.map((i) => `${escapeHtml(i.name)} × ${i.qty}`).join(', ')}<br>
        <b>Total: ₹${o.total.toLocaleString('en-IN')}</b>
        <div class="delivery-box">${o.delivery.address ? escapeHtml([o.delivery.address, o.delivery.locality, o.delivery.city].filter(Boolean).join(', ')) : 'Store pickup'}</div>
        <div class="order-actions">
          ${NEXT_STATUS[o.status] ? `<button class="btn" onclick="AtDashboard.advance('${o.orderId}','${NEXT_STATUS[o.status]}')">Mark as ${NEXT_STATUS[o.status].replace(/_/g, ' ')}</button>` : ''}
          ${!['DELIVERED', 'CANCELLED'].includes(o.status) ? `<button class="btn outline" onclick="AtDashboard.advance('${o.orderId}','CANCELLED')">Cancel</button>` : ''}
        </div>
      </div>`)
      .join('');
  }

  async function advance(orderId, status) {
    try {
      await Api.updateOrderStatus(orderId, status);
      renderSection();
    } catch (e) {
      alert(e.message);
    }
  }

  async function renderListings(main, editable) {
    const { listings } = await Api.sellerListings(sellerId);
    main.innerHTML = `<h2>${editable ? 'Prices & Stock' : 'Products'}</h2>
      ${editable ? '' : `<button class="btn outline" style="width:auto;margin-bottom:12px" onclick="AtDashboard.openAddProduct()">+ Add product</button>`}
      <table class="table"><thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Status</th>${editable ? '<th>Update</th>' : ''}</tr></thead>
      <tbody>${listings
        .map(
          (l) => `<tr>
            <td>${escapeHtml(l.product_name)}<br><span class="muted">${escapeHtml(l.brand || '')}</span></td>
            <td>${editable ? `<input type="number" id="price-${l.id}" value="${l.price}" style="width:90px">` : `₹${l.price}`}</td>
            <td>${editable ? `<input type="number" id="stock-${l.id}" value="${l.stock_quantity}" style="width:70px">` : l.stock_quantity}</td>
            <td>${l.availability}</td>
            ${editable ? `<td><button class="btn" style="width:auto" onclick="AtDashboard.saveListing('${l.id}')">Save</button></td>` : ''}
          </tr>`
        )
        .join('')}</tbody></table>`;
  }

  async function saveListing(id) {
    const price = Number(document.getElementById(`price-${id}`).value);
    const stockQuantity = Number(document.getElementById(`stock-${id}`).value);
    try {
      await Api.updateListing(id, { price, stockQuantity });
      renderSection();
    } catch (e) {
      alert(e.message);
    }
  }

  function openAddProduct() {
    document.getElementById('dash-main').innerHTML = `<h2>Add product</h2>
      <div class="form-grid">
        <label>Name<input id="np-name"></label>
        <label>Brand<input id="np-brand"></label>
        <label>Price (₹)<input type="number" id="np-price"></label>
        <label>MRP (₹)<input type="number" id="np-mrp"></label>
        <label>Stock<input type="number" id="np-stock"></label>
        <label>Unit<input id="np-unit" value="piece"></label>
      </div>
      <button class="btn" id="np-save" style="width:auto">Save product</button>
      <div id="np-status"></div>`;
    document.getElementById('np-save').onclick = async () => {
      const status = document.getElementById('np-status');
      try {
        await Api.addSellerProduct({
          name: document.getElementById('np-name').value,
          brand: document.getElementById('np-brand').value,
          price: Number(document.getElementById('np-price').value),
          mrp: Number(document.getElementById('np-mrp').value) || null,
          stock: Number(document.getElementById('np-stock').value) || 0,
          unit: document.getElementById('np-unit').value,
        });
        goto('products');
      } catch (e) {
        status.innerHTML = `<div class="notice error">${escapeHtml(e.message)}</div>`;
      }
    };
  }

  async function renderProfile(main) {
    const { seller } = await Api.seller(sellerId);
    main.innerHTML = `<h2>Shop Profile</h2>
      <p><b>${escapeHtml(seller.shopName)}</b> (${escapeHtml(seller.sellerCode)})</p>
      <p>Status: ${escapeHtml(seller.status)}</p>
      ${seller.location ? `<p>${escapeHtml([seller.location.address1, seller.location.city, seller.location.district, seller.location.state].filter(Boolean).join(', '))}</p>` : ''}
      <button class="btn outline" style="width:auto" onclick="AtSeller.openCatalogConnect()">Connect catalogue source</button>`;
  }

  function renderPayouts(main) {
    main.innerHTML = `<h2>Payouts</h2>
      <div class="notice">Payout transfers require a live Razorpay Route / RazorpayX configuration. In DEMO mode, order totals accrue as "Revenue" on the Overview tab but no bank transfer occurs.</div>`;
  }

  return { open, goto, advance, saveListing, openAddProduct };
})();
