'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, Package } from 'lucide-react';
import { api, type User } from '@/lib/api';

function formatPrice(p: number | string) {
  const n = typeof p === 'string' ? parseFloat(p) : p;
  return `₹${n.toLocaleString('en-IN')}`;
}

export default function SellerListingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [listings, setListings] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    api.getMe()
      .then(u => {
        setUser(u);
        if (u.role !== 'SELLER' && u.role !== 'ADMIN') { router.push('/login'); return; }
        return api.sellerListings();
      })
      .then(d => { if (d) setListings(d.listings as Record<string, unknown>[]); })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleDelete(id: string) {
    if (!confirm('Deactivate this listing?')) return;
    await api.deleteListing(id);
    setListings(prev => prev.filter(l => l.id !== id));
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin w-8 h-8 border-4 border-navy-200 border-t-navy-900 rounded-full" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
        <Link href="/seller/listings/new" className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add Listing
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-16">
          <Package size={48} className="text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">No listings yet</h2>
          <p className="text-gray-500 mb-6">Add your first product listing to get started.</p>
          <Link href="/seller/listings/new" className="btn-primary">Add Your First Listing</Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500 text-xs uppercase tracking-wide">
                <th className="pb-3 pr-4">Product</th>
                <th className="pb-3 pr-4">Price</th>
                <th className="pb-3 pr-4">Availability</th>
                <th className="pb-3 pr-4">Updated</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {listings.map((l) => (
                <tr key={l.id as string} className="hover:bg-gray-50">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-gray-900">{l.product_name as string}</div>
                    <div className="text-xs text-gray-500">{l.brand as string} · {l.category_name as string}</div>
                  </td>
                  <td className="py-3 pr-4 font-semibold text-navy-900">{formatPrice(l.price as number)}</td>
                  <td className="py-3 pr-4">
                    <span className={
                      l.availability === 'IN_STOCK' ? 'in-stock text-xs' :
                      l.availability === 'LOW_STOCK' ? 'low-stock text-xs' : 'out-of-stock text-xs'
                    }>
                      {(l.availability as string).replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-500 text-xs">
                    {new Date(l.last_updated_at as string).toLocaleDateString('en-IN')}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/product/${l.product_id}`} className="text-navy-600 hover:text-navy-800 text-xs">
                        View
                      </Link>
                      <button onClick={() => handleDelete(l.id as string)} className="text-red-500 hover:text-red-700">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
