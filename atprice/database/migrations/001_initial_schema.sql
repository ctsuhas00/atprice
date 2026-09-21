-- ============================================================================
-- AtPrice — PostgreSQL Migration 001: Initial Schema
-- Run: psql "$DATABASE_URL" -f database/migrations/001_initial_schema.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------- users ----
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id     TEXT UNIQUE,
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'CUSTOMER'
                  CHECK (role IN ('CUSTOMER','SELLER','ADMIN')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ------------------------------------------------------------ sessions ----
CREATE TABLE IF NOT EXISTS sessions (
  sid    TEXT PRIMARY KEY,
  sess   JSONB NOT NULL,
  expire TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);

-- -------------------------------------------------------------- sellers ----
CREATE TABLE IF NOT EXISTS sellers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
  shop_name           TEXT NOT NULL,
  owner_name          TEXT NOT NULL,
  phone               TEXT NOT NULL,
  whatsapp            TEXT,
  email               TEXT,
  description         TEXT,
  status              TEXT NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','VERIFIED','REJECTED','SUSPENDED')),
  address             TEXT,
  city                TEXT NOT NULL,
  state               TEXT NOT NULL DEFAULT 'Karnataka',
  pincode             TEXT,
  latitude            DOUBLE PRECISION,
  longitude           DOUBLE PRECISION,
  rating              NUMERIC(3,2) DEFAULT 4.0,
  rating_count        INTEGER DEFAULT 0,
  business_hours      TEXT DEFAULT 'Mon-Sat: 9am-7pm',
  service_area_km     NUMERIC DEFAULT 10,
  pickup_available    BOOLEAN DEFAULT true,
  delivery_available  BOOLEAN DEFAULT false,
  is_demo_data        BOOLEAN DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sellers_city ON sellers(city);
CREATE INDEX IF NOT EXISTS idx_sellers_status ON sellers(status);
CREATE INDEX IF NOT EXISTS idx_sellers_user_id ON sellers(user_id);

-- ----------------------------------------------------------- categories ----
CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        TEXT UNIQUE NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url   TEXT,
  icon        TEXT,
  active      BOOLEAN DEFAULT true,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subcategories (
  id          SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  active      BOOLEAN DEFAULT true,
  UNIQUE(category_id, name)
);

-- ------------------------------------------------------------- products ----
CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE,
  brand           TEXT,
  model           TEXT,
  sku             TEXT,
  category_id     INTEGER REFERENCES categories(id),
  subcategory_id  INTEGER REFERENCES subcategories(id),
  description     TEXT,
  specifications  JSONB DEFAULT '{}'::jsonb,
  unit            TEXT DEFAULT 'piece',
  pack_size       TEXT,
  mrp             NUMERIC(12,2),
  manufacturer    TEXT,
  warranty        TEXT,
  keywords        TEXT,
  active          BOOLEAN DEFAULT true,
  is_demo_data    BOOLEAN DEFAULT true,
  search_vector   tsvector,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_search ON products USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_brand_trgm ON products USING GIN(brand gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id, subcategory_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);

-- Auto-update search vector
CREATE OR REPLACE FUNCTION update_product_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.brand,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.model,'') || ' ' || coalesce(NEW.sku,'')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.description,'') || ' ' || coalesce(NEW.keywords,'')), 'D');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_search_vector ON products;
CREATE TRIGGER trg_product_search_vector
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();

-- Auto-generate slug
CREATE OR REPLACE FUNCTION generate_product_slug() RETURNS trigger AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g')) 
                || '-' || substring(gen_random_uuid()::text, 1, 8);
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_slug ON products;
CREATE TRIGGER trg_product_slug
  BEFORE INSERT ON products
  FOR EACH ROW EXECUTE FUNCTION generate_product_slug();

-- ------------------------------------------------------- product_images ----
CREATE TABLE IF NOT EXISTS product_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,
  alt_text    TEXT,
  is_primary  BOOLEAN DEFAULT false,
  sort_order  INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id, is_primary);

-- ---------------------------------------------------- seller_listings ----
CREATE TABLE IF NOT EXISTS seller_listings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id           UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price               NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  mrp                 NUMERIC(12,2),
  stock_quantity      INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
  minimum_order_qty   INTEGER DEFAULT 1,
  availability        TEXT NOT NULL DEFAULT 'IN_STOCK'
                        CHECK (availability IN ('IN_STOCK','LOW_STOCK','OUT_OF_STOCK')),
  pickup_available    BOOLEAN DEFAULT true,
  delivery_available  BOOLEAN DEFAULT false,
  active              BOOLEAN DEFAULT true,
  notes               TEXT,
  last_updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(seller_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_listings_product ON seller_listings(product_id);
CREATE INDEX IF NOT EXISTS idx_listings_seller ON seller_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_price ON seller_listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_active ON seller_listings(active);
CREATE INDEX IF NOT EXISTS idx_listings_updated ON seller_listings(last_updated_at);

-- ------------------------------------------------------------- enquiries ----
CREATE TABLE IF NOT EXISTS enquiries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  seller_id       UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
  listing_id      UUID REFERENCES seller_listings(id) ON DELETE SET NULL,
  message         TEXT NOT NULL,
  customer_phone  TEXT,
  customer_name   TEXT,
  status          TEXT NOT NULL DEFAULT 'NEW'
                    CHECK (status IN ('NEW','CONTACTED','CLOSED')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enquiries_seller ON enquiries(seller_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_customer ON enquiries(customer_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);

-- ----------------------------------------------------------------- fns ----
CREATE OR REPLACE FUNCTION haversine_km(
  lat1 DOUBLE PRECISION, lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lng2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
  r    DOUBLE PRECISION := 6371;
  dlat DOUBLE PRECISION := radians(lat2 - lat1);
  dlng DOUBLE PRECISION := radians(lng2 - lng1);
  a    DOUBLE PRECISION;
BEGIN
  a := sin(dlat/2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng/2)^2;
  RETURN r * 2 * atan2(sqrt(a), sqrt(1-a));
END $$ LANGUAGE plpgsql IMMUTABLE;

-- updated_at triggers
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_sellers_updated ON sellers;
CREATE TRIGGER trg_sellers_updated BEFORE UPDATE ON sellers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_products_updated ON products;
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_listings_updated ON seller_listings;
CREATE TRIGGER trg_listings_updated BEFORE UPDATE ON seller_listings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_enquiries_updated ON enquiries;
CREATE TRIGGER trg_enquiries_updated BEFORE UPDATE ON enquiries FOR EACH ROW EXECUTE FUNCTION set_updated_at();
