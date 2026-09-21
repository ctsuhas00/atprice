'use client';

import { useState, useEffect } from 'react';
import { MapPin, Phone, MessageCircle, Star, CheckCircle, Package, Truck, Clock, ChevronDown } from 'lucide-react';
import type { SellerListing } from '@/lib/api';
import { api } from '@/lib/api';

interface Props { productId: string; productName: string; }

const SORT_OPTIONS = [
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'nearest', label: 'Nearest First' },
  { value: 'farthest', label: 'Farthest First' },
  { value: 'rated', label: 'Best Rated' },
  { value: 'updated', label: 'Recently Updated' },
  { value: 'best_value', label: '⭐ Best Value' },
];

function formatPrice(p: number | string) {
  const n = typeof p === 'string' ? parseFloat(p) : p;
  return `₹${n.toLocaleString('en-IN')}`;
}

function AvailabilityBadge({ status }: { status: string }) {
  if (status === 'IN_STOCK') return <span className="in-stock flex items-center gap-1 text-xs"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />In Stock</span>;
  if (status === 'LOW_STOCK') return <span className="low-stock flex items-center gap-1 text-xs"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />Low Stock</span>;
  return <span className="out-of-stock flex items-center gap-1 text-xs"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />Out of Stock</span>;
}

