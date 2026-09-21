const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
    ...options,
  });

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error?.message || `API error: ${res.status}`);
  }

  return json.data as T;
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface Product {
  id: string;
  name: string;
  brand: string;
  unit: string;
  mrp: number | null;
  is_demo_data: boolean;
  category_name: string;
  category_slug: string;
  subcategory_name: string | null;
  image_url: string | null;
  min_price: number | null;
  seller_count: number;
  description?: string;
  specifications?: Record<string, string>;
  slug?: string;
  model?: string;
  sku?: string;
  pack_size?: string;
  warranty?: string;
  manufacturer?: string;
}

export interface SellerListing {
  id: string;
  price: number;
  mrp: number | null;
  availability: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  stock_quantity: number;
  minimum_order_qty: number;
  pickup_available: boolean;
  delivery_available: boolean;
  updated_label: string;
  last_updated_at: string;
  distance_km: number | null;
  is_verified: boolean;
  seller_id: string;
  shop_name: string;
  seller_status: string;
  rating: number;
  rating_count: number;
  phone: string;
  whatsapp: string | null;
  city: string;
  address: string | null;
  notes?: string | null;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  icon: string | null;
  sort_order: number;
  product_count: number;
}

export interface Seller {
  id: string;
  shop_name: string;
  owner_name: string;
  phone: string;
  whatsapp: string | null;
  description: string | null;
  status: string;
  city: string;
  state: string;
  address: string | null;
  rating: number;
  rating_count: number;
  business_hours: string | null;
  pickup_available: boolean;
  delivery_available: boolean;
  is_demo_data: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: 'CUSTOMER' | 'SELLER' | 'ADMIN';
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// ── API calls ─────────────────────────────────────────────────────────────────
export const api = {
  // Auth
  getMe: () => apiFetch<User>('/api/v1/auth/me'),
  logout: () => apiFetch<void>('/api/v1/auth/logout', { method: 'POST' }),

  // Products
  getProducts: (params: Record<string, string | number>) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch<{ products: Product[]; pagination: PaginatedResponse<never>['pagination']; query: string | null }>(`/api/v1/products?${qs}`);
  },
  getProduct: (id: string) =>
    apiFetch<{ product: Product; images: Array<{ image_url: string; alt_text: string; is_primary: boolean }> }>(`/api/v1/products/${id}`),
  getPopularProducts: () =>
    apiFetch<{ products: Product[] }>('/api/v1/products/popular'),
  getSuggestions: (q: string) =>
    apiFetch<{ suggestions: Product[] }>(`/api/v1/products/suggest?q=${encodeURIComponent(q)}`),
  comparePrices: (id: string, params: { lat?: number; lng?: number; sort?: string }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
    ).toString();
    return apiFetch<{ listings: SellerListing[]; sort: string; user_location_set: boolean }>(`/api/v1/products/${id}/compare?${qs}`);
  },

  // Categories
  getCategories: () => apiFetch<{ categories: Category[] }>('/api/v1/categories'),
  getCategory: (slug: string) =>
    apiFetch<{ category: Category; subcategories: Array<{ id: number; name: string; slug: string }> }>(`/api/v1/categories/${slug}`),

  // Sellers
  getSeller: (id: string) => apiFetch<{ seller: Seller; listings: SellerListing[] }>(`/api/v1/sellers/${id}`),

  // Enquiries
  sendEnquiry: (data: { seller_id: string; product_id?: string; listing_id?: string; message: string; customer_name?: string; customer_phone?: string }) =>
    fetch(`${API_URL}/api/v1/enquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    }).then(r => r.json()),

  // Health
  health: () => apiFetch<{ status: string; environment: string; database: string }>('/api/v1/health'),

  // Seller dashboard
  sellerDashboard: () => apiFetch<Record<string, unknown>>('/api/v1/seller/dashboard'),
  sellerListings: () => apiFetch<{ listings: SellerListing[] }>('/api/v1/seller/listings'),
  createListing: (data: Record<string, unknown>) =>
    fetch(`${API_URL}/api/v1/seller/listings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify(data),
    }).then(r => r.json()),
  updateListing: (id: string, data: Record<string, unknown>) =>
    fetch(`${API_URL}/api/v1/seller/listings/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify(data),
    }).then(r => r.json()),
  deleteListing: (id: string) =>
    fetch(`${API_URL}/api/v1/seller/listings/${id}`, { method: 'DELETE', credentials: 'include' }).then(r => r.json()),
  sellerEnquiries: () => apiFetch<{ enquiries: Record<string, unknown>[] }>('/api/v1/seller/enquiries'),

  // Admin
  adminStats: () => apiFetch<Record<string, unknown>>('/api/v1/admin/stats'),
  adminSellers: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<{ sellers: Seller[] }>(`/api/v1/admin/sellers${qs}`);
  },
  adminUpdateSellerStatus: (id: string, status: string) =>
    fetch(`${API_URL}/api/v1/admin/sellers/${id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify({ status }),
    }).then(r => r.json()),
};

export const GOOGLE_LOGIN_URL = `${API_URL}/api/v1/auth/google`;
