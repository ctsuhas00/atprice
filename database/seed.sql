-- ============================================================================
-- AtPrice — demo/sample seed data (PostgreSQL)
-- Every row here is marked as demo data (products.is_demo_data = true).
-- Mirrors database/init-sqlite.js, which seeds the same data into SQLite
-- for local development.
-- ============================================================================

INSERT INTO categories (name) VALUES
 ('Building Materials'),('Plumbing & Sanitary'),('Electrical'),('Tools & Machinery'),
 ('Paints & Chemicals'),('Steel & Metal'),('Fasteners & General Hardware'),
 ('Doors, Windows & Fittings'),('Tiles & Flooring'),('Glass & Aluminium'),
 ('Safety & PPE'),('Garden & Outdoor'),('Welding & Cutting'),('Furniture Hardware'),
 ('Automotive & Workshop'),('Industrial, MRO & Engineering'),
 ('Adhesives, Tapes & Sealants'),('Packaging & Storage'),('Material Handling'),
 ('Security & Safety Systems'),('Bathroom & Home Improvement'),
 ('HVAC & Ventilation'),('Agriculture & Irrigation'),('DIY & Craft Hardware'),
 ('Testing, Measuring & Instruments');

-- Six demo products (from the AtPrice prototype), each with 2-3 seller listings.
-- See database/init-sqlite.js for the full scripted version with sellers,
-- listings and geocoordinates — run that logic's SQL equivalent here in
-- production, or use the /api/admin/seed-demo endpoint pattern.

INSERT INTO products (name, brand, category_id, description, unit, mrp, manufacturer, is_demo_data)
SELECT 'UltraTech OPC 53 Grade Cement 50kg', 'UltraTech', id, 'High strength OPC 53 grade cement, 50kg bag.', 'bag', 410, 'UltraTech Cement Ltd', true
FROM categories WHERE name = 'Building Materials';

INSERT INTO products (name, brand, category_id, description, unit, mrp, manufacturer, is_demo_data)
SELECT 'Astral CPVC FlowGuard Plus 1 inch x 3m', 'Astral', id, 'CPVC pressure pipe, 1 inch diameter, 3 metre length.', 'piece', 310, 'Astral Pipes', true
FROM categories WHERE name = 'Plumbing & Sanitary';

INSERT INTO products (name, brand, category_id, description, unit, mrp, manufacturer, is_demo_data)
SELECT 'Havells 16A Modular Switch', 'Havells', id, '16A modular switch, white.', 'piece', 145, 'Havells India', true
FROM categories WHERE name = 'Electrical';

INSERT INTO products (name, brand, category_id, description, unit, mrp, manufacturer, is_demo_data)
SELECT 'Bosch Professional Angle Grinder 4 inch', 'Bosch', id, '4-inch professional angle grinder, 720W.', 'piece', 3650, 'Bosch Power Tools', true
FROM categories WHERE name = 'Tools & Machinery';

INSERT INTO products (name, brand, category_id, description, unit, mrp, manufacturer, is_demo_data)
SELECT 'Asian Paints Apex Exterior 20L', 'Asian Paints', id, 'Weatherproof exterior emulsion, 20 litre.', 'can', 4650, 'Asian Paints Ltd', true
FROM categories WHERE name = 'Paints & Chemicals';

INSERT INTO products (name, brand, category_id, description, unit, mrp, manufacturer, is_demo_data)
SELECT 'JSW TMT Bar 12mm', 'JSW', id, 'Fe-500D grade TMT reinforcement bar, 12mm.', 'piece', 75, 'JSW Steel', true
FROM categories WHERE name = 'Steel & Metal';

-- NOTE: seller + seller_listings demo rows are created programmatically by
-- database/init-sqlite.js for local dev. For a Postgres deployment, adapt
-- that script's SELLERS/LISTINGS arrays into INSERT statements the same way
-- the products above were written.
