# AtPrice — Compare Local Hardware Prices

> **Local hardware and construction-material price discovery platform for Karnataka, India.**

AtPrice helps customers compare prices from local hardware sellers, find the nearest store, and contact sellers directly. No online payment. The transaction happens directly between customer and seller.

---

## Features

### For Customers (no login required)
- Search 250+ products — cement, pipes, tools, paint, TMT bars, electrical items
- Full-text search with autocomplete
- Compare prices from multiple local sellers
- Sort by: Price ↑↓, Nearest, Best Rated, Recently Updated, **Best Value**
- Set your Karnataka city for distance-based sorting
- Call seller directly (`tel:` link)
- WhatsApp seller with pre-filled enquiry message
- Send an in-app enquiry

### For Sellers
- Google OAuth login
- Apply to list your shop
- Admin verification → VERIFIED seller badge
- Create and manage product listings (price, stock, availability)
- View customer enquiries
- Update shop profile

### For Admins
- Dashboard with live stats from database
- Verify / reject / suspend sellers
- View users, products, listings, enquiries

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| Backend | Node.js + Express.js + TypeScript |
| Database | PostgreSQL (Neon) |
| Auth | Google OAuth via Passport.js + express-session |
| Frontend hosting | Vercel |
| Backend hosting | Render |

---

## Architecture

```
Browser (Next.js on Vercel)
    ↓ HTTPS API calls (credentials: include)
Express REST API (on Render)
    ↓ SQL queries
Neon PostgreSQL

Authentication:
Google → Express OAuth callback → session cookie → Vercel frontend
```

---

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL database (Neon free tier works)
- Google OAuth credentials

### 1. Clone and set up

```bash
# Backend
cd backend
cp .env.example .env
# Fill in DATABASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SESSION_SECRET
npm install

# Frontend
cd ../frontend
cp .env.example .env.local
# Fill in NEXT_PUBLIC_API_URL=http://localhost:8787
npm install
```

### 2. Database setup

```bash
cd backend

# Run migrations
npm run db:migrate

# Seed demo data (~70 products, 20 sellers, 200+ listings)
npm run db:seed

# Reset (drops all tables — careful!)
# npm run db:reset
```

### 3. Start servers

```bash
# Terminal 1 — Backend
cd backend
npm run dev
# → http://localhost:8787

# Terminal 2 — Frontend
cd frontend
npm run dev
# → http://localhost:3000
```

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select existing
3. Enable **Google+ API** / **People API**
4. Go to **Credentials** → **Create OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add authorized redirect URIs:
   - `http://localhost:8787/api/v1/auth/google/callback` (development)
   - `https://YOUR-RENDER-URL.onrender.com/api/v1/auth/google/callback` (production)
7. Copy **Client ID** and **Client Secret** to `.env`

---

## Neon Database Setup

