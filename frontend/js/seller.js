const AtSeller = (() => {
  const STEPS = ['Account', 'Business', 'Documents', 'Location', 'Verification', 'Products', 'Bank & payout', 'Review'];
  let step = 1;
  let data = {};

  function stepsHtml() {
    return `<div class="seller-steps">${STEPS.map((s, i) => `<span class="seller-step ${step === i + 1 ? 'active' : ''}">${i + 1}. ${s}</span>`).join('')}</div>
      <div class="progress"><i style="width:${step * 12.5}%"></i></div>`;
  }

  function openRegistration() {
    step = 1;
    data = {};
    renderStep();
    document.getElementById('modal').style.display = 'flex';
  }

  function collectVisibleFields() {
    document.querySelectorAll('#modalBody [data-field]').forEach((el) => {
      data[el.dataset.field] = el.value;
    });
  }

  function next() {
    collectVisibleFields();
    if (step === 1 && (!data.ownerName || !data.mobile || !data.password)) {
      return alert('Please fill in your name, mobile number, and a password.');
    }
    if (step === 2 && !data.shopName) return alert('Please enter your shop name.');
    if (step < 8) step += 1;
    renderStep();
  }
  function back() {
    collectVisibleFields();
    if (step > 1) step -= 1;
    renderStep();
  }

  function renderStep() {
    const body = document.getElementById('modalBody');
    body.innerHTML = `<button class="close" onclick="closeModal()">✕</button>
      <h2>Sell on AtPrice</h2>${stepsHtml()}<div id="seller-step-body"></div>
      <div style="display:flex;gap:10px;margin-top:16px">
        ${step > 1 ? '<button class="btn outline" id="seller-back" style="width:auto">Back</button>' : ''}
        <button class="btn" id="seller-next" style="width:auto">${step === 8 ? 'Submit application' : 'Continue'}</button>
      </div>
      <div id="seller-status"></div>`;

    document.getElementById('seller-step-body').innerHTML = stepBody();
    document.getElementById('seller-next').onclick = step === 8 ? submit : next;
    if (step > 1) document.getElementById('seller-back').onclick = back;
  }

  function v(field) { return data[field] || ''; }

  function stepBody() {
    switch (step) {
      case 1:
        return `<div class="form-grid">
          <label>Your full name<input data-field="ownerName" value="${v('ownerName')}"></label>
          <label>Mobile number<input data-field="mobile" value="${v('mobile')}"></label>
          <label>Email (optional)<input data-field="email" value="${v('email')}"></label>
          <label>Password<input type="password" data-field="password" value="${v('password')}"></label>
        </div>`;
      case 2:
        return `<div class="form-grid">
          <label>Shop / business name<input data-field="shopName" value="${v('shopName')}"></label>
          <label>Trade name (if different)<input data-field="tradeName" value="${v('tradeName')}"></label>
          <label>Seller type
            <select data-field="sellerType">
              <option ${v('sellerType') === 'RETAILER' ? 'selected' : ''}>RETAILER</option>
              <option ${v('sellerType') === 'WHOLESALER' ? 'selected' : ''}>WHOLESALER</option>
              <option ${v('sellerType') === 'DISTRIBUTOR' ? 'selected' : ''}>DISTRIBUTOR</option>
            </select>
          </label>
          <label>Years in business<input type="number" data-field="years" value="${v('years')}"></label>
          <label>GSTIN (optional)<input data-field="gstin" value="${v('gstin')}"></label>
          <label>PAN (optional)<input data-field="pan" value="${v('pan')}"></label>
          <label class="full">Business description<textarea data-field="description">${v('description')}</textarea></label>
        </div>`;
      case 3:
        return `<div class="notice">Document verification uses a DEMO/mock verifier in this environment. Real GST/PAN/Udyam verification requires production API credentials (see README).</div>
          <div class="upload"><label>PAN card<input type="file" data-field="panFile"></label></div>
          <div class="upload" style="margin-top:10px"><label>GST certificate<input type="file" data-field="gstFile"></label></div>
          <div class="upload" style="margin-top:10px"><label>Shop photo<input type="file" data-field="shopPhoto"></label></div>`;
      case 4:
        return `<div class="form-grid">
          <label class="full">Address<input data-field="address1" value="${v('address1')}"></label>
          <label>Landmark<input data-field="landmark" value="${v('landmark')}"></label>
          <label>City<input data-field="city" value="${v('city')}"></label>
          <label>District<input data-field="district" value="${v('district')}"></label>
          <label>State<input data-field="state" value="${v('state')}"></label>
          <label>PIN code<input data-field="pincode" value="${v('pincode')}"></label>
        </div>`;
      case 5:
        return `<div class="notice">We will verify your mobile (OTP — DEMO), and optionally GSTIN/PAN/Udyam. This is mock verification for local development.</div>
          <p>Mobile OTP: <b>DEMO</b> — any 6-digit code is accepted in this environment.</p>
          <label>Enter OTP<input maxlength="6" placeholder="123456"></label>`;
      case 6:
        return `<div class="notice">Add your first product now, or skip and add products later from your dashboard.</div>
          <div class="form-grid">
            <label>Product name<input data-field="productName" value="${v('productName')}"></label>
            <label>Brand<input data-field="brand" value="${v('brand')}"></label>
            <label>Price (₹)<input type="number" data-field="price" value="${v('price')}"></label>
            <label>MRP (₹)<input type="number" data-field="mrp" value="${v('mrp')}"></label>
            <label>Stock quantity<input type="number" data-field="stock" value="${v('stock')}"></label>
            <label>Unit<input data-field="unit" value="${v('unit') || 'piece'}"></label>
            <label class="full">Specifications<input data-field="specs" value="${v('specs')}"></label>
          </div>`;
      case 7:
        return `<div class="form-grid">
          <label>Bank name<input data-field="bankName" value="${v('bankName')}"></label>
          <label>Account number<input data-field="account" value="${v('account')}"></label>
          <label>IFSC<input data-field="ifsc" value="${v('ifsc')}"></label>
          <label>UPI ID (optional)<input data-field="upi" value="${v('upi')}"></label>
          <label>Pickup
            <select data-field="pickup"><option>Available</option><option>Not available</option></select>
          </label>
          <label>Delivery
            <select data-field="delivery"><option>Available</option><option>Not available</option></select>
          </label>
          <label>Delivery radius (km)<input type="number" data-field="deliveryRadius" value="${v('deliveryRadius') || 15}"></label>
          <label class="full">Return policy<input data-field="returnPolicy" value="${v('returnPolicy')}"></label>
        </div>`;
      case 8:
        return `<div class="notice">Review your details, then submit. Your shop will show <b>PENDING_VERIFICATION</b> until an AtPrice admin approves it.</div>
          <ul>
            <li>Shop: ${escapeHtml(v('shopName'))}</li>
            <li>Owner: ${escapeHtml(v('ownerName'))}</li>
            <li>Mobile: ${escapeHtml(v('mobile'))}</li>
            <li>City: ${escapeHtml(v('city'))}</li>
          </ul>`;
      default:
        return '';
    }
  }

  async function submit() {
    collectVisibleFields();
    const status = document.getElementById('seller-status');
    status.innerHTML = `<div class="notice">Submitting application…</div>`;
    try {
      const result = await Api.registerSeller(data);
      status.innerHTML = `<div class="notice verified">Application submitted! Your seller code is <b>${result.sellerCode}</b>. Status: PENDING_VERIFICATION.</div>
        <button class="btn" onclick="closeModal()">Done</button>`;
    } catch (e) {
      status.innerHTML = `<div class="notice error">${escapeHtml(e.message)}</div>`;
    }
  }

  // ---- Seller login (demo picker: real deployments should use a proper
  // phone+password form against POST /api/sellers/login) ----
  async function openLogin() {
    document.getElementById('modalBody').innerHTML = `<button class="close" onclick="closeModal()">✕</button>
      <h2>Seller login</h2>
      <div class="form-grid">
        <label>Mobile<input id="seller-login-mobile"></label>
        <label>Password<input type="password" id="seller-login-password"></label>
      </div>
      <button class="btn" id="seller-login-btn">Log in</button>
      <div id="seller-login-status" style="margin-top:10px"></div>`;
    document.getElementById('modal').style.display = 'flex';
    document.getElementById('seller-login-btn').onclick = async () => {
      const status = document.getElementById('seller-login-status');
      try {
        const mobile = document.getElementById('seller-login-mobile').value.trim();
        const password = document.getElementById('seller-login-password').value;
        const { token, seller } = await Api.sellerLogin({ mobile, password });
        localStorage.setItem('atprice_token', token);
        localStorage.setItem('atprice_seller', JSON.stringify(seller));
        closeModal();
        AtDashboard.open(seller.sellerId);
      } catch (e) {
        status.innerHTML = `<div class="notice error">${escapeHtml(e.message)}</div>`;
      }
    };
  }

  // ---- Catalog connect (spec section 15) ----
  function openCatalogConnect() {
    document.getElementById('modalBody').innerHTML = `<button class="close" onclick="closeModal()">✕</button>
      <h2>Connect your catalogue</h2>
      <div class="notice">AtPrice can read publicly published product data from your own website (structured Product/Offer schema.org data), or you can configure Google Merchant / POS-ERP integrations. Nothing goes live until you confirm it.</div>
      <div class="form-grid">
        <label class="full">Your shop website URL<input id="catalog-url" placeholder="https://yourshop.example.com/products/some-item"></label>
      </div>
      <button class="btn" id="catalog-discover-btn">Discover products</button>
      <div id="catalog-result" class="import-result"></div>`;
    document.getElementById('modal').style.display = 'flex';
    document.getElementById('catalog-discover-btn').onclick = async () => {
      const result = document.getElementById('catalog-result');
      const url = document.getElementById('catalog-url').value.trim();
      result.innerHTML = `<div class="spinner-text">Reading structured product data…</div>`;
      try {
        const data = await Api.discoverCatalog(url);
        if (!data.items.length) {
          result.innerHTML = `<div class="notice">No structured product data was found on that page. Try a specific product page, or use Google Merchant / POS import instead.</div>`;
          return;
        }
        result.innerHTML = `<div class="notice">${data.items.length} product(s) found — status: NEEDS_SELLER_CONFIRMATION. Review before these go live.</div>
          <div class="import-list">${data.items.map((it) => `<div class="import-item"><b>${escapeHtml(it.name || 'Unnamed product')}</b> — ${it.price ? '₹' + it.price : 'price unknown'}</div>`).join('')}</div>`;
      } catch (e) {
        result.innerHTML = `<div class="notice error">${escapeHtml(e.message)}</div>`;
      }
    };
  }

  return { openRegistration, openLogin, openCatalogConnect };
})();
