'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Menu, X, ChevronDown, User, LogOut, LayoutDashboard, Shield } from 'lucide-react';
import { api, GOOGLE_LOGIN_URL, type User } from '@/lib/api';

const KARNATAKA_CITIES = [
  'Bengaluru', 'Mysuru', 'Mangaluru', 'Udupi', 'Manipal',
  'Hassan', 'Shivamogga', 'Chikkamagaluru', 'Kundapura', 'Madikeri',
];

export function Header() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; brand: string; category_name: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [location, setLocation] = useState('');
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const suggestTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const saved = localStorage.getItem('atprice_location');
    if (saved) setLocation(saved);
    api.getMe().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    clearTimeout(suggestTimer.current);
    if (value.length >= 2) {
      suggestTimer.current = setTimeout(async () => {
        try {
          const data = await api.getSuggestions(value);
          setSuggestions(data.suggestions.slice(0, 8));
          setShowSuggestions(true);
        } catch { setSuggestions([]); }
      }, 250);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setShowSuggestions(false);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const selectLocation = (city: string) => {
    setLocation(city);
    localStorage.setItem('atprice_location', city);
    setShowLocationMenu(false);
  };

  const handleLogout = async () => {
    try { await api.logout(); } catch {}
    setUser(null);
    setShowUserMenu(false);
    router.refresh();
  };

  return (
    <header className="bg-navy-950 text-white shadow-lg sticky top-0 z-50">
      {/* Demo banner */}
      <div className="bg-amber-500 text-amber-950 text-center text-xs py-1 font-medium">
        ⚠️ DEMO — Prices and seller information shown are sample data for demonstration purposes only.
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 h-16">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center gap-1.5">
            <span className="text-2xl font-bold text-gold-400">At</span>
            <span className="text-2xl font-bold text-white">Price</span>
          </Link>

          {/* Location (desktop) */}
          <div className="hidden md:block relative flex-shrink-0">
            <button
              onClick={() => setShowLocationMenu(!showLocationMenu)}
              className="flex items-center gap-1 text-sm text-gray-300 hover:text-white transition-colors px-2 py-1 rounded"
            >
              <MapPin size={14} className="text-gold-400" />
              <span className="max-w-[100px] truncate">{location || 'Select City'}</span>
              <ChevronDown size={12} />
            </button>
            {showLocationMenu && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-50 py-1 text-gray-800">
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase">Karnataka</div>
                {KARNATAKA_CITIES.map(city => (
                  <button
                    key={city}
                    onClick={() => selectLocation(city)}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-navy-50 transition-colors ${location === city ? 'text-gold-600 font-medium' : ''}`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search bar (desktop) */}
          <div ref={searchRef} className="flex-1 max-w-2xl hidden md:block relative">
            <form onSubmit={handleSearch} className="flex">
              <input
                type="text"
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Search cement, pipes, tools, paint..."
                className="w-full px-4 py-2 rounded-l-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                aria-label="Search products"
              />
              <button
                type="submit"
                className="bg-gold-500 hover:bg-gold-600 px-4 py-2 rounded-r-lg transition-colors flex items-center gap-2"
                aria-label="Search"
              >
                <Search size={18} className="text-navy-950" />
              </button>
            </form>
            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-100 z-50 max-h-80 overflow-y-auto">
                {suggestions.map(s => (
                  <Link
                    key={s.id}
                    href={`/product/${s.id}`}
                    onClick={() => setShowSuggestions(false)}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-gray-800 border-b border-gray-50 last:border-0"
                  >
                    <Search size={14} className="text-gray-400 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium">{s.name}</div>
                      <div className="text-xs text-gray-500">{s.brand} · {s.category_name}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Nav actions (desktop) */}
          <div className="hidden md:flex items-center gap-3 ml-2 flex-shrink-0">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 text-sm hover:text-gold-400 transition-colors"
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} className="w-7 h-7 rounded-full" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-navy-700 flex items-center justify-center">
                      <User size={14} />
                    </div>
                  )}
                  <span className="max-w-[80px] truncate">{user.name.split(' ')[0]}</span>
                  <ChevronDown size={12} />
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-50 py-1 text-gray-800">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500 capitalize">{user.role.toLowerCase()}</div>
                    </div>
                    <Link href="/account" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50">
                      <User size={14} /> My Account
                    </Link>
                    {(user.role === 'SELLER' || user.role === 'ADMIN') && (
                      <Link href="/seller/dashboard" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50">
                        <LayoutDashboard size={14} /> Seller Dashboard
                      </Link>
                    )}
                    {user.role === 'ADMIN' && (
                      <Link href="/admin/dashboard" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50">
                        <Shield size={14} /> Admin Panel
                      </Link>
                    )}
                    <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 w-full text-left text-red-600">
                      <LogOut size={14} /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <a href={GOOGLE_LOGIN_URL} className="text-sm font-medium hover:text-gold-400 transition-colors">
                Login
              </a>
            )}
            <Link href="/login" className="bg-gold-500 hover:bg-gold-600 text-navy-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
              List Your Shop
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden ml-auto"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            aria-label="Toggle menu"
          >
            {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile search */}
        <div className="pb-3 md:hidden" ref={searchRef}>
          <form onSubmit={handleSearch} className="flex">
            <input
              type="text"
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              placeholder="Search hardware, tools, materials..."
              className="flex-1 px-3 py-2 rounded-l-lg text-gray-900 text-sm focus:outline-none"
            />
            <button type="submit" className="bg-gold-500 hover:bg-gold-600 px-3 py-2 rounded-r-lg">
              <Search size={18} className="text-navy-950" />
            </button>
          </form>
        </div>
      </div>

      {/* Mobile menu */}
      {showMobileMenu && (
        <div className="md:hidden bg-navy-900 border-t border-navy-800 px-4 py-4 space-y-3">
          {/* Location */}
          <div>
            <div className="text-xs text-gray-400 mb-2">Your Location</div>
            <div className="grid grid-cols-3 gap-2">
              {KARNATAKA_CITIES.slice(0, 6).map(city => (
                <button
                  key={city}
                  onClick={() => { selectLocation(city); setShowMobileMenu(false); }}
                  className={`text-xs px-2 py-1.5 rounded ${location === city ? 'bg-gold-500 text-navy-950 font-semibold' : 'bg-navy-800 text-gray-300'}`}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-navy-800 pt-3 space-y-2">
            {user ? (
              <>
                <Link href="/account" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-2 py-2 text-sm">
                  <User size={16} /> {user.name}
                </Link>
                {user.role === 'SELLER' && (
                  <Link href="/seller/dashboard" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-2 py-2 text-sm">
                    <LayoutDashboard size={16} /> Seller Dashboard
                  </Link>
                )}
                <button onClick={handleLogout} className="flex items-center gap-2 py-2 text-sm text-red-400">
                  <LogOut size={16} /> Logout
                </button>
              </>
            ) : (
              <a href={GOOGLE_LOGIN_URL} className="block py-2 text-sm font-medium">Login with Google</a>
            )}
            <Link href="/login" onClick={() => setShowMobileMenu(false)} className="block w-full text-center bg-gold-500 text-navy-950 font-semibold py-2 rounded-lg text-sm">
              List Your Shop
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
