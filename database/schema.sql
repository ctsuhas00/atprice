-- ============================================================================
-- AtPrice — PostgreSQL schema (production)
--
-- The local dev server (backend/server.js) runs on SQLite via better-sqlite3
-- for zero-setup local development — see database/init-sqlite.js for the
-- equivalent SQLite DDL. This file is the authoritative schema for a real
-- deployment. Run it against a PostgreSQL 14+ / Supabase database:
--
--   psql "$DATABASE_URL" -f database/schema.sql
--   psql "$DATABASE_URL" -f database/seed.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- fuzzy / fast ILIKE search

-- ---------------------------------------------------------------- users ----
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role            TEXT NOT NULL CHECK (role IN ('CUSTOMER','SELLER','ADMIN')) DEFAULT 'CUSTOMER',
  name            TEXT NOT NULL,
  email           TEXT UNIQUE,
  phone           TEXT UNIQUE,
  password_hash   TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------- sellers ----
CREATE TABLE sellers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_code       TEXT UNIQUE NOT NULL,                 -- e.g. ATPS-AB12CD
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  owner_name        TEXT NOT NULL,
  mobile            TEXT NOT NULL,
  email             TEXT,
  shop_name         TEXT NOT NULL,
  trade_name        TEXT,
  gstin             TEXT,
  pan               TEXT,
  seller_type       TEXT,                                 -- retailer / wholesaler / distributor
  years_in_business INTEGER,
  phone             TEXT,
  website           TEXT,
  description       TEXT,
  bank_name         TEXT,
  bank_account_last4 TEXT,                                 -- never store full account numbers unmasked
  ifsc              TEXT,
  upi_id            TEXT,
  pickup_available   BOOLEAN DEFAULT false,
  delivery_available BOOLEAN DEFAULT false,
  delivery_radius_km NUMERIC,
  return_policy     TEXT,
  status            TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION'
                      CHECK (status IN ('PENDING_VERIFICATION','VERIFIED','REJECTED','SUSPENDED')),
  verification_notes TEXT,
  rating            NUMERIC DEFAULT 0,
  rating_count      INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE seller_documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  doc_type    TEXT NOT NULL,   -- PAN, GST, ADDRESS_PROOF, UDYAM, SHOP_PHOTO
  file_path   TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE seller_locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  address1    TEXT NOT NULL,
  landmark    TEXT,
  locality    TEXT,
  city        TEXT NOT NULL,
  district    TEXT NOT NULL,
  state       TEXT NOT NULL,
  pincode     TEXT NOT NULL,
  latitude    DOUBLE PRECISION,
  longitude   DOUBLE PRECISION,
  is_primary  BOOLEAN DEFAULT true
);
CREATE INDEX idx_seller_locations_geo ON seller_locations (latitude, longitude);

-- ----------------------------------------------------------- categories ----
CREATE TABLE categories (
  id     SERIAL PRIMARY KEY,
  name   TEXT UNIQUE NOT NULL,
  image_url TEXT
);

CREATE TABLE subcategories (
  id          SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  UNIQUE (category_id, name)
);

-- ------------------------------------------------------------- products ----
-- PRODUCT MASTER — canonical product info, independent of any seller.
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  brand           TEXT,
  model           TEXT,
  sku             TEXT,
  category_id     INTEGER REFERENCES categories(id),
  subcategory_id  INTEGER REFERENCES subcategories(id),
  description     TEXT,
  specifications  JSONB DEFAULT '{}'::jsonb,
  unit            TEXT DEFAULT 'piece',
  pack_size       TEXT,
  mrp             NUMERIC,
  manufacturer    TEXT,
  warranty        TEXT,
  is_demo_data    BOOLEAN DEFAULT false,
  search_vector   tsvector,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_search ON products USING GIN (search_vector);
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
CREATE INDEX idx_products_category ON products (category_id, subcategory_id);
CREATE INDEX idx_products_brand ON products (brand);
CREATE INDEX idx_products_sku ON products (sku);

CREATE OR REPLACE FUNCTION products_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.brand,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.model,'') || ' ' || coalesce(NEW.sku,'')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.description,'')), 'D');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_products_search_vector
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION products_search_vector_update();

CREATE TABLE product_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  is_primary  BOOLEAN DEFAULT false,
  sort_order  INTEGER DEFAULT 0
);

-- ----------------------------------------------------- seller_listings ----
-- SELLER LISTINGS — one row per (seller, product) offer. This is where
-- price/stock/availability live; NEVER trust equivalent fields from the client.
CREATE TABLE seller_listings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id           UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price               NUMERIC NOT NULL CHECK (price >= 0),
  mrp                 NUMERIC,
  stock_quantity      INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  minimum_order_qty   INTEGER NOT NULL DEFAULT 1,
  unit                TEXT DEFAULT 'piece',
  availability        TEXT NOT NULL DEFAULT 'IN_STOCK'
                        CHECK (availability IN ('IN_STOCK','LOW_STOCK','OUT_OF_STOCK')),
  delivery_available  BOOLEAN DEFAULT false,
  pickup_available    BOOLEAN DEFAULT true,
  status              TEXT NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE','PAUSED','NEEDS_SELLER_CONFIRMATION','DISABLED')),
  source              TEXT DEFAULT 'MANUAL',   -- MANUAL, WEBSITE_IMPORT, MERCHANT_FEED, POS_FEED
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (seller_id, product_id)
);
CREATE INDEX idx_listings_product ON seller_listings (product_id);
CREATE INDEX idx_listings_seller ON seller_listings (seller_id);
CREATE INDEX idx_listings_price ON seller_listings (price);
CREATE INDEX idx_listings_stock ON seller_listings (availability);

