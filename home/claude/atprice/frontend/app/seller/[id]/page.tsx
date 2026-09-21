import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CheckCircle, Phone, MessageCircle, MapPin, Clock, Star, Package, Truck } from 'lucide-react';
import { ProductCard } from '@/components/product/ProductCard';
import type { Seller } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

interface PageProps { params: { id: string } }

async function getSeller(id: string) {
  try {
    const res = await fetch(`${API_URL}/api/v1/sellers/${id}`, { next: { revalidate: 120 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch { return null; }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getSeller(params.id);
  if (!data) return { title: 'Seller Not Found' };
  const s: Seller = data.seller;
  return {
    title: `${s.shop_name} — ${s.city} Hardware Store`,
    description: s.description || `${s.shop_name} is a verified hardware seller in ${s.city}, Karnataka.`,
  };
}

export default async function SellerPage({ params }: PageProps) {
  const data = await getSeller(params.id);
  if (!data) notFound();

  const seller: Seller = data.seller;
  const listings = data.listings || [];

  function buildWhatsApp(phone: string) {
    const p = phone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Hello, I found your shop ${seller.shop_name} on AtPrice. I would like to enquire about your products.`);
    return `https://wa.me/${p}?text=${msg}`;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-navy-800">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{seller.shop_name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Seller info card */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900 mb-1">{seller.shop_name}</h1>
                {seller.status === 'VERIFIED' && (
                  <span className="badge-verified"><CheckCircle size={11} /> Verified Seller</span>
                )}
              </div>
              {seller.is_demo_data && <span className="badge-demo">DEMO</span>}
            </div>

            <div className="flex items-center gap-2 mb-4">
              <Star size={16} className="text-gold-400 fill-gold-400" />
              <span className="font-semibold text-gray-900">{Number(seller.rating).toFixed(1)}</span>
              {seller.rating_count > 0 && <span className="text-sm text-gray-500">({seller.rating_count} reviews)</span>}
            </div>

            {seller.description && (
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">{seller.description}</p>
            )}

            <div className="space-y-2 text-sm text-gray-600 mb-6">
              {(seller.address || seller.city) && (
                <div className="flex items-start gap-2">
                  <MapPin size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <span>{[seller.address, seller.city, seller.state].filter(Boolean).join(', ')}</span>
                </div>
              )}
              {seller.business_hours && (
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-gray-400 flex-shrink-0" />
                  <span>{seller.business_hours}</span>
                </div>
              )}
              <div className="flex items-center gap-3 mt-2">
                {seller.pickup_available && (
                  <span className="flex items-center gap-1 text-xs text-gray-500"><Package size={12} /> Pickup</span>
                )}
                {seller.delivery_available && (
                  <span className="flex items-center gap-1 text-xs text-gray-500"><Truck size={12} /> Delivery</span>
                )}
              </div>
            </div>

            {/* CTA buttons — primary */}
            <div className="space-y-2">
              <a
                href={`tel:${seller.phone}`}
                className="flex items-center justify-center gap-2 w-full bg-navy-900 hover:bg-navy-800 text-white font-semibold py-2.5 rounded-lg transition-colors"
              >
                <Phone size={17} /> Call Seller
              </a>
              {seller.whatsapp && (
                <a
                  href={buildWhatsApp(seller.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
                >
                  <MessageCircle size={17} /> WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Listings */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Available Products <span className="text-sm font-normal text-gray-500">({listings.length})</span>
          </h2>
          {listings.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <div className="text-4xl mb-3">📦</div>
              <p className="text-gray-500">No active listings from this seller yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {listings.map((listing: Record<string, unknown>) => (
                <ProductCard
                  key={listing.product_id as string}
                  product={{
                    id: listing.product_id as string,
                    name: listing.product_name as string,
                    brand: listing.brand as string,
                    unit: listing.unit as string,
                    mrp: listing.mrp as number,
                    is_demo_data: false,
                    category_name: listing.category_name as string,
                    category_slug: listing.category_slug as string,
                    subcategory_name: null,
                    image_url: listing.image_url as string,
                    min_price: listing.price as number,
                    seller_count: 1,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
