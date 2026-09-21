import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { SellerComparison } from '@/components/seller/SellerComparison';
import type { Product } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

interface PageProps { params: { id: string } }

async function getProduct(id: string) {
  try {
    const res = await fetch(`${API_URL}/api/v1/products/${id}`, { next: { revalidate: 120 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch { return null; }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getProduct(params.id);
  if (!data) return { title: 'Product Not Found' };
  const p: Product = data.product;
  return {
    title: `${p.name} — Compare Prices`,
    description: `Compare prices for ${p.name} from local sellers. Starting from ₹${p.min_price || 'N/A'}. ${p.seller_count} sellers available.`,
    openGraph: {
      title: `${p.name} | AtPrice`,
      description: p.description || `Compare ${p.name} prices from local hardware stores.`,
      images: data.images?.[0]?.image_url ? [data.images[0].image_url] : [],
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const data = await getProduct(params.id);
  if (!data) notFound();

  const product: Product = data.product;
  const images: Array<{ image_url: string; alt_text: string; is_primary: boolean }> = data.images || [];
  const primaryImage = images.find(i => i.is_primary) || images[0];

  function formatPrice(p: number | null | string) {
    if (p == null) return null;
    const n = typeof p === 'string' ? parseFloat(p) : p;
    return `₹${n.toLocaleString('en-IN')}`;
  }

  const specs = typeof product.specifications === 'object' ? product.specifications : {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6 flex items-center gap-2 flex-wrap">
        <Link href="/" className="hover:text-navy-800">Home</Link>
        <span>/</span>
        <Link href="/search" className="hover:text-navy-800">Products</Link>
        {product.category_slug && (
          <>
            <span>/</span>
            <Link href={`/categories/${product.category_slug}`} className="hover:text-navy-800">{product.category_name}</Link>
          </>
        )}
        <span>/</span>
        <span className="text-gray-900 font-medium truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Image */}
        <div className="aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden relative">
          {primaryImage ? (
            <Image
              src={primaryImage.image_url}
              alt={primaryImage.alt_text || product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-8xl text-gray-200">🔧</div>
          )}
          {product.is_demo_data && (
            <div className="absolute top-3 left-3"><span className="badge-demo">DEMO PRODUCT</span></div>
          )}
        </div>

        {/* Details */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-500">{product.category_name}</span>
            {product.subcategory_name && (
              <><span className="text-gray-300">/</span><span className="text-sm text-gray-500">{product.subcategory_name}</span></>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
          <div className="text-lg text-gray-500 font-medium mb-4">{product.brand}</div>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-4">
            {product.min_price ? (
              <>
                <div className="text-sm text-gray-500">Starting from</div>
                <div className="text-3xl font-bold text-navy-900">{formatPrice(product.min_price)}</div>
                {product.mrp && parseFloat(String(product.mrp)) > parseFloat(String(product.min_price)) && (
                  <div className="text-sm text-gray-400">MRP <span className="line-through">{formatPrice(product.mrp)}</span></div>
                )}
              </>
            ) : (
              <div className="text-gray-500 italic">No listings yet</div>
            )}
          </div>

          {/* Seller count */}
          <div className="flex items-center gap-2 mb-6">
            <span className={`text-sm font-medium ${Number(product.seller_count) > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
              {product.seller_count > 0 ? `${product.seller_count} local sellers available` : 'No sellers yet'}
            </span>
          </div>

          {/* Key info */}
          <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
            {product.unit && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-gray-500 text-xs mb-0.5">Unit</div>
                <div className="font-medium text-gray-800 capitalize">{product.unit}</div>
              </div>
            )}
            {product.pack_size && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-gray-500 text-xs mb-0.5">Pack Size</div>
                <div className="font-medium text-gray-800">{product.pack_size}</div>
              </div>
            )}
            {product.model && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-gray-500 text-xs mb-0.5">Model</div>
                <div className="font-medium text-gray-800">{product.model}</div>
              </div>
            )}
            {product.sku && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-gray-500 text-xs mb-0.5">SKU</div>
                <div className="font-medium text-gray-800">{product.sku}</div>
              </div>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Specifications */}
          {Object.keys(specs).length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Specifications</h3>
              <div className="border border-gray-100 rounded-lg overflow-hidden">
                {Object.entries(specs).map(([key, value], i) => (
                  <div key={key} className={`flex text-sm ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                    <div className="px-4 py-2.5 w-2/5 font-medium text-gray-600 border-r border-gray-100 capitalize">{key.replace(/_/g, ' ')}</div>
                    <div className="px-4 py-2.5 text-gray-900">{String(value)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Seller comparison section */}
      <div className="border-t border-gray-100 pt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          Compare Prices from Local Sellers
        </h2>
        <SellerComparison productId={product.id} productName={product.name} />
      </div>

      {/* Warranty / Manufacturer */}
      {(product.warranty || product.manufacturer) && (
        <div className="mt-8 border-t border-gray-100 pt-6 grid grid-cols-2 gap-4 text-sm">
          {product.manufacturer && (
            <div>
              <div className="text-gray-500 text-xs mb-1">Manufacturer</div>
              <div className="font-medium text-gray-800">{product.manufacturer}</div>
            </div>
          )}
          {product.warranty && (
            <div>
              <div className="text-gray-500 text-xs mb-1">Warranty</div>
              <div className="font-medium text-gray-800">{product.warranty}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