-- ------------------------------------------------------------ addresses ----
CREATE TABLE addresses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label       TEXT,
  name        TEXT,
  phone       TEXT,
  address1    TEXT NOT NULL,
  locality    TEXT,
  city        TEXT NOT NULL,
  district    TEXT NOT NULL,
  state       TEXT NOT NULL,
  pincode     TEXT NOT NULL,
  latitude    DOUBLE PRECISION,
  longitude   DOUBLE PRECISION,
  is_default  BOOLEAN DEFAULT false
);

-- ------------------------------------------------------------------ cart ----
CREATE TABLE cart (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cart_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id     UUID NOT NULL REFERENCES cart(id) ON DELETE CASCADE,
  listing_id  UUID NOT NULL REFERENCES seller_listings(id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cart_id, listing_id)
);

-- ---------------------------------------------------------------- orders ----
-- One order row per SELLER per checkout (multi-seller cart → grouped orders
-- sharing an order_group_id).
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code      TEXT UNIQUE NOT NULL,
  order_group_id  TEXT NOT NULL,
  customer_id     UUID REFERENCES users(id),
  seller_id       UUID NOT NULL REFERENCES sellers(id),
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT NOT NULL,
  subtotal        NUMERIC NOT NULL,
  delivery_fee    NUMERIC NOT NULL DEFAULT 0,
  total           NUMERIC NOT NULL,
  fulfilment_mode TEXT DEFAULT 'DELIVERY' CHECK (fulfilment_mode IN ('DELIVERY','PICKUP')),
  delivery_address TEXT,
  delivery_locality TEXT,
  delivery_city   TEXT,
  delivery_district TEXT,
  delivery_state  TEXT,
  delivery_pincode TEXT,
  delivery_lat    DOUBLE PRECISION,   -- only populated with explicit customer consent
  delivery_lng    DOUBLE PRECISION,
  payment_status  TEXT NOT NULL DEFAULT 'PENDING_PAYMENT'
                    CHECK (payment_status IN ('PENDING_PAYMENT','PAID','FAILED','REFUNDED')),
  order_status    TEXT NOT NULL DEFAULT 'PENDING_PAYMENT'
                    CHECK (order_status IN (
                      'PENDING_PAYMENT','PAID','CONFIRMED','PROCESSING',
                      'READY_FOR_PICKUP','OUT_FOR_DELIVERY','DELIVERED','CANCELLED')),
  seller_notified_unread BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_seller ON orders (seller_id, order_status);
CREATE INDEX idx_orders_customer ON orders (customer_id);

CREATE TABLE order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  listing_id  UUID REFERENCES seller_listings(id),
  product_name TEXT NOT NULL,
  unit_price  NUMERIC NOT NULL,
  quantity    INTEGER NOT NULL
);

-- -------------------------------------------------------------- payments ----
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_group_id  TEXT NOT NULL,
  provider        TEXT NOT NULL DEFAULT 'DEMO' CHECK (provider IN ('RAZORPAY','DEMO')),
  provider_order_id TEXT,
  payment_id      TEXT UNIQUE,
  amount          NUMERIC NOT NULL,
  status          TEXT NOT NULL DEFAULT 'CREATED'
                    CHECK (status IN ('CREATED','PAID','FAILED','VERIFIED_FAILED')),
  signature_verified BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------- reviews ----
CREATE TABLE reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES users(id),
  order_id    UUID REFERENCES orders(id),
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------ favourites ----
CREATE TABLE favourites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id) ON DELETE CASCADE,
  seller_id   UUID REFERENCES sellers(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (product_id IS NOT NULL OR seller_id IS NOT NULL)
);

-- --------------------------------------------------------- catalog import ----
CREATE TABLE catalog_sources (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('WEBSITE','GOOGLE_MERCHANT','POS_FEED','MANUFACTURER_MASTER')),
  config      JSONB DEFAULT '{}'::jsonb,
  status      TEXT DEFAULT 'CONFIGURED',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE catalog_imports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id   UUID REFERENCES catalog_sources(id) ON DELETE CASCADE,
  seller_id   UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  raw_payload JSONB NOT NULL,
  status      TEXT NOT NULL DEFAULT 'NEEDS_SELLER_CONFIRMATION'
                CHECK (status IN ('NEEDS_SELLER_CONFIRMATION','CONFIRMED','REJECTED')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------- notifications ----
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  seller_id   UUID REFERENCES sellers(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  payload     JSONB DEFAULT '{}'::jsonb,
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------- distance fn ----
-- Haversine great-circle distance in km between two lat/lng points.
CREATE OR REPLACE FUNCTION haversine_km(lat1 DOUBLE PRECISION, lng1 DOUBLE PRECISION,
                                        lat2 DOUBLE PRECISION, lng2 DOUBLE PRECISION)
RETURNS DOUBLE PRECISION AS $$
DECLARE
  r DOUBLE PRECISION := 6371;
  dlat DOUBLE PRECISION := radians(lat2 - lat1);
  dlng DOUBLE PRECISION := radians(lng2 - lng1);
  a DOUBLE PRECISION;
BEGIN
  a := sin(dlat/2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng/2)^2;
  RETURN r * 2 * atan2(sqrt(a), sqrt(1-a));
END;
$$ LANGUAGE plpgsql IMMUTABLE;
