'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LogOut, LayoutDashboard, Shield, User } from 'lucide-react';
import { api, GOOGLE_LOGIN_URL, type User as UserType } from '@/lib/api';

export default function AccountPage() {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    api.getMe().then(u => { setUser(u); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function handleLogout() {
    try { await api.logout(); } catch {}
    setUser(null);
    router.push('/');
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin w-8 h-8 border-4 border-navy-200 border-t-navy-900 rounded-full" />
    </div>
  );

  if (!user) return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <User size={48} className="text-gray-300 mx-auto mb-4" />
      <h1 className="text-xl font-bold text-gray-900 mb-2">Sign in to view your account</h1>
      <p className="text-gray-500 mb-6">Access your enquiries, listings, and more.</p>
      <a href={GOOGLE_LOGIN_URL} className="btn-primary inline-block">Sign in with Google</a>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">My Account</h1>
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          {user.avatar_url ? (
            <Image src={user.avatar_url} alt={user.name} width={64} height={64} className="rounded-full" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-navy-100 flex items-center justify-center">
              <User size={28} className="text-navy-600" />
            </div>
          )}
          <div>
            <div className="text-xl font-semibold text-gray-900">{user.name}</div>
            <div className="text-gray-500 text-sm">{user.email}</div>
            <div className="mt-1">
              <span className="inline-block text-xs font-medium bg-navy-100 text-navy-800 px-2 py-0.5 rounded-full capitalize">
                {user.role.toLowerCase()}
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(user.role === 'SELLER' || user.role === 'ADMIN') && (
            <Link href="/seller/dashboard" className="flex items-center gap-2 px-4 py-3 border border-navy-200 rounded-lg hover:bg-navy-50 text-navy-800 font-medium transition-colors">
              <LayoutDashboard size={18} /> Seller Dashboard
            </Link>
          )}
          {user.role === 'ADMIN' && (
            <Link href="/admin/dashboard" className="flex items-center gap-2 px-4 py-3 border border-purple-200 rounded-lg hover:bg-purple-50 text-purple-800 font-medium transition-colors">
              <Shield size={18} /> Admin Panel
            </Link>
          )}
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-3 border border-red-200 rounded-lg hover:bg-red-50 text-red-600 font-medium transition-colors">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </div>

      {user.role === 'CUSTOMER' && (
        <div className="card p-6 text-center">
          <h2 className="font-semibold text-gray-900 mb-2">Own a hardware shop?</h2>
          <p className="text-sm text-gray-500 mb-4">List your shop on AtPrice and reach local customers for free.</p>
          <Link href="/login" className="btn-primary">Apply to Become a Seller</Link>
        </div>
      )}
    </div>
  );
}
