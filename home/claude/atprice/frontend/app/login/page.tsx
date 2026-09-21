'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Shield, MapPin, Phone } from 'lucide-react';
import { api, GOOGLE_LOGIN_URL, type User } from '@/lib/api';

export default function LoginPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);
  const [form, setForm] = useState({ shop_name: '', owner_name: '', phone: '', city: 'Bengaluru', address: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = searchParams.get('error');

  useEffect(() => {
    api.getMe().then(u => { setUser(u); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function submitOnboarding(e: React.FormEvent) {
    e.preventDefault();
    if (!form.shop_name || !form.owner_name || !form.phone) {
      setError('Please fill in all required fields.');
      return;
    }
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/api/v1/auth/seller/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) { setSubmitted(true); }
      else { setError(json.error?.message || 'Submission failed.'); }
    } catch { setError('Network error. Please try again.'); }
    finally { setSubmitting(false); }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin w-8 h-8 border-4 border-navy-200 border-t-navy-900 rounded-full" />
    </div>
  );

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">List Your Hardware Shop</h1>
        <p className="text-gray-500">Reach customers actively searching for your products</p>
      </div>

      {/* Benefits */}
      <div className="bg-navy-50 rounded-xl p-5 mb-8">
        <h2 className="font-semibold text-navy-900 mb-3">Why join AtPrice?</h2>
        <div className="space-y-2.5 text-sm">
          {[
            { icon: <CheckCircle size={15} className="text-emerald-600" />, text: 'Free to list — no upfront cost' },
            { icon: <Shield size={15} className="text-navy-600" />, text: 'Verified seller badge builds trust' },
            { icon: <MapPin size={15} className="text-gold-600" />, text: 'Reach buyers searching near you' },
            { icon: <Phone size={15} className="text-navy-600" />, text: 'Customers contact you directly' },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-2 text-gray-700">
              {item.icon} {item.text}
            </div>
          ))}
        </div>
      </div>

      {authError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
          Login failed. Please try again.
        </div>
      )}

      {!user ? (
        /* Step 1: Login */
        <div className="card p-6 text-center">
          <h2 className="font-semibold text-gray-900 mb-2">Step 1: Sign in with Google</h2>
          <p className="text-sm text-gray-500 mb-6">We use Google Sign-In for secure, easy authentication.</p>
          <a
            href={GOOGLE_LOGIN_URL}
            className="flex items-center justify-center gap-3 w-full border-2 border-gray-200 hover:border-gray-300 bg-white text-gray-700 font-medium py-3 rounded-xl transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </a>
        </div>
      ) : user.role !== 'CUSTOMER' ? (
        /* Already a seller/admin */
        <div className="card p-6 text-center">
          <CheckCircle size={40} className="text-emerald-500 mx-auto mb-3" />
          <h2 className="font-semibold text-gray-900 mb-2">You&apos;re already set up!</h2>
          <p className="text-gray-500 text-sm mb-4">Your account role: <strong className="capitalize">{user.role.toLowerCase()}</strong></p>
          <button onClick={() => router.push('/seller/dashboard')} className="btn-primary">Go to Dashboard →</button>
        </div>
      ) : submitted ? (
        /* Application submitted */
        <div className="card p-6 text-center">
          <CheckCircle size={40} className="text-emerald-500 mx-auto mb-3" />
          <h2 className="font-semibold text-gray-900 mb-2">Application Submitted!</h2>
          <p className="text-gray-500 text-sm mb-4">
            Your seller application is under review. Our team will verify your shop within 1-2 business days.
          </p>
          <button onClick={() => router.push('/account')} className="btn-secondary">View Account</button>
        </div>
      ) : !onboarding ? (
        /* Step 2 prompt */
        <div className="card p-6 text-center">
          <CheckCircle size={32} className="text-emerald-500 mx-auto mb-3" />
          <h2 className="font-semibold text-gray-900 mb-1">Signed in as {user.name}</h2>
          <p className="text-gray-500 text-sm mb-5">{user.email}</p>
          <button onClick={() => setOnboarding(true)} className="btn-primary w-full">
            Apply to List My Shop →
          </button>
        </div>
      ) : (
        /* Onboarding form */
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-5">Step 2: Tell us about your shop</h2>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>}
          <form onSubmit={submitOnboarding} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.shop_name} onChange={e => setForm({ ...form, shop_name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400"
                placeholder="Sri Krishna Hardware & Electricals" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.owner_name} onChange={e => setForm({ ...form, owner_name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400"
                placeholder="Your full name" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
              <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400"
                placeholder="+91 98765 43210" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City <span className="text-red-500">*</span></label>
              <select value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400">
                {['Bengaluru','Mysuru','Mangaluru','Udupi','Manipal','Hassan','Shivamogga','Chikkamagaluru','Kundapura','Madikeri'].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400"
                placeholder="Shop address" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">About Your Shop</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-navy-400"
                placeholder="Tell customers what you sell..." />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full py-3 disabled:opacity-50">
              {submitting ? 'Submitting...' : 'Submit Application →'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
