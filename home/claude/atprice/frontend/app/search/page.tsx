import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ProductCard } from '@/components/product/ProductCard';
import type { Product } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

interface PageProps { searchParams: { q?: string; category?: string; brand?: string; page?: string } }

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const q = searchParams.q || '';
  return { title: q ? `"${q}" — Search Results` : 'Browse Products' };
}

async function SearchResults({ searchParams }: PageProps) {
  const q = searchParams.q || '';
  const category = searchParams.category || '';
  const brand = searchParams.brand || '';
  const page = parseInt(searchParams.page || '1');

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (category) params.set('category', category);
  if (brand) params.set('brand', brand);
  params.set('page', String(page));
  params.set('limit', '24');

  let products: Product[] = [];
  let total = 0;
  let totalPages = 1;
  let error = '';

  try {
    const res = await fetch(`${API_URL}/api/v1/products?${params}`, { next: { revalidate: 60 } });
    const json = await res.json();
    if (json.success) {
      products = json.data.products;
      total = json.data.pagination.total;
      totalPages = json.data.pagination.totalPages;
    }
  } catch { error = 'Unable to load products. Please try again.'; }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        {q ? (
          <h1 className="text-xl font-bold text-gray-900">
            Results for <span className="text-navy-800">&quot;{q}&quot;</span>
            {total > 0 && <span className="text-sm font-normal text-gray-500 ml-2">— {total} products</span>}
          </h1>
        ) : (
          <h1 className="text-xl font-bold text-gray-900">
            All Products
            {total > 0 && <span className="text-sm font-normal text-gray-500 ml-2">— {total} products</span>}
          </h1>
        )}
      </div>

      {error ? (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">{error}</p>
          <a href={`/search?q=${encodeURIComponent(q)}`} className="btn-secondary text-sm px-4 py-2">Try Again</a>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            {q ? `No results for "${q}"` : 'No products found'}
          </h2>
          <p className="text-gray-500 mb-6">Try a different search term or browse by category.</p>
          <div className="flex flex-wrap justify-center gap-2 text-sm">
            {['cement', 'pipe', 'grinder', 'paint', 'tmt bar', 'switch', 'safety helmet'].map(term => (
              <a key={term} href={`/search?q=${term}`} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors">
                {term}
              </a>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-8">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              {page > 1 && (
                <a
                  href={`/search?${new URLSearchParams({ ...Object.fromEntries(params), page: String(page - 1) })}`}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  ← Previous
                </a>
              )}
              <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
              {page < totalPages && (
                <a
                  href={`/search?${new URLSearchParams({ ...Object.fromEntries(params), page: String(page + 1) })}`}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  Next →
                </a>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function SearchPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-xl aspect-[3/4]" />
          ))}
        </div>
      </div>
    }>
      <SearchResults searchParams={searchParams} />
    </Suspense>
  );
}