export function SellerComparison({ productId, productName }: Props) {
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [sort, setSort] = useState('price_asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [enquiryId, setEnquiryId] = useState<string | null>(null);
  const [enquiryListing, setEnquiryListing] = useState<SellerListing | null>(null);
  const [enquiryMsg, setEnquiryMsg] = useState('');
  const [enquirySending, setEnquirySending] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  useEffect(() => {
    const loc = localStorage.getItem('atprice_location');
    if (loc) {
      // Fallback city coordinates
      const CITY_COORDS: Record<string, [number, number]> = {
        'Bengaluru': [12.9716, 77.5946], 'Mysuru': [12.2958, 76.6394],
        'Mangaluru': [12.9141, 74.8560], 'Udupi': [13.3409, 74.7421],
        'Manipal': [13.3525, 74.7848], 'Hassan': [13.0035, 76.0998],
        'Shivamogga': [13.9299, 75.5681], 'Chikkamagaluru': [13.3153, 75.7754],
        'Kundapura': [13.2124, 74.6914], 'Madikeri': [12.4244, 75.7382],
      };
      if (CITY_COORDS[loc]) {
        setUserLat(CITY_COORDS[loc][0]);
        setUserLng(CITY_COORDS[loc][1]);
      }
    }
  }, []);

  useEffect(() => {
    loadListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, sort, userLat, userLng]);

  async function loadListings() {
    setLoading(true); setError('');
    try {
      const params: Record<string, string | number> = { sort };
      if (userLat && userLng) { params.lat = userLat; params.lng = userLng; }
      const data = await api.comparePrices(productId, params);
      setListings(data.listings);
    } catch {
      setError('Unable to load seller listings. Please try again.');
    } finally { setLoading(false); }
  }

  function buildWhatsApp(listing: SellerListing) {
    const phone = (listing.whatsapp || listing.phone).replace(/\D/g, '');
    const msg = encodeURIComponent(
      `Hello, I found *${productName}* on AtPrice.\n\n` +
      `I am interested in purchasing this product.\n` +
      `Could you please share the latest price and availability?\n\n` +
      `Thank you!`
    );
    return `https://wa.me/${phone}?text=${msg}`;
  }

  async function sendEnquiry() {
    if (!enquiryListing || !enquiryMsg.trim()) return;
    setEnquirySending(true);
    try {
      const res = await api.sendEnquiry({
        seller_id: enquiryListing.seller_id,
        product_id: productId,
        listing_id: enquiryListing.id,
        message: enquiryMsg,
      });
      if (res.success) { setEnquiryId(res.data?.enquiry_id); setEnquiryMsg(''); setEnquiryListing(null); }
    } finally { setEnquirySending(false); }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-3">{error}</p>
        <button onClick={loadListings} className="btn-secondary text-sm px-4 py-2">Try Again</button>
      </div>
    );
  }

  return (
    <div>
      {/* Sort control */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600 font-medium">
          {listings.length} {listings.length === 1 ? 'seller' : 'sellers'} found
        </div>
        <div className="relative">
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white hover:bg-gray-50 transition-colors"
          >
            <span>Sort: {SORT_OPTIONS.find(o => o.value === sort)?.label}</span>
            <ChevronDown size={14} />
          </button>
          {showSortDropdown && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-xl border border-gray-100 z-20 py-1">
              {SORT_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => { setSort(option.value); setShowSortDropdown(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${sort === option.value ? 'text-navy-900 font-semibold bg-navy-50' : 'text-gray-700'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
          <div className="text-4xl mb-3">🏪</div>
          <h3 className="text-gray-700 font-medium mb-1">No sellers listed yet</h3>
          <p className="text-sm text-gray-500">Be the first seller to list this product.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((listing, idx) => (
            <div key={listing.id} className={`card p-4 border ${idx === 0 && sort === 'best_value' ? 'border-gold-300 ring-1 ring-gold-200' : 'border-gray-100'}`}>
              {idx === 0 && sort === 'best_value' && (
                <div className="text-xs text-gold-700 font-semibold mb-2 flex items-center gap-1">
                  ⭐ Best Value Pick
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <h3 className="font-semibold text-gray-900">{listing.shop_name}</h3>
                    {listing.is_verified && (
                      <span className="badge-verified"><CheckCircle size={11} /> Verified</span>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-navy-900 mb-2">{formatPrice(listing.price)}</div>
                  {listing.mrp && parseFloat(String(listing.mrp)) > parseFloat(String(listing.price)) && (
                    <div className="text-xs text-gray-500 mb-2">
                      MRP <span className="line-through">{formatPrice(listing.mrp)}</span>
                      <span className="text-emerald-600 font-medium ml-1">
                        {Math.round((1 - parseFloat(String(listing.price)) / parseFloat(String(listing.mrp))) * 100)}% off
                      </span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    <AvailabilityBadge status={listing.availability} />
                    {listing.distance_km !== null && (
                      <span className="flex items-center gap-1">
                        <MapPin size={11} /> {Number(listing.distance_km).toFixed(1)} km · {listing.city}
                      </span>
                    )}
                    {listing.distance_km === null && listing.city && (
                      <span className="flex items-center gap-1"><MapPin size={11} /> {listing.city}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Star size={11} className="text-gold-400" />
                      {Number(listing.rating).toFixed(1)}
                      {listing.rating_count > 0 && ` (${listing.rating_count})`}
                    </span>
                    <span className="flex items-center gap-1"><Clock size={11} /> {listing.updated_label}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    {listing.pickup_available && <span className="flex items-center gap-1"><Package size={11} /> Pickup</span>}
                    {listing.delivery_available && <span className="flex items-center gap-1"><Truck size={11} /> Delivery</span>}
                    {listing.minimum_order_qty > 1 && <span>Min. qty: {listing.minimum_order_qty}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0 min-w-[140px]">
                  <a
                    href={`tel:${listing.phone}`}
                    className="flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    <Phone size={15} /> Call Seller
                  </a>
                  <a
                    href={buildWhatsApp(listing)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    <MessageCircle size={15} /> WhatsApp
                  </a>
                  <button
                    onClick={() => { setEnquiryListing(listing); setEnquiryMsg(`Hello, I am interested in ${productName}. Please share the latest price and availability.`); }}
                    className="flex items-center justify-center gap-2 border border-gray-300 hover:border-navy-400 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    Send Enquiry
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enquiry modal */}
      {enquiryListing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 mb-1">Send Enquiry</h3>
            <p className="text-sm text-gray-500 mb-4">To: {enquiryListing.shop_name}</p>
            <textarea
              value={enquiryMsg}
              onChange={e => setEnquiryMsg(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-28 resize-none focus:outline-none focus:ring-2 focus:ring-navy-400 mb-4"
              placeholder="Your message..."
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setEnquiryListing(null); setEnquiryMsg(''); }}
                className="flex-1 border border-gray-300 rounded-lg py-2 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={sendEnquiry}
                disabled={enquirySending || !enquiryMsg.trim()}
                className="flex-1 bg-navy-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-navy-800 disabled:opacity-50"
              >
                {enquirySending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {enquiryId && (
        <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <CheckCircle size={16} /> Enquiry sent!
          <button onClick={() => setEnquiryId(null)} className="ml-2 text-emerald-200 hover:text-white">×</button>
        </div>
      )}
    </div>
  );
}
