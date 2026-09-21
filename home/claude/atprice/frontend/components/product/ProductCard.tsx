import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/lib/api';

interface Props { product: Product; }

function formatPrice(p: number | null | string) {
  if (p == null) return null;
  const n = typeof p === 'string' ? parseFloat(p) : p;
  return `₹${n.toLocaleString('en-IN')}`;
}

export function ProductCard({ product }: Props) {
  return (
    <Link href={`/product/${product.id}`} className="card hover:shadow-md transition-shadow duration-200 flex flex-col group">
      {/* Image */}
      <div className="relative bg-gray-100 aspect-[4/3] overflow-hidden">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">🔧</div>
        )}
        {product.is_demo_data && (
          <div className="absolute top-2 left-2">
            <span className="badge-demo text-[10px]">DEMO</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1">
        <div className="text-xs text-gray-500 mb-1">{product.category_name}</div>
        <h3 className="text-sm font-medium text-gray-900 leading-snug mb-1 line-clamp-2 group-hover:text-navy-800">
          {product.name}
        </h3>
        {product.brand && (
          <div className="text-xs text-gray-500 mb-2">{product.brand}</div>
        )}
        <div className="mt-auto pt-2 border-t border-gray-50">
          <div className="flex items-end justify-between">
            <div>
              {product.min_price ? (
                <>
                  <div className="text-xs text-gray-400">Starting from</div>
                  <div className="text-base font-bold text-navy-900">{formatPrice(product.min_price)}</div>
                </>
              ) : (
                <div className="text-sm text-gray-400 italic">No listings yet</div>
              )}
            </div>
            <div className="text-right">
              {Number(product.seller_count) > 0 ? (
                <div className="text-xs text-emerald-600 font-medium">{product.seller_count} sellers</div>
              ) : (
                <div className="text-xs text-gray-400">0 sellers</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
