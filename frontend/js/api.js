/* api.js — thin fetch wrapper */
const API = (() => {
  const BASE = '/api';
  function get(path, opts = {}) {
    return fetch(BASE + path, {
      headers: { 'Content-Type': 'application/json', ...authHeader(), ...opts.headers },
      ...opts
    }).then(r => r.json());
  }
  function post(path, body, opts = {}) {
    return fetch(BASE + path, {
      method: 'POST', body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', ...authHeader(), ...opts.headers },
      ...opts
    }).then(r => r.json());
  }
  function put(path, body) {
    return fetch(BASE + path, {
      method: 'PUT', body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', ...authHeader() }
    }).then(r => r.json());
  }
  function del(path) {
    return fetch(BASE + path, { method: 'DELETE', headers: authHeader() }).then(r => r.json());
  }
  function authHeader() {
    const t = localStorage.getItem('atprice_token');
    return t ? { Authorization: 'Bearer ' + t } : {};
  }

  return {
    health: () => get('/health'),
    stats: () => get('/admin/stats'),
    categories: () => get('/categories'),
    locations: () => get('/locations'),
    products: (params = {}) => get('/products?' + new URLSearchParams(params)),
    productSuggest: (q) => get('/products/suggest?q=' + encodeURIComponent(q)),
    product: (id) => get('/products/' + id),
    compare: (id, params = {}) => get('/products/' + id + '/compare?' + new URLSearchParams(params)),
    sellers: (params = {}) => get('/sellers?' + new URLSearchParams(params)),
    seller: (id) => get('/sellers/' + id),
    sellerRegister: (body) => post('/sellers/register', body),
    dashboard: () => get('/sellers/me/dashboard'),
    updateProfile: (body) => put('/sellers/me', body),
    addListing: (body) => post('/sellers/me/listings', body),
    updateListing: (id, body) => put('/sellers/me/listings/' + id, body),
    removeListing: (id) => del('/sellers/me/listings/' + id),
    login: (body) => post('/auth/login', body),
    register: (body) => post('/auth/register', body),
    me: () => get('/auth/me'),
    enquiry: (body) => post('/enquiries', body),
  };
})();
window.API = API;