1. Create account at [neon.tech](https://neon.tech)
2. Create a new project → `atprice`
3. Copy the connection string
4. Add to `.env` as `DATABASE_URL=postgres://...`
5. Run migrations: `npm run db:migrate`
6. Run seed: `npm run db:seed`

---

## Render Deployment (Backend)

1. Connect GitHub repo to Render
2. Create **Web Service**
3. Root directory: `backend`
4. Build command: `npm install && npm run build`
5. Start command: `npm start`
6. Set environment variables:
   ```
   NODE_ENV=production
   DATABASE_URL=postgres://...neon.tech/...
   FRONTEND_URL=https://YOUR-VERCEL-URL.vercel.app
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_CALLBACK_URL=https://YOUR-RENDER-URL.onrender.com/api/v1/auth/google/callback
   SESSION_SECRET=long-random-secret
   PORT=10000
   ```
7. Run migrations after deploy: trigger `npm run db:migrate` in shell

---

## Vercel Deployment (Frontend)

1. Connect GitHub repo to Vercel
2. Root directory: `frontend`
3. Framework preset: **Next.js**
4. Set environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://YOUR-RENDER-URL.onrender.com
   ```
5. Deploy

---

## API Endpoints

```
GET  /api/v1/health                          — Health check
GET  /api/v1/auth/me                         — Current user (auth required)
GET  /api/v1/auth/google                     — Start Google OAuth
GET  /api/v1/auth/google/callback            — OAuth callback
POST /api/v1/auth/logout                     — Logout
POST /api/v1/auth/seller/onboard             — Apply as seller (auth required)

GET  /api/v1/products?q=&category=&page=     — Search/list products
GET  /api/v1/products/suggest?q=             — Autocomplete
GET  /api/v1/products/popular                — Popular products
GET  /api/v1/products/:id                    — Product details
GET  /api/v1/products/:id/compare?lat=&lng=&sort= — Seller comparison + sorting

GET  /api/v1/categories                      — All categories
GET  /api/v1/categories/:slug                — Category + subcategories

GET  /api/v1/sellers                         — List verified sellers
GET  /api/v1/sellers/:id                     — Seller profile + listings

POST /api/v1/enquiries                       — Send enquiry

GET  /api/v1/seller/dashboard                — (SELLER) Dashboard stats
GET  /api/v1/seller/listings                 — (SELLER) My listings
POST /api/v1/seller/listings                 — (SELLER) Create listing
PATCH /api/v1/seller/listings/:id            — (SELLER) Update listing
DELETE /api/v1/seller/listings/:id           — (SELLER) Deactivate listing
GET  /api/v1/seller/enquiries                — (SELLER) My enquiries
PATCH /api/v1/seller/profile                 — (SELLER) Update profile

GET  /api/v1/admin/stats                     — (ADMIN) Platform stats
GET  /api/v1/admin/users                     — (ADMIN) All users
GET  /api/v1/admin/sellers                   — (ADMIN) All sellers
PATCH /api/v1/admin/sellers/:id/status       — (ADMIN) Verify/reject seller
GET  /api/v1/admin/products                  — (ADMIN) All products
GET  /api/v1/admin/listings                  — (ADMIN) All listings
GET  /api/v1/admin/enquiries                 — (ADMIN) All enquiries
```

---

## Security

- HttpOnly, SameSite session cookies
- Server-side role checks on every protected route
- seller_id NEVER trusted from request body — derived from session
- CORS restricted to `FRONTEND_URL` env var
- Helmet security headers
- Rate limiting (500 req/15min global, 30 req/15min auth)
- Parameterized SQL (no SQL injection)
- No secrets in frontend bundle
- Admin role only assignable server-side

---

## Demo Data

The seed script creates:
- 25 categories with subcategories
- 70+ products across all categories (real Indian hardware brands)
- 20 demo sellers in Karnataka cities (all VERIFIED)
- 200+ seller listings with realistic prices

All demo data is marked with `is_demo_data = true` and displayed with a **DEMO** badge in the UI.

**Demo data is NOT live market data. Prices are fictional.**

---

## Scripts

### Backend
```bash
npm run dev          # Development server with hot reload
npm run build        # TypeScript compile
npm run start        # Production server
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed demo data
npm run db:reset     # Drop all tables (careful!)
npm run test         # Run tests
```

### Frontend
```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
```

---

## Folder Structure

```
atprice/
├── frontend/                 # Next.js 14 App Router
│   ├── app/
│   │   ├── page.tsx          # Homepage
│   │   ├── search/           # Search results
│   │   ├── product/[id]/     # Product details + seller comparison
│   │   ├── seller/[id]/      # Seller profile
│   │   ├── categories/[slug]/# Category browse
│   │   ├── login/            # Auth + seller onboarding
│   │   ├── account/          # Customer account
│   │   ├── seller/           # Seller dashboard, listings, enquiries
│   │   └── admin/            # Admin panel
│   ├── components/
│   │   ├── layout/           # Header, Footer
│   │   ├── product/          # ProductCard
│   │   └── seller/           # SellerComparison
│   ├── lib/api.ts            # All API calls + TypeScript types
│   └── styles/globals.css    # Tailwind + custom classes
│
├── backend/                  # Express.js + TypeScript
│   └── src/
│       ├── config/passport.ts # Google OAuth strategy
│       ├── middleware/auth.ts  # requireAuth, requireRole
│       ├── routes/            # All route handlers
│       └── db/               # Pool, migrate, seed, reset
│
└── database/
    └── migrations/001_initial_schema.sql
```
