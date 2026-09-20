# AtPrice — Project Status

> ⚠️ **DEMO DATA** — All prices, sellers and products are fictional sample data for demonstration purposes only. Not real market prices.

## ✅ Completed (Level-1 Marketplace)

### Backend
| File | Status | Notes |
|------|--------|-------|
| `database/db.js` | ✅ Complete | SQLite schema, seed data, FTS5 |
| `backend/server.js` | ✅ Complete | Express + helmet + CORS + rate limit |
| `backend/routes/products.js` | ✅ Complete | Search (FTS5), browse, compare (7 sorts) |
| `backend/routes/sellers.js` | ✅ Complete | CRUD, dashboard, listings |
| `backend/routes/auth.js` | ✅ Complete | Login, register, /me |
| `backend/routes/categories.js` | ✅ Complete | List with product counts |
| `backend/routes/enquiries.js` | ✅ Complete | Create/view enquiries |
| `backend/routes/admin.js` | ✅ Complete | Stats, seller management |
| `backend/routes/locations.js` | ✅ Complete | 18 Karnataka locations with coords |
| `backend/middleware/auth.js` | ✅ Complete | JWT middleware |
| `backend/utils/geo.js` | ✅ Complete | Haversine distance |
| `backend/utils/auth.js` | ✅ Complete | JWT sign/verify |

### Frontend
| File | Status | Notes |
|------|--------|-------|
| `frontend/css/style.css` | ✅ Complete | Navy+gold theme, full component library |
| `frontend/css/responsive.css` | ✅ Complete | Mobile-first, nav drawer |
| `frontend/js/app.js` | ✅ Complete | Shared helpers, auth, location, toasts |
| `frontend/js/api.js` | ✅ Complete | Thin fetch wrapper |
| `frontend/index.html` | ✅ Complete | Homepage: hero, categories, products, search |
| `frontend/product.html` | ✅ Complete | Product detail + price comparison table |

### Data
- **83 products** across 25 categories
- **45 sellers** (44 verified) across Karnataka
- **244 active listings** (3–5 per popular product)
- FTS5 full-text search on name, brand, model, keywords

## 🚀 To Start

```bash
# Node.js >= 22 required
cd atprice
npm install
node --experimental-sqlite backend/server.js
# → http://localhost:8787
```

## 🔑 Demo Credentials

| Role | Phone | Password |
|------|-------|----------|
| Verified Seller (Brahmavara) | 9900011101 | demo1234 |
| Tool Shop (Manipal) | 9900011106 | demo1234 |
| More sellers | 990001110X (X=2-9) | demo1234 |

## 🧪 Integration Tests: 18/18 Passed

```
✅ GET /api/health
✅ GET /api/admin/stats
✅ GET /api/categories
✅ GET /api/locations
✅ GET /api/products (browse)
✅ GET /api/products?q=cement (FTS)
✅ GET /api/products?q=bosch+grinder (FTS)
✅ GET /api/products/suggest?q=cpvc
✅ GET /api/products/:id
✅ GET /api/products/:id/compare?sort=price_asc
✅ GET /api/products/:id/compare?sort=rated
✅ GET /api/sellers
✅ POST /api/auth/login (seller)
✅ GET /api/auth/me
✅ GET /api/sellers/me/dashboard
✅ POST /api/enquiries
✅ POST /api/sellers/register
✅ GET /api/products?category=Electrical
```

## 🛒 Customer Flow

1. Land on homepage → see categories + product grid
2. Search (FTS5 autocomplete) or browse by category
3. Click product → product detail page
4. Compare prices across sellers in a table (desktop) or cards (mobile)
5. Sort by: Lowest Price / Nearest / Highest Rated / Best Value / Updated / Highest Price
6. Set location → sellers sorted by distance
7. **Call** or **WhatsApp** the seller directly (no payment, no checkout)
8. Or send an in-app enquiry form

## 🏪 Seller Flow

1. Register shop → pending verification
2. Log in → dashboard with profile, listings, enquiries
3. Listings managed via API (add/update/remove)

## ❌ Explicitly Out of Scope (Level-1)

- Payment / checkout
- Order management
- SMS OTP verification
- Image upload (uses Pexels URLs)
- Push notifications
- Review system

## 🔮 Level-2 Roadmap

- [ ] OTP verification (Twilio/MSG91)
- [ ] Image upload (Cloudinary/S3)
- [ ] Review & rating system
- [ ] Price alerts (email/WhatsApp)
- [ ] Seller analytics dashboard
- [ ] Admin panel UI
- [ ] CSV bulk product import for sellers
