import Link from 'next/link';
import { Search, MapPin, Phone, Star, Shield, TrendingUp } from 'lucide-react';
import { ProductCard } from '@/components/product/ProductCard';
import type { Product, Category } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

async function getPopularProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/products/popular`, { next: { revalidate: 300 } });
    const json = await res.json();
    return json.data?.products || [];
  } catch { return []; }
}

async function getCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/categories`, { next: { revalidate: 600 } });
    const json = await res.json();
    return json.data?.categories || [];
  } catch { return []; }
}

export default async function HomePage() {
  const [products, categories] = await Promise.all([getPopularProducts(), getCategories()]);

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="bg-navy-950 text-white py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-gold-500/20 border border-gold-400/30 text-gold-300 text-xs font-medium px-3 py-1 rounded-full mb-4">
            Karnataka's Local Hardware Marketplace
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
            Compare Local Hardware Prices
            <span className="text-gold-400 block">from Nearby Sellers</span>
          </h1>
          <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
            Find the best price on cement, pipes, tools, paint and more — from verified local hardware stores near you.
          </p>
          <Link href="/search" className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold px-8 py-3.5 rounded-xl text-lg transition-colors">
            <Search size={20} /> Search Products
          </Link>
          <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm text-gray-400">
            <span className="flex items-center gap-1"><Shield size={14} className="text-gold-400" /> Verified Sellers</span>
            <span className="flex items-center gap-1"><MapPin size={14} className="text-gold-400" /> Karnataka Coverage</span>
            <span className="flex items-center gap-1"><Phone size={14} className="text-gold-400" /> Direct Contact</span>
          </div>
        </div>
      </section>

      {/* ── Categories ──────────────────────────────────────────── */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Browse by Category</h2>
          <p className="text-gray-500 mb-6 text-sm">25+ product categories from hardware to tools to safety equipment</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {categories.slice(0, 12).map(cat => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="flex flex-col items-center p-4 rounded-xl border border-gray-100 hover:border-navy-200 hover:bg-navy-50 transition-all group text-center"
              >
                <span className="text-2xl mb-2">{cat.icon || '📦'}</span>
                <span className="text-xs font-medium text-gray-700 group-hover:text-navy-800 leading-tight">{cat.name}</span>
                {Number(cat.product_count) > 0 && (
                  <span className="text-[10px] text-gray-400 mt-1">{cat.product_count} products</span>
                )}
              </Link>
            ))}
            <Link
              href="/search"
              className="flex flex-col items-center p-4 rounded-xl border border-dashed border-gray-200 hover:border-gold-300 hover:bg-gold-50 transition-all group text-center"
            >
              <span className="text-2xl mb-2">🔍</span>
              <span className="text-xs font-medium text-gray-500 group-hover:text-gold-700">View All</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Popular Products ─────────────────────────────────────── */}
      {products.length > 0 && (
        <section className="py-12 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Popular Products</h2>
                <p className="text-gray-500 text-sm mt-1">Most-listed items from local sellers</p>
              </div>
              <Link href="/search" className="text-sm font-medium text-navy-800 hover:text-navy-600 transition-colors">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {products.slice(0, 12).map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── How it Works ─────────────────────────────────────────── */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">How AtPrice Works</h2>
          <p className="text-gray-500 text-center mb-10">The simplest way to find hardware at the best local price</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '1', icon: '🔍', title: 'Search Products', desc: 'Search from 250+ hardware products — cement, pipes, tools, paint and more.' },
              { step: '2', icon: '📊', title: 'Compare Prices', desc: 'See all local sellers with their prices, distance, stock status and ratings.' },
              { step: '3', icon: '📍', title: 'Find Nearest', desc: 'Sort by distance to find the closest seller. Set your location in seconds.' },
              { step: '4', icon: '📞', title: 'Contact Directly', desc: 'Call or WhatsApp the seller directly. No middleman, no online payment.' },
            ].map(item => (
              <div key={item.step} className="text-center">
                <div className="w-14 h-14 rounded-full bg-navy-50 flex items-center justify-center text-2xl mx-auto mb-3">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why AtPrice ──────────────────────────────────────────── */}
      <section className="py-12 px-4 bg-navy-950 text-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">Why Hardware Buyers Love AtPrice</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: <TrendingUp className="text-gold-400" />, title: 'Real Price Comparison', desc: 'Compare actual prices from multiple local sellers. Not just one store.' },
              { icon: <MapPin className="text-gold-400" />, title: 'Local First', desc: 'Every seller is local. Support Karnataka businesses. Buy from your city.' },
              { icon: <Star className="text-gold-400" />, title: 'Verified Sellers', desc: 'Sellers are verified before they appear on AtPrice. Shop with confidence.' },
            ].map(item => (
              <div key={item.title} className="flex gap-4 p-5 bg-navy-900 rounded-xl">
                <div className="flex-shrink-0 mt-0.5">{item.icon}</div>
                <div>
                  <h3 className="font-semibold mb-1.5">{item.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Seller CTA ───────────────────────────────────────────── */}
      <section className="py-12 px-4 bg-gold-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Own a Hardware Store?</h2>
          <p className="text-gray-600 mb-6">
            List your shop on AtPrice and reach customers actively searching for your products.
            Free to join. No commission on sales.
          </p>
          <Link href="/login" className="btn-secondary px-8 py-3 text-base">
            List Your Shop Free →
          </Link>
        </div>
      </section>
    </div>
  );
}
