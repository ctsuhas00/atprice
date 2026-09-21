'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type User, type Product } from '@/lib/api';

export default function NewListingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({ price: '', availability: 'IN_STOCK', stock_quantity: '0', pickup_available: true, delivery_available: false, notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    api.getMe()
      .then(u => { setUser(u); if (u.role !== 'SELLER' && u.role !== 'ADMIN') router.push('/login'); })
      .catch(() => router.push('/login'));
  }, [router]);

  async function handleSearch(q: string) {
    setSearch(q);
    if (q.length < 2) { setSuggestions([]); return; }
    try {
      const d = await api.getSuggestions(q);
      setSuggestions(d.suggestions);
    } catch { setSuggestions([]); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProduct || !form.price) { setError('Please select a product and enter a price.'); return; }
    setSubmitting(true); setError('');
    try {
      const res = await api.createListing({
        product_id: selectedProduct.id,
        price: parseFloat(form.price),
        availability: form.availability,
        stock_quantity: parseInt(form.stock_quantity),
        pickup_available: form.pickup_available,
        delivery_available: form.delivery_available,
        notes: form.notes,
      });
      if (res.success) router.push('/seller/listings');
      else setError(res.error?.message || 'Failed to create listing.');
    } finally { setSubmitting(false); }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add New Listing</h1>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Product search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search Product <span className="text-red-500">*</span></label>
          {selectedProduct ? (
            <div className="flex items-center justify-between p-3 bg-navy-50 border border-navy-200 rounded-lg">
              <div>
                <div className="font-medium text-navy-900 text-sm">{selectedProduct.name}</div>
                <div className="text-xs text-gray-500">{selectedProduct.brand} · {selectedProduct.category_name}</div>
              </div>
              <button type="button" onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-gray-600 text-xs">Change</button>
            </div>
          ) : (
            <div className="relative">
              <input type="text" value={search} onChange={e => handleSearch(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400"
                placeholder="Search cement, pipes, tools..." />
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-100 z-20 max-h-60 overflow-y-auto">
                  {suggestions.map(s => (
                    <button key={s.id} type="button" onClick={() => { setSelectedProduct(s); setSuggestions([]); setSearch(''); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                      <div className="text-sm font-medium text-gray-900">{s.name}</div>
                      <div className="text-xs text-gray-500">{s.brand} · {s.category_name}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Your Price (₹) <span className="text-red-500">*</span></label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
            <input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
              className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400"
              placeholder="0.00" required />
          </div>
        </div>

        {/* Availability */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
          <select value={form.availability} onChange={e => setForm({ ...form, availability: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400">
            <option value="IN_STOCK">In Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
        </div>

        {/* Stock quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
          <input type="number" min="0" value={form.stock_quantity} onChange={e => setForm({ ...form, stock_quantity: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400" />
        </div>

        {/* Checkboxes */}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.pickup_available} onChange={e => setForm({ ...form, pickup_available: e.target.checked })} className="rounded" />
            Pickup Available
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.delivery_available} onChange={e => setForm({ ...form, delivery_available: e.target.checked })} className="rounded" />
            Delivery Available
          </label>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-navy-400"
            placeholder="Any additional info for buyers..." />
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => router.push('/seller/listings')}
            className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="flex-1 btn-primary disabled:opacity-50">
            {submitting ? 'Creating...' : 'Create Listing'}
          </button>
        </div>
      </form>
    </div>
  );
}
