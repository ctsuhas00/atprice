'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, MessageCircle, TrendingUp, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { api, type User } from '@/lib/api';

export default function SellerDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    api.getMe()
      .then(u => {
        setUser(u);
        if (u.role !== 'SELLER' && u.role !== 'ADMIN') { router.push('/login'); return; }
        return api.sellerDashboard();
      })
      .then(d => { if (d) setData(d as Record<string, unknown>); })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin w-8 h-8 border-4 border-navy-200 border-t-navy-900 rounded-full" />
    </div>
  );

  if (!user || (user.role !== 'SELLER' && user.role !== 'ADMIN')) return null;

  const seller = data?.seller as Record<string, unknown> | undefined;
  const listing_stats = data?.listing_stats as Record<string, string> | undefined;
  const enquiry_stats = data?.enquiry_stats as Record<string, string> | undefined;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seller Dashboard</h1>
          {seller && <p className="text-gray-500 text-sm mt-1">{seller.shop_name as string} · {seller.city as string}</p>}
        </div>
        <div className="flex gap-2">
          {seller?.status === 'VERIFIED' && (
            <span className="badge-verified text-sm"><CheckCircle size={13} /> Verified</span>
          )}
          {seller?.status === 'PENDING' && (
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-sm px-2 py-1 rounded-full border border-amber-200">
              <AlertTriangle size={13} /> Pending Verification
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Listings', value: listing_stats?.total_listings || '0', icon: <Package className="text-navy-600" />, color: 'bg-navy-50' },
          { label: 'In Stock', value: listing_stats?.in_stock || '0', icon: <TrendingUp className="text-emerald-600" />, color: 'bg-emerald-50' },
          { label: 'Enquiries', value: enquiry_stats?.total || '0', icon: <MessageCircle className="text-blue-600" />, color: 'bg-blue-50' },
          { label: 'New Enquiries', value: enquiry_stats?.unread || '0', icon: <Clock className="text-amber-600" />, color: 'bg-amber-50' },
        ].map(stat => (
          <div key={stat.label} className={`card p-4 ${stat.color}`}>
            <div className="flex items-center justify-between mb-2">
              {stat.icon}
              <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
            </div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { href: '/seller/listings', label: 'My Listings', desc: 'Manage your product listings', icon: '📋' },
          { href: '/seller/listings/new', label: 'Add Listing', desc: 'List a new product', icon: '➕' },
          { href: '/seller/enquiries', label: 'Enquiries', desc: 'View customer enquiries', icon: '💬' },
          { href: '/seller/profile', label: 'Shop Profile', desc: 'Update your shop details', icon: '🏪' },
          { href: '/account', label: 'Account', desc: 'Manage your account', icon: '👤' },
        ].map(item => (
          <Link key={item.href} href={item.href} className="card p-5 hover:shadow-md transition-shadow">
            <div className="text-2xl mb-2">{item.icon}</div>
            <div className="font-semibold text-gray-900 mb-1">{item.label}</div>
            <div className="text-sm text-gray-500">{item.desc}</div>
          </Link>
        ))}
      </div>

      {seller?.status === 'PENDING' && (
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>Your shop is pending verification.</strong> Our team will review and verify your application within 1-2 business days.
          Once verified, you can create product listings.
        </div>
      )}
    </div>
  );
}
