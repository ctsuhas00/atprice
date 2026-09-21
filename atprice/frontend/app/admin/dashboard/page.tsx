'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { api, type User } from '@/lib/api';

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [pendingSellers, setPendingSellers] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    api.getMe()
      .then(u => {
        setUser(u);
        if (u.role !== 'ADMIN') { router.push('/account'); return; }
        return Promise.all([api.adminStats(), api.adminSellers({ status: 'PENDING' })]);
      })
      .then(results => {
        if (results) {
          setStats(results[0]);
          setPendingSellers((results[1] as { sellers: Record<string, unknown>[] }).sellers || []);
        }
      })
      .catch(() => router.push('/account'))
      .finally(() => setLoading(false));
  }, [router]);

  async function updateStatus(id: string, status: string) {
    const res = await api.adminUpdateSellerStatus(id, status);
    if (res.success) setPendingSellers(prev => prev.filter(s => s.id !== id));
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin w-8 h-8 border-4 border-navy-200 border-t-navy-900 rounded-full" />
    </div>
  );

  const s = stats as { sellers?: Record<string, string>; products?: Record<string, string>; users?: Record<string, string>; listings?: Record<string, string>; enquiries?: Record<string, string> } | null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

      {/* Stats overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        {[
          { label: 'Users', value: s?.users?.total || '0' },
          { label: 'Sellers', value: s?.sellers?.verified || '0', sub: `${s?.sellers?.pending || 0} pending` },
          { label: 'Products', value: s?.products?.total || '0' },
          { label: 'Listings', value: s?.listings?.total || '0' },
          { label: 'Enquiries', value: s?.enquiries?.total || '0', sub: `${s?.enquiries?.new_count || 0} new` },
        ].map(item => (
          <div key={item.label} className="card p-4">
            <div className="text-2xl font-bold text-gray-900">{item.value}</div>
            <div className="text-sm text-gray-500">{item.label}</div>
            {item.sub && <div className="text-xs text-amber-600 mt-0.5">{item.sub}</div>}
          </div>
        ))}
      </div>

      {/* Pending sellers */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Clock size={18} className="text-amber-500" />
          Pending Seller Applications ({pendingSellers.length})
        </h2>
        {pendingSellers.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-xl text-gray-500 text-sm">No pending applications</div>
        ) : (
          <div className="space-y-3">
            {pendingSellers.map(seller => (
              <div key={seller.id as string} className="card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{seller.shop_name as string}</div>
                  <div className="text-sm text-gray-500">{seller.owner_name as string} · {seller.city as string}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{seller.user_email as string}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(seller.id as string, 'VERIFIED')}
                    className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-3 py-1.5 rounded-lg"
                  >
                    <CheckCircle size={14} /> Verify
                  </button>
                  <button
                    onClick={() => updateStatus(seller.id as string, 'REJECTED')}
                    className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1.5 rounded-lg"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: '/admin/sellers', label: 'All Sellers', emoji: '🏪' },
          { href: '/admin/products', label: 'Products', emoji: '📦' },
          { href: '/search', label: 'Browse Site', emoji: '🔍' },
          { href: '/account', label: 'Account', emoji: '👤' },
        ].map(item => (
          <Link key={item.href} href={item.href} className="card p-4 hover:shadow-md transition-shadow text-center">
            <div className="text-2xl mb-1">{item.emoji}</div>
            <div className="font-medium text-gray-700 text-sm">{item.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
