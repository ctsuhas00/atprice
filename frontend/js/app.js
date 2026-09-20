/* app.js — shared state, auth, location, UI helpers */

// ── State ──────────────────────────────────────────────────────────────────
window.ATPRICE = {
  user: null, seller: null, token: null,
  location: null, // {city, lat, lng}
};

// ── Format helpers ─────────────────────────────────────────────────────────
function fmtPrice(n) {
  if (n == null) return '—';
  return '₹' + Number(n).toLocaleString('en-IN');
}
function fmtDist(km) {
  if (km == null) return '';
  if (km < 1) return Math.round(km * 1000) + ' m';
  return km.toFixed(1) + ' km';
}
function fmtRating(r, count) {
  if (!r) return '';
  const stars = '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r));
  return `<span class="stars">${stars}</span> <span class="rating-count">${Number(r).toFixed(1)} (${count || 0})</span>`;
}
function availChip(status) {
  const map = { IN_STOCK: ['in-stock', '✓ In Stock'], LOW_STOCK: ['low-stock', '⚠ Low Stock'], OUT_OF_STOCK: ['out-stock', '✗ Out of Stock'] };
  const [cls, label] = map[status] || ['out-stock', status];
  return `<span class="avail-chip ${cls}">${label}</span>`;
}
function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
function showToast(msg, type = 'success') {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;z-index:9999;transition:opacity .3s;pointer-events:none;';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.background = type === 'error' ? '#ef4444' : '#22c55e';
  t.style.color = 'white';
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity = '0'; }, 3000);
}
window.fmtPrice = fmtPrice; window.fmtDist = fmtDist; window.fmtRating = fmtRating;
window.availChip = availChip; window.escHtml = escHtml; window.debounce = debounce;
window.showToast = showToast;

// ── Auth ───────────────────────────────────────────────────────────────────
function loadAuth() {
  const token = localStorage.getItem('atprice_token');
  const user = JSON.parse(localStorage.getItem('atprice_user') || 'null');
  if (token && user) {
    ATPRICE.token = token; ATPRICE.user = user;
    ATPRICE.seller = JSON.parse(localStorage.getItem('atprice_seller') || 'null');
  }
}
function saveAuth(token, user, seller) {
  localStorage.setItem('atprice_token', token);
  localStorage.setItem('atprice_user', JSON.stringify(user));
  if (seller) localStorage.setItem('atprice_seller', JSON.stringify(seller));
  ATPRICE.token = token; ATPRICE.user = user; ATPRICE.seller = seller;
}
function logout() {
  localStorage.removeItem('atprice_token');
  localStorage.removeItem('atprice_user');
  localStorage.removeItem('atprice_seller');
  ATPRICE.token = ATPRICE.user = ATPRICE.seller = null;
  updateHeaderAuth();
  showToast('Logged out.');
}
window.loadAuth = loadAuth; window.saveAuth = saveAuth; window.logout = logout;

// ── Location ───────────────────────────────────────────────────────────────
function loadLocation() {
  const loc = JSON.parse(localStorage.getItem('atprice_location') || 'null');
  if (loc) { ATPRICE.location = loc; updateLocDisplay(loc.city); }
}
function saveLocation(city, lat, lng) {
  ATPRICE.location = { city, lat, lng };
  localStorage.setItem('atprice_location', JSON.stringify(ATPRICE.location));
  updateLocDisplay(city);
}
function updateLocDisplay(city) {
  document.querySelectorAll('.loc-display').forEach(el => el.textContent = city || 'Set location');
}
window.loadLocation = loadLocation; window.saveLocation = saveLocation;

// ── Header auth update ─────────────────────────────────────────────────────
function updateHeaderAuth() {
  const loggedIn = !!ATPRICE.user;
  const u = ATPRICE.user;
  document.querySelectorAll('.auth-show-logged-out').forEach(el => el.style.display = loggedIn ? 'none' : '');
  document.querySelectorAll('.auth-show-logged-in').forEach(el => el.style.display = loggedIn ? '' : 'none');
  document.querySelectorAll('.auth-user-name').forEach(el => el.textContent = u?.name || '');
  if (ATPRICE.seller) {
    document.querySelectorAll('.auth-show-seller').forEach(el => el.style.display = '');
  }
}
window.updateHeaderAuth = updateHeaderAuth;

// ── Location modal ─────────────────────────────────────────────────────────
function openLocModal() {
  const modal = document.getElementById('loc-modal');
  if (!modal) return;
  modal.classList.add('open');
}
function closeLocModal() {
  const modal = document.getElementById('loc-modal');
  if (modal) modal.classList.remove('open');
}
window.openLocModal = openLocModal; window.closeLocModal = closeLocModal;

// ── Nav drawer ─────────────────────────────────────────────────────────────
function openNavDrawer() {
  document.getElementById('nav-drawer')?.classList.add('open');
  document.getElementById('nav-overlay')?.classList.add('open');
}
function closeNavDrawer() {
  document.getElementById('nav-drawer')?.classList.remove('open');
  document.getElementById('nav-overlay')?.classList.remove('open');
}
window.openNavDrawer = openNavDrawer; window.closeNavDrawer = closeNavDrawer;

// ── Login modal ────────────────────────────────────────────────────────────
function openLoginModal(redirect) {
  const modal = document.getElementById('login-modal');
  if (!modal) return;
  modal.dataset.redirect = redirect || '';
  modal.classList.add('open');
}
function closeLoginModal() {
  document.getElementById('login-modal')?.classList.remove('open');
}
window.openLoginModal = openLoginModal; window.closeLoginModal = closeLoginModal;

// ── WhatsApp helper ────────────────────────────────────────────────────────
function waLink(phone, productName, price, shopName) {
  const p = phone?.replace(/\D/g,'');
  const number = p?.startsWith('91') ? p : '91' + p;
  const msg = productName
    ? `Hi ${shopName || 'there'}, I found you on AtPrice. I'm interested in *${productName}* at *${fmtPrice(price)}*. Please share availability and details.`
    : `Hi, I found your shop on AtPrice. Please share your latest product prices.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
}
window.waLink = waLink;

// ── On load ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadAuth();
  loadLocation();
  updateHeaderAuth();
});
