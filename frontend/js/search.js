const AtSearch = (() => {
  let state = { q: '', category: '', sort: 'relevance', page: 1 };
  let suggestTimer = null;

  async function runSearch() {
    // On pages without a #products grid (e.g. product.html), searching
    // should take the user to the results page instead of erroring.
    if (!document.getElementById('products')) {
      const params = new URLSearchParams();
      if (state.q) params.set('q', state.q);
      if (state.category) params.set('category', state.category);
      window.location.href = `index.html?${params.toString()}`;
      return;
    }
    AtProducts.renderLoading();
    const params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.category) params.set('category', state.category);
    params.set('page', state.page);
    params.set('limit', 20);
    try {
      const result = await Api.searchProducts(params.toString());
      let products = result.products;
      if (state.sort === 'price_asc') products = [...products].sort((a, b) => (a.lowestPrice ?? 1e12) - (b.lowestPrice ?? 1e12));
      const statusEl = document.getElementById('searchStatus');
      if (statusEl) statusEl.textContent = state.q ? `${result.total} found` : '';
      AtProducts.render(products, { emptyMessage: 'No products matched your search.' });
      document.getElementById('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      AtProducts.renderError(e.message || 'Unable to load products.');
    }
  }

  function doSearch() {
    state.q = document.getElementById('searchInput').value.trim();
    state.category = document.getElementById('catSearch')?.value || '';
    state.page = 1;
    document.getElementById('searchSuggestions')?.classList.remove('open');
    runSearch();
  }

  async function searchSuggest() {
    const input = document.getElementById('searchInput');
    const box = document.getElementById('searchSuggestions');
    const q = input.value.trim();
    if (!q) { box.classList.remove('open'); return; }
    clearTimeout(suggestTimer);
    suggestTimer = setTimeout(async () => {
      try {
        const { products } = await Api.searchProducts(`q=${encodeURIComponent(q)}&limit=7`);
        if (!products.length) { box.classList.remove('open'); return; }
        box.innerHTML = products
          .map((p) => `<div class="suggestion" onclick="AtSearch.selectSuggestion(${JSON.stringify(p.name)})">⌕ ${escapeHtml(p.name)}</div>`)
          .join('');
        box.classList.add('open');
      } catch {
        box.classList.remove('open');
      }
    }, 200);
  }

  function selectSuggestion(v) {
    document.getElementById('searchInput').value = v;
    doSearch();
  }

  function fill(text) {
    document.getElementById('searchInput').value = text;
    if (document.getElementById('catSearch')) document.getElementById('catSearch').value = '';
    doSearch();
  }

  function filterByCategory(id, name) {
    state.category = name;
    state.q = '';
    document.getElementById('searchInput').value = '';
    if (document.getElementById('catSearch')) document.getElementById('catSearch').value = name;
    runSearch();
  }

  function setSort(sort) {
    state.sort = sort;
    document.querySelectorAll('.filter[data-sort]').forEach((b) => b.classList.toggle('active', b.dataset.sort === sort));
    runSearch();
  }

  function focusSearch() {
    closeMenu();
    const i = document.getElementById('searchInput');
    i.focus();
    i.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function applyFromUrl(q, category) {
    state.q = q || '';
    state.category = category || '';
    state.page = 1;
    runSearch();
  }

  return { runSearch, doSearch, searchSuggest, selectSuggestion, fill, filterByCategory, setSort, focusSearch, applyFromUrl };
})();
