import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ProductCard } from '@/components/product/ProductCard';
import type { Product } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

interface PageProps { params: { slug: string }; searchParams: { page?: string } }

async function getCategoryData(slug: string) {
  try {
    const res = await fetch(`${API_URL}/api/v1/categories/${slug}`, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch { return null; }
}

async function getCategoryProducts(slug: string, page = 1) {
  try {
    const res = await fetch(`${API_URL}/api/v1/products?category=${slug}&page=${page}&limit=24`, { next: { revalidate: 60 } });
    const json = await res.json();
    return json.data;
  } catch { return null; }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getCategoryData(params.slug);
  if (!data) return { title: 'Category Not Found' };
  return {
    title: `${data.category.name} — Compare Prices`,
    description: `Compare prices for ${data.category.name} from local hardware sellers in Karnataka.`,
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const page = parseInt(searchParams.page || '1');
  const [catData, productData] = await Promise.all([
    getCategoryData(params.slug),
    getCategoryProducts(params.slug, page),
  ]);

  if (!catData) notFound();

  const { category, subcategories } = catData;
  const products: Product[] = productData?.products || [];
  const pagination = productData?.pagination;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-navy-800">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{category.name}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
          <span>{category.icon}</span> {category.name}
        </h1>
        <p className="text-gray-500 text-sm">
          {pagination?.total || 0} products available from local sellers
        </p>
      </div>

      {/* Subcategories */}
      {subcategories?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {subcategories.map((sub: { id: number; name: string; slug: string }) => (
            <Link
              key={sub.id}
              href={`/search?q=${encodeURIComponent(sub.name)}`}
              className="text-sm px-3 py-1.5 rounded-full border border-gray-200 hover:border-navy-300 hover:bg-navy-50 text-gray-600 hover:text-navy-800 transition-colors"
            >
              {sub.name}
            </Link>
          ))}
        </div>
      )}

      {/* Products */}
      {products.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📦</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No products in this category yet</h2>
          <Link href="/search" className="btn-secondary mt-4 inline-block text-sm px-4 py-2">Browse All Products</Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-8">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              {page > 1 && <Link href={`?page=${page - 1}`} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">← Prev</Link>}
              <span className="px-4 py-2 text-sm text-gray-600">Page {page} / {pagination.totalPages}</span>
              {page < pagination.totalPages && <Link href={`?page=${page + 1}`} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Next →</Link>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
