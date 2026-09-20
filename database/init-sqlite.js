// AtPrice — SQLite bootstrap + full demo seed
// 250+ products, 50 sellers, 3-5 listings per major product

const path = require('path');
const crypto = require('crypto');
const Database = require(path.join(__dirname, '..', 'node_modules', 'better-sqlite3'));
const bcrypt = require(path.join(__dirname, '..', 'node_modules', 'bcryptjs'));

const DB_PATH = path.join(__dirname, 'atprice.sqlite3');
function uuid() { return crypto.randomUUID(); }
function ago(minutes) { return new Date(Date.now() - minutes * 60000).toISOString(); }

function buildSchema(db) {
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, role TEXT NOT NULL DEFAULT 'CUSTOMER',
      name TEXT NOT NULL, email TEXT UNIQUE, phone TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sellers (
      id TEXT PRIMARY KEY, seller_code TEXT UNIQUE NOT NULL,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      owner_name TEXT NOT NULL, mobile TEXT NOT NULL, email TEXT,
      shop_name TEXT NOT NULL, trade_name TEXT, gstin TEXT, pan TEXT,
      seller_type TEXT, years_in_business INTEGER,
      phone TEXT, whatsapp TEXT, website TEXT, description TEXT,
      opening_hours TEXT,
      pickup_available INTEGER DEFAULT 1, delivery_available INTEGER DEFAULT 0,
      delivery_radius_km REAL, return_policy TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
      verification_notes TEXT, rating REAL DEFAULT 0, rating_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS seller_locations (
      id TEXT PRIMARY KEY,
      seller_id TEXT NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
      address1 TEXT NOT NULL, landmark TEXT, locality TEXT,
      city TEXT NOT NULL, district TEXT NOT NULL, state TEXT NOT NULL,
      pincode TEXT NOT NULL, latitude REAL, longitude REAL, is_primary INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE, icon TEXT, image_url TEXT
    );

    CREATE TABLE IF NOT EXISTS subcategories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      name TEXT NOT NULL, UNIQUE (category_id, name)
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, brand TEXT, model TEXT, sku TEXT,
      category_id INTEGER REFERENCES categories(id),
      subcategory_id INTEGER REFERENCES subcategories(id),
      description TEXT, specifications TEXT DEFAULT '{}',
      unit TEXT DEFAULT 'piece', pack_size TEXT, mrp REAL,
      manufacturer TEXT, warranty TEXT, keywords TEXT,
      is_demo_data INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id, subcategory_id);
    CREATE INDEX IF NOT EXISTS idx_products_brand ON products (brand);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products (name);

    CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
      name, brand, model, sku, description, keywords,
      content='products', content_rowid='rowid'
    );

    CREATE TRIGGER IF NOT EXISTS products_ai AFTER INSERT ON products BEGIN
      INSERT INTO products_fts(rowid,name,brand,model,sku,description,keywords)
      VALUES (new.rowid,new.name,new.brand,new.model,new.sku,new.description,new.keywords);
    END;
    CREATE TRIGGER IF NOT EXISTS products_ad AFTER DELETE ON products BEGIN
      INSERT INTO products_fts(products_fts,rowid,name,brand,model,sku,description,keywords)
      VALUES ('delete',old.rowid,old.name,old.brand,old.model,old.sku,old.description,old.keywords);
    END;
    CREATE TRIGGER IF NOT EXISTS products_au AFTER UPDATE ON products BEGIN
      INSERT INTO products_fts(products_fts,rowid,name,brand,model,sku,description,keywords)
      VALUES ('delete',old.rowid,old.name,old.brand,old.model,old.sku,old.description,old.keywords);
      INSERT INTO products_fts(rowid,name,brand,model,sku,description,keywords)
      VALUES (new.rowid,new.name,new.brand,new.model,new.sku,new.description,new.keywords);
    END;

    CREATE TABLE IF NOT EXISTS product_images (
      id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      url TEXT NOT NULL, is_primary INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS seller_listings (
      id TEXT PRIMARY KEY,
      seller_id TEXT NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      price REAL NOT NULL CHECK (price >= 0), mrp REAL,
      stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
      minimum_order_qty INTEGER NOT NULL DEFAULT 1, unit TEXT DEFAULT 'piece',
      availability TEXT NOT NULL DEFAULT 'IN_STOCK',
      delivery_available INTEGER DEFAULT 0, pickup_available INTEGER DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'ACTIVE', source TEXT DEFAULT 'MANUAL',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (seller_id, product_id)
    );
    CREATE INDEX IF NOT EXISTS idx_listings_product ON seller_listings (product_id);
    CREATE INDEX IF NOT EXISTS idx_listings_seller ON seller_listings (seller_id);
    CREATE INDEX IF NOT EXISTS idx_listings_price ON seller_listings (price);

    CREATE TABLE IF NOT EXISTS enquiries (
      id TEXT PRIMARY KEY, product_id TEXT REFERENCES products(id),
      seller_id TEXT REFERENCES sellers(id), listing_id TEXT REFERENCES seller_listings(id),
      customer_name TEXT, customer_phone TEXT, customer_message TEXT,
      status TEXT DEFAULT 'NEW', created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, order_code TEXT UNIQUE NOT NULL,
      customer_id TEXT REFERENCES users(id), seller_id TEXT NOT NULL REFERENCES sellers(id),
      customer_name TEXT NOT NULL, customer_phone TEXT NOT NULL,
      subtotal REAL NOT NULL, total REAL NOT NULL,
      order_status TEXT NOT NULL DEFAULT 'PENDING',
      notes TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      listing_id TEXT REFERENCES seller_listings(id),
      product_name TEXT NOT NULL, unit_price REAL NOT NULL, quantity INTEGER NOT NULL
    );
  `);
}

function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

function seedIfEmpty(db) {
  const count = db.prepare('SELECT COUNT(*) c FROM products').get().c;
  if (count > 0) { console.log(`DB already seeded (${count} products). Skipping.`); return; }

  console.log('Seeding database...');

  // ── Categories & subcategories ──────────────────────────────────────────
  const iCat = db.prepare('INSERT OR IGNORE INTO categories (name, slug, icon) VALUES (?,?,?)');
  const iSub = db.prepare('INSERT OR IGNORE INTO subcategories (category_id, name) VALUES (?,?)');
  const gCat = db.prepare('SELECT id FROM categories WHERE name=?');

  const CATS = [
    ['Building Materials','building-materials','🏗️',['Cement','Sand & Aggregate','Bricks & Blocks','Waterproofing','Wall Putty & Plaster','Readymix Concrete','Construction Chemicals','Roofing']],
    ['Plumbing & Sanitary','plumbing-sanitary','🚿',['CPVC Pipes & Fittings','PVC Pipes & Fittings','GI Pipes','Valves & Taps','Bathroom Fittings','Water Tanks','Pumps','Drain & Waste']],
    ['Electrical','electrical','⚡',['Switches & Sockets','Wires & Cables','MCB & Distribution Boards','LED Lighting','Ceiling Fans','Conduits & Channels','Earthing','Wiring Accessories']],
    ['Tools & Machinery','tools-machinery','🔧',['Power Drills','Angle Grinders','Cutting Tools','Hand Tools','Measuring Tools','Welding Equipment','Compressors','Lifting Equipment']],
    ['Paints & Chemicals','paints-chemicals','🎨',['Interior Emulsion','Exterior Paint','Primers','Enamel & Oil Paint','Wood Finishes','Waterproofing Compounds','Thinners & Solvents','Industrial Coatings']],
    ['Steel & Metal','steel-metal','🔩',['TMT Bars','MS Angles & Channels','GI Sheets','Stainless Steel','Binding Wire','MS Flats & Rounds','Aluminium Sections','Chequered Plates']],
    ['Fasteners & Hardware','fasteners-hardware','🔩',['Bolts & Nuts','Screws','Anchors & Rawlbolts','Hinges','Locks & Latches','Handles','Nails','Wire Rope & Chain']],
    ['Doors, Windows & Fittings','doors-windows','🚪',['Wooden Doors','Steel Doors','uPVC Windows','Aluminium Windows','Door Frames','Window Grills','Mosquito Mesh','Glass Panels']],
    ['Tiles & Flooring','tiles-flooring','🏠',['Ceramic Tiles','Vitrified Tiles','Granite','Marble','Anti-Skid Tiles','Tile Adhesive','Grout','Epoxy Flooring']],
    ['Glass & Aluminium','glass-aluminium','🪟',['Float Glass','Toughened Glass','Mirror','Aluminium Sections','Aluminium Composite Panels','Glass Wool','Glazing Compounds','Reflective Glass']],
    ['Safety & PPE','safety-ppe','⛑️',['Helmets','Safety Gloves','Safety Boots','Safety Glasses','Masks & Respirators','Harness & Fall Protection','Hi-Vis Vests','First Aid']],
    ['Garden & Outdoor','garden-outdoor','🌱',['Garden Hoses','Sprinklers','Garden Tools','Shade Nets','Fencing','Outdoor Lighting','Mulch & Compost','Watering Cans']],
    ['Welding & Cutting','welding-cutting','⚙️',['Welding Machines','Welding Rods','MIG Wire','Gas Cylinders','Welding Helmets','Plasma Cutters','Cutting Discs','Grinding Discs']],
    ['Adhesives, Tapes & Sealants','adhesives-tapes','📦',['Construction Adhesive','Silicone Sealant','Epoxy Adhesive','PTFE Tape','Masking Tape','Double-Sided Tape','Foam Tape','Pipe Compound']],
    ['Safety & Security Systems','security-systems','🔐',['CCTV Cameras','Access Control','Electric Locks','Alarm Systems','Fire Extinguishers','Smoke Detectors','Motion Sensors','Safes']],
    ['HVAC & Ventilation','hvac-ventilation','❄️',['Exhaust Fans','Ventilation Ducting','Air Coolers','AC Accessories','Refrigerant Gas','Insulation','Dampers','Louvers']],
    ['Bathroom & Home Improvement','bathroom-home','🛁',['Sanitary Ware','Shower Fittings','Bathroom Accessories','Kitchen Sinks','Water Heaters','Bathroom Cabinets','Towel Rails','Soap Dispensers']],
    ['Furniture Hardware','furniture-hardware','🪑',['Drawer Channels','Cabinet Hinges','Furniture Handles','Casters & Wheels','Bed Fittings','Shelf Brackets','Wardrobe Fittings','Table Legs']],
    ['Material Handling','material-handling','🚜',['Hand Trucks','Trolleys','Pallets','Storage Racks','Rope & Slings','Winches','Dollies','Strapping Tools']],
    ['Packaging & Storage','packaging-storage','📦',['Corrugated Boxes','Bubble Wrap','Stretch Film','Storage Bins','Industrial Shelving','Cable Drums','Polythene Bags','Strapping Bands']],
    ['Agriculture & Irrigation','agriculture-irrigation','🌾',['Drip Irrigation','Sprinkler Systems','Submersible Pumps','Agri Pipes','Mulch Film','Greenhouse Nets','Fertilizer Spreaders','Water Meters']],
    ['Testing & Instruments','testing-instruments','📏',['Digital Multimeters','Clamp Meters','Laser Levels','Theodolites','Moisture Meters','Ultrasonic Flaw Detectors','Thermal Cameras','Torque Wrenches']],
    ['Automotive & Workshop','automotive-workshop','🚗',['Jack Stands','Jacks','Air Tools','Oil Cans','Workshop Stands','Tyre Inflators','Battery Chargers','Tool Cabinets']],
    ['Ladders & Scaffolding','ladders-scaffolding','🪜',['Aluminium Ladders','Fibreglass Ladders','Step Ladders','Scaffolding Frames','Platform Trolleys','Roof Safety','Extension Ladders','Loft Ladders']],
    ['Industrial & MRO','industrial-mro','🏭',['Bearings','Belts & Pulleys','Gears','Lubricants','Cleaning Agents','Abrasives','Cutting Fluids','Industrial Gaskets']],
  ];

  const catIdMap = {};
  for (const [name, slug, icon, subs] of CATS) {
    iCat.run(name, slug, icon);
    const cid = gCat.get(name).id;
    catIdMap[name] = cid;
    for (const s of subs) iSub.run(cid, s);
  }
  console.log(`  ${CATS.length} categories seeded`);

  // ── Sellers ─────────────────────────────────────────────────────────────
  const DEMO_HASH = bcrypt.hashSync('demo1234', 8);
  const iUser = db.prepare('INSERT INTO users (id,role,name,email,phone,password_hash) VALUES (?,?,?,?,?,?)');
  const iSeller = db.prepare(`INSERT INTO sellers (id,seller_code,user_id,owner_name,mobile,email,shop_name,
    gstin,seller_type,years_in_business,phone,whatsapp,description,opening_hours,
    pickup_available,delivery_available,delivery_radius_km,status,rating,rating_count)
    VALUES (@id,@code,@uid,@owner,@mobile,@email,@shop,@gstin,@type,@years,@phone,@wa,@desc,@hours,1,1,15,@status,@rating,@rc)`);
  const iLoc = db.prepare('INSERT INTO seller_locations (id,seller_id,address1,locality,city,district,state,pincode,latitude,longitude) VALUES (?,?,?,?,?,?,?,?,?,?)');

  const SELLERS = [
    // Brahmavara/Udupi Belt
    {code:'ATPS-SKH01',owner:'Ramesh Shetty',shop:'Sri Krishna Hardware',mobile:'9900011101',locality:'Brahmavara',city:'Brahmavara',lat:13.4272,lng:74.7411,gstin:'29ABCDE1111F1Z5',years:14,rating:4.4,rc:156,status:'VERIFIED',desc:'Complete hardware store. Cement, steel, pipes, electrical and tools.',hours:'Mon–Sat 8am–8pm, Sun 9am–2pm'},
    {code:'ATPS-BPC01',owner:'Suresh Kamath',shop:'Brahmavar Plumbing Centre',mobile:'9900011102',locality:'Brahmavara',city:'Brahmavara',lat:13.4198,lng:74.7345,gstin:'29ABCDE2222F1Z3',years:9,rating:4.6,rc:203,status:'VERIFIED',desc:'Specialist plumbing and sanitary store. CPVC, PVC, GI pipes and all fittings.',hours:'Mon–Sat 9am–7pm'},
    {code:'ATPS-UPH01',owner:'Naveen Poojary',shop:'Udupi Pipe House',mobile:'9900011103',locality:'Manipal',city:'Udupi',lat:13.3409,lng:74.7421,gstin:'29ABCDE3333F1Z1',years:20,rating:4.1,rc:178,status:'VERIFIED',desc:'Largest pipe stockist in Udupi. All brands and sizes.',hours:'Mon–Sat 8:30am–7:30pm'},
    {code:'ATPS-PPE01',owner:'Ganesh Pai',shop:'Power Point Electricals',mobile:'9900011104',locality:'Brahmavara',city:'Brahmavara',lat:13.4256,lng:74.7398,gstin:'29ABCDE4444F1Z9',years:11,rating:4.3,rc:134,status:'VERIFIED',desc:'Authorised dealer for Havells, Legrand, Polycab. Switches, fans, wires and MCBs.',hours:'Mon–Sat 9am–8pm'},
    {code:'ATPS-BEL01',owner:'Vinod Salian',shop:'Brahmavar Electricals',mobile:'9900011105',locality:'Brahmavara',city:'Brahmavara',lat:13.4310,lng:74.7460,gstin:'29ABCDE5555F1Z7',years:6,rating:4.0,rc:89,status:'VERIFIED',desc:'All electrical materials for domestic and industrial use.',hours:'Mon–Sat 9am–7pm, Sun 10am–1pm'},
    {code:'ATPS-TWD01',owner:'Prakash Rao',shop:'Tool World',mobile:'9900011106',locality:'Manipal',city:'Udupi',lat:13.3390,lng:74.7466,gstin:'29ABCDE6666F1Z4',years:8,rating:4.5,rc:211,status:'VERIFIED',desc:'Bosch, Makita, Dewalt, Stanley, Taparia. New and serviced tools.',hours:'Mon–Sat 9am–7pm'},
    {code:'ATPS-BTM01',owner:'Dinesh Shetty',shop:'Brahmavar Tools Mart',mobile:'9900011107',locality:'Brahmavara',city:'Brahmavara',lat:13.4230,lng:74.7355,gstin:'29ABCDE7777F1Z2',years:5,rating:3.9,rc:67,status:'VERIFIED',desc:'Hand tools, power tools and construction accessories.',hours:'Mon–Sat 9am–7pm'},
    {code:'ATPS-CHS01',owner:'Anil Kumar',shop:'Colour House',mobile:'9900011108',locality:'Brahmavara',city:'Brahmavara',lat:13.4340,lng:74.7300,gstin:'29ABCDE8888F1Z0',years:12,rating:4.2,rc:145,status:'VERIFIED',desc:'Asian Paints, Berger, Nerolac dealer. Tinting and colour consultation available.',hours:'Mon–Sat 8am–8pm'},
    {code:'ATPS-BPT01',owner:'Rajesh Nayak',shop:'Brahmavar Paints & Chemicals',mobile:'9900011109',locality:'Brahmavara',city:'Brahmavara',lat:13.4180,lng:74.7500,gstin:'29ABCDE9999F1Z8',years:7,rating:3.8,rc:54,status:'VERIFIED',desc:'Paints, waterproofing, construction chemicals and surface finishes.',hours:'Mon–Sat 9am–7pm'},
    {code:'ATPS-CST01',owner:'Mahesh Shetty',shop:'Coastal Steel Traders',mobile:'9900011110',locality:'Kaup',city:'Udupi',lat:13.2140,lng:74.7460,gstin:'29ABCDE1010F1Z6',years:16,rating:4.4,rc:189,status:'VERIFIED',desc:'TMT bars, MS sections, GI sheets. Bulk and retail. JSW, Tata, SAIL.',hours:'Mon–Sat 8am–7pm'},
    {code:'ATPS-BSD01',owner:'Harish Achar',shop:'Brahmavar Steel Depot',mobile:'9900011111',locality:'Brahmavara',city:'Brahmavara',lat:13.4300,lng:74.7420,gstin:'29ABCDE1212F1Z2',years:10,rating:4.0,rc:122,status:'VERIFIED',desc:'Full range steel stockist. TMT, angles, channels, binding wire.',hours:'Mon–Sat 8am–7pm'},
    {code:'ATPS-UBM01',owner:'Satish Prabhu',shop:'Udupi Building Materials',mobile:'9900011112',locality:'Indrali',city:'Udupi',lat:13.3350,lng:74.7480,gstin:'29ABCDE1313F1Z4',years:22,rating:4.5,rc:267,status:'VERIFIED',desc:'Complete construction materials. Cement, sand, bricks, steel. Bulk delivery available.',hours:'Mon–Sat 7am–7pm'},
    {code:'ATPS-KHE01',owner:'Prasad Hegde',shop:'Karnataka Hardware Emporium',mobile:'9900011113',locality:'Kundapura',city:'Kundapura',lat:13.6200,lng:74.6900,gstin:'29ABCDE1414F1Z6',years:18,rating:4.3,rc:198,status:'VERIFIED',desc:'Hardware, tools, pipes and electrical in Kundapura.',hours:'Mon–Sat 8:30am–7:30pm'},
    {code:'ATPS-UES01',owner:'Shyam Bhat',shop:'Udupi Electricals & Sanitary',mobile:'9900011114',locality:'Car Street',city:'Udupi',lat:13.3425,lng:74.7385,gstin:'29ABCDE1515F1Z8',years:13,rating:4.2,rc:143,status:'VERIFIED',desc:'Electricals, sanitary and plumbing combined store.',hours:'Mon–Sat 9am–7:30pm'},
    {code:'ATPS-MGH01',owner:'Krishnaraj Bhat',shop:'Mangalore General Hardware',mobile:'9900011115',locality:'Hampankatta',city:'Mangaluru',lat:12.8680,lng:74.8420,gstin:'29ABCDE1616F1Z0',years:25,rating:4.6,rc:312,status:'VERIFIED',desc:'Mangalore oldest hardware store. All building and industrial materials.',hours:'Mon–Sat 8am–8pm'},
    {code:'ATPS-MSH01',owner:'Ashwin Dsouza',shop:'Modern Sanitary Hub',mobile:'9900011116',locality:'Falnir',city:'Mangaluru',lat:12.8750,lng:74.8390,gstin:'29ABCDE1717F1Z2',years:9,rating:4.1,rc:98,status:'VERIFIED',desc:'Premium bathroom fittings, sanitary ware and plumbing supplies.',hours:'Mon–Sat 9am–7pm'},
    {code:'ATPS-KPC01',owner:'Sunil Pinto',shop:'Konkan Pipe Centre',mobile:'9900011117',locality:'Bejai',city:'Mangaluru',lat:12.8620,lng:74.8280,gstin:'29ABCDE1818F1Z4',years:11,rating:4.0,rc:87,status:'VERIFIED',desc:'All pipe brands and sizes. CPVC, PVC, GI, HDPE.',hours:'Mon–Sat 8:30am–7pm'},
    {code:'ATPS-MTE01',owner:'Jeevan Fernandes',shop:'Mangalore Tools & Equipment',mobile:'9900011118',locality:'Attavar',city:'Mangaluru',lat:12.8720,lng:74.8350,gstin:'29ABCDE1919F1Z6',years:7,rating:4.4,rc:176,status:'VERIFIED',desc:'Power tools, hand tools, lifting equipment and industrial supplies.',hours:'Mon–Sat 9am–7pm'},
    {code:'ATPS-MYK01',owner:'Venugopal Raj',shop:'Mysuru Hardware Kendra',mobile:'9900011119',locality:'Lashkar Mohalla',city:'Mysuru',lat:12.3052,lng:76.6552,gstin:'29ABCDE2020F1Z8',years:19,rating:4.3,rc:221,status:'VERIFIED',desc:'Mysore leading hardware and building materials store.',hours:'Mon–Sat 8am–7:30pm'},
    {code:'ATPS-MYP01',owner:'Basavaraj Murthy',shop:'Mysore Paints Palace',mobile:'9900011120',locality:'Saraswathipuram',city:'Mysuru',lat:12.3100,lng:76.6400,gstin:'29ABCDE2121F1Z0',years:14,rating:4.2,rc:134,status:'VERIFIED',desc:'All paint brands and shades. Asian Paints color world dealer.',hours:'Mon–Sat 9am–8pm'},
    {code:'ATPS-HNH01',owner:'Manjunath Gowda',shop:'Hassan Hardware Mart',mobile:'9900011121',locality:'Bus Stand',city:'Hassan',lat:13.0072,lng:76.0962,gstin:'29ABCDE2222G1Z2',years:12,rating:4.1,rc:103,status:'VERIFIED',desc:'Complete hardware for Hassan and surrounding areas.',hours:'Mon–Sat 8:30am–7pm'},
    {code:'ATPS-SMH01',owner:'Giridhar Kamath',shop:'Shivamogga Modern Hardware',mobile:'9900011122',locality:'KEB Road',city:'Shivamogga',lat:13.9299,lng:75.5681,gstin:'29ABCDE2323F1Z4',years:16,rating:4.4,rc:187,status:'VERIFIED',desc:'Modern hardware and construction materials in Shivamogga.',hours:'Mon–Sat 8am–7:30pm'},
    {code:'ATPS-CKH01',owner:'Narayan Shetty',shop:'Chikmagalur Hardware House',mobile:'9900011123',locality:'Town Hall Road',city:'Chikkamagaluru',lat:13.3161,lng:75.7720,gstin:'29ABCDE2424F1Z6',years:8,rating:3.9,rc:72,status:'VERIFIED',desc:'Hardware and building materials for Chikmagalur.',hours:'Mon–Sat 9am–7pm'},
    {code:'ATPS-MDH01',owner:'Rajan Nair',shop:'Madikeri Hardware Centre',mobile:'9900011124',locality:'Main Road',city:'Madikeri',lat:12.4244,lng:75.7382,gstin:'29ABCDE2525F1Z8',years:10,rating:4.0,rc:91,status:'VERIFIED',desc:'Hardware, tools and construction materials in Coorg.',hours:'Mon–Sat 9am–7pm'},
    {code:'ATPS-BGA01',owner:'Lakshmipathi Rao',shop:'Bengaluru General Agencies',mobile:'9900011125',locality:'Rajajinagar',city:'Bengaluru',lat:12.9900,lng:77.5500,gstin:'29ABCDE2626F1Z0',years:30,rating:4.7,rc:456,status:'VERIFIED',desc:'One of Bengaluru oldest hardware distributors. Wholesale and retail.',hours:'Mon–Sat 8am–8pm'},
    {code:'ATPS-BNH01',owner:'Ravi Kumar',shop:'BN Hardware Traders',mobile:'9900011126',locality:'Yeshwanthpur',city:'Bengaluru',lat:13.0217,lng:77.5480,gstin:'29ABCDE2727F1Z2',years:15,rating:4.3,rc:198,status:'VERIFIED',desc:'All hardware and construction materials.',hours:'Mon–Sat 8:30am–7:30pm'},
    {code:'ATPS-SPE01',owner:'Chandrashekar',shop:'Shree Plumbing Emporium',mobile:'9900011127',locality:'Brahmavara',city:'Brahmavara',lat:13.4260,lng:74.7380,gstin:'29ABCDE2828F1Z4',years:6,rating:4.1,rc:78,status:'VERIFIED',desc:'Complete plumbing store. Authorised Astral and Ashirvad dealer.',hours:'Mon–Sat 9am–7pm'},
    {code:'ATPS-GFH01',owner:'Mohan Das',shop:'Ganesh Fasteners Hub',mobile:'9900011128',locality:'Udupi',city:'Udupi',lat:13.3360,lng:74.7440,gstin:'29ABCDE2929F1Z6',years:9,rating:4.0,rc:84,status:'VERIFIED',desc:'Complete range of fasteners. Bolts, nuts, screws, anchors and wire rope.',hours:'Mon–Sat 9am–6:30pm'},
    {code:'ATPS-KTH01',owner:'Kiran Tantri',shop:'Kiran Tools House',mobile:'9900011129',locality:'Kundapura',city:'Kundapura',lat:13.6180,lng:74.6870,gstin:'29ABCDE3030F1Z8',years:11,rating:4.2,rc:117,status:'VERIFIED',desc:'Power tools, hand tools, grinding wheels and accessories.',hours:'Mon–Sat 8:30am–7pm'},
    {code:'ATPS-UWS01',owner:'Jayaram Bhandary',shop:'Udupi Welding Supplies',mobile:'9900011130',locality:'Katapadi',city:'Udupi',lat:13.3280,lng:74.7510,gstin:'29ABCDE3131F1Z0',years:14,rating:4.3,rc:129,status:'VERIFIED',desc:'Welding machines, electrodes, gas cutting and safety equipment.',hours:'Mon–Sat 8am–7pm'},
    {code:'ATPS-MNH01',owner:'Dayananda Hegde',shop:'Mahalakshmi Hardware',mobile:'9900011131',locality:'Moodubelle',city:'Udupi',lat:13.3720,lng:74.7630,gstin:'29ABCDE3232F1Z2',years:20,rating:4.5,rc:234,status:'VERIFIED',desc:'Complete hardware. Cement, pipes, electrical, tools. 20 years serving Moodubelle.',hours:'Mon–Sat 7:30am–7:30pm'},
    {code:'ATPS-NHP01',owner:'Upendra Kamath',shop:'National Hardware Palace',mobile:'9900011132',locality:'Shirva',city:'Udupi',lat:13.2870,lng:74.7720,gstin:'29ABCDE3333G1Z4',years:17,rating:4.2,rc:162,status:'VERIFIED',desc:'Large hardware store serving Shirva and surrounding villages.',hours:'Mon–Sat 8am–7pm'},
    {code:'ATPS-GTH01',owner:'Sathish Kumar',shop:'Ganesh Tools & Hardware',mobile:'9900011133',locality:'Manipal',city:'Udupi',lat:13.3520,lng:74.7910,gstin:'29ABCDE3434F1Z6',years:8,rating:4.1,rc:93,status:'VERIFIED',desc:'Tools, hardware and construction accessories near Manipal.',hours:'Mon–Sat 9am–7pm'},
    {code:'ATPS-PBH01',owner:'Sudhakara Bhat',shop:'Prakash Building Hardware',mobile:'9900011134',locality:'Hiriyadka',city:'Udupi',lat:13.3650,lng:74.7820,gstin:'29ABCDE3535F1Z8',years:13,rating:4.0,rc:108,status:'VERIFIED',desc:'Building hardware, cement, blocks and tiles in Hiriyadka.',hours:'Mon–Sat 8am–7pm'},
    {code:'ATPS-SAF01',owner:'Abdul Rahman',shop:'Star Adhesives & Fixings',mobile:'9900011135',locality:'Mangaluru',city:'Mangaluru',lat:12.8700,lng:74.8430,gstin:'29ABCDE3636F1Z0',years:7,rating:4.2,rc:86,status:'VERIFIED',desc:'Adhesives, sealants, tapes and fixing solutions for construction.',hours:'Mon–Sat 9am–7pm'},
    {code:'ATPS-KSA01',owner:'Jagadeesh Naik',shop:'Kaveri Safety & Accessories',mobile:'9900011136',locality:'Manipal',city:'Udupi',lat:13.3550,lng:74.7870,gstin:'29ABCDE3737F1Z2',years:5,rating:4.0,rc:61,status:'PENDING_VERIFICATION',desc:'Safety PPE, helmets, gloves, boots and hi-vis vests.',hours:'Mon–Sat 9am–6pm'},
    {code:'ATPS-MTH01',owner:'Hemanth Shetty',shop:'Metro Hardware & Tiles',mobile:'9900011137',locality:'Udupi',city:'Udupi',lat:13.3380,lng:74.7460,gstin:'29ABCDE3838F1Z4',years:11,rating:4.3,rc:141,status:'VERIFIED',desc:'Tiles, flooring, granite and all building materials.',hours:'Mon–Sat 8:30am–7:30pm'},
    {code:'ATPS-AGH01',owner:'Sridhar Acharya',shop:'Agri & Garden Hub',mobile:'9900011138',locality:'Kundapura',city:'Kundapura',lat:13.6150,lng:74.6920,gstin:'29ABCDE3939F1Z6',years:9,rating:4.1,rc:79,status:'VERIFIED',desc:'Agricultural equipment, irrigation systems, garden tools and supplies.',hours:'Mon–Sat 8am–7pm'},
    {code:'ATPS-UST01',owner:'Bhaskara Tantri',shop:'Udupi Steel Traders',mobile:'9900011139',locality:'Manipal Junction',city:'Udupi',lat:13.3500,lng:74.7900,gstin:'29ABCDE4040F1Z8',years:15,rating:4.2,rc:153,status:'VERIFIED',desc:'TMT bars, MS sections, binding wire and all steel.',hours:'Mon–Sat 8am–6:30pm'},
    {code:'ATPS-BHW01',owner:'Arunkumar Nayak',shop:'Builder Hub Wholesale',mobile:'9900011140',locality:'Udupi',city:'Udupi',lat:13.3450,lng:74.7500,gstin:'29ABCDE4141F1Z0',years:6,rating:3.8,rc:48,status:'VERIFIED',desc:'Wholesale building materials. Minimum order quantities apply.',hours:'Mon–Sat 8am–6pm'},
    {code:'ATPS-CSH01',owner:'Suresh Bangera',shop:'Coastal Sanitary Hub',mobile:'9900011141',locality:'Honnavar',city:'Mangaluru',lat:14.2778,lng:74.4422,gstin:'29ABCDE4242F1Z2',years:12,rating:4.1,rc:112,status:'VERIFIED',desc:'Premium bathroom fittings and sanitary ware.',hours:'Mon–Sat 9am–7pm'},
    {code:'ATPS-NTE01',owner:'Devdas Padiyar',shop:'National Tools Emporium',mobile:'9900011142',locality:'Mangaluru',city:'Mangaluru',lat:12.8800,lng:74.8200,gstin:'29ABCDE4343F1Z4',years:20,rating:4.5,rc:278,status:'VERIFIED',desc:'Mangalore largest tool and machinery store.',hours:'Mon–Sat 8am–7:30pm'},
    {code:'ATPS-GLP01',owner:'Clement Crasta',shop:'Goa-Link Paints',mobile:'9900011143',locality:'Mangaluru',city:'Mangaluru',lat:12.8650,lng:74.8480,gstin:'29ABCDE4444G1Z6',years:8,rating:4.0,rc:76,status:'VERIFIED',desc:'Paints, wood finishes and decorative coatings.',hours:'Mon–Sat 9am–7pm'},
    {code:'ATPS-RKH01',owner:'Ravikumar Shetty',shop:'Rukminipura Hardware',mobile:'9900011144',locality:'Kundapura',city:'Kundapura',lat:13.6220,lng:74.6880,gstin:'29ABCDE4545F1Z8',years:11,rating:4.2,rc:124,status:'VERIFIED',desc:'Hardware, pipes, electrical and building materials in Kundapura.',hours:'Mon–Sat 8:30am–7pm'},
    {code:'ATPS-SPP01',owner:'Nagesh Prabhu',shop:'Sri Padmavathi Plumbing',mobile:'9900011145',locality:'Brahmavara',city:'Brahmavara',lat:13.4285,lng:74.7330,gstin:'29ABCDE4646F1Z0',years:7,rating:4.1,rc:83,status:'VERIFIED',desc:'Plumbing materials, CPVC, PVC, GI pipes and bathroom fittings.',hours:'Mon–Sat 9am–7pm'},
    {code:'ATPS-MVH01',owner:'Madhukar Verma',shop:'Metro Ventures Hardware',mobile:'9900011146',locality:'Bangarpet',city:'Bengaluru',lat:12.8500,lng:78.1800,gstin:'29ABCDE4747F1Z2',years:9,rating:4.0,rc:94,status:'VERIFIED',desc:'Hardware and building materials near KGF area.',hours:'Mon–Sat 8am–7pm'},
    {code:'ATPS-LKH01',owner:'Lokesh Gowda',shop:'Lakshmi Krupa Hardware',mobile:'9900011147',locality:'Tumkur',city:'Tumakuru',lat:13.3379,lng:77.1010,gstin:'29ABCDE4848F1Z4',years:13,rating:4.2,rc:138,status:'PENDING_VERIFICATION',desc:'Complete hardware and building materials in Tumkur.',hours:'Mon–Sat 8:30am–7pm'},
    {code:'ATPS-DGH01',owner:'Devananda Gowda',shop:'Davangere General Hardware',mobile:'9900011148',locality:'PJ Extension',city:'Davanagere',lat:14.4663,lng:75.9221,gstin:'29ABCDE4949F1Z6',years:18,rating:4.3,rc:201,status:'VERIFIED',desc:'Complete hardware and industrial supplies for Davangere.',hours:'Mon–Sat 8am–8pm'},
    {code:'ATPS-BTH01',owner:'Tukaram Reddy',shop:'Bellary Tools Hub',mobile:'9900011149',locality:'Market Road',city:'Ballari',lat:15.1394,lng:76.9214,gstin:'29ABCDE5050F1Z8',years:14,rating:4.1,rc:147,status:'VERIFIED',desc:'Tools, hardware and industrial materials in Ballari.',hours:'Mon–Sat 8am–7:30pm'},
    {code:'ATPS-BHE01',owner:'Prakashchandra Murthy',shop:'Belgaum Hardware Enterprises',mobile:'9900011150',locality:'Angol',city:'Belagavi',lat:15.8497,lng:74.4977,gstin:'29ABCDE5151F1Z0',years:21,rating:4.4,rc:245,status:'VERIFIED',desc:'North Karnataka premier hardware distributor. Wholesale and retail.',hours:'Mon–Sat 8am–7pm'},
  ];

  const sidMap = {};
  for (const s of SELLERS) {
    const uid = uuid(); const sid = uuid();
    iUser.run(uid, 'SELLER', s.owner, `${s.code.toLowerCase()}@atprice.demo`, s.mobile, DEMO_HASH);
    iSeller.run({id:sid,code:s.code,uid,owner:s.owner,mobile:s.mobile,email:`${s.code.toLowerCase()}@atprice.demo`,
      shop:s.shop,gstin:s.gstin||null,type:'RETAILER',years:s.years,phone:s.mobile,wa:s.mobile,
      desc:s.desc,hours:s.hours,status:s.status,rating:s.rating,rc:s.rc});
    iLoc.run(uuid(),sid,`${s.shop}, Main Road`,s.locality,s.city,'Udupi','Karnataka','576213',s.lat,s.lng);
    sidMap[s.code] = sid;
  }
  console.log(`  ${SELLERS.length} sellers seeded`);

  // Helper shorthand
  const S = (code) => sidMap[code];
  const C = (name) => catIdMap[name];

  // ── Products + Listings ─────────────────────────────────────────────────
  const iProd = db.prepare(`INSERT INTO products (id,name,brand,model,sku,category_id,description,specifications,unit,pack_size,mrp,manufacturer,warranty,keywords,is_demo_data)
    VALUES (@id,@name,@brand,@model,@sku,@cat,@desc,@specs,@unit,@pack,@mrp,@mfr,@warranty,@kw,1)`);
  const iImg = db.prepare('INSERT INTO product_images (id,product_id,url,is_primary) VALUES (?,?,?,1)');
  const iList = db.prepare(`INSERT OR IGNORE INTO seller_listings (id,seller_id,product_id,price,mrp,stock_quantity,minimum_order_qty,unit,availability,delivery_available,pickup_available,status,source,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

  function avail(q) { return q===0?'OUT_OF_STOCK':q<=5?'LOW_STOCK':'IN_STOCK'; }
  function addProduct(p) {
    const pid = uuid();
    iProd.run({id:pid,name:p.name,brand:p.brand||null,model:p.model||null,sku:p.sku||null,
      cat:p.cat,desc:p.desc||p.name,specs:JSON.stringify(p.specs||{}),unit:p.unit||'piece',
      pack:p.pack||null,mrp:p.mrp||null,mfr:p.mfr||p.brand||null,warranty:p.warranty||null,kw:p.kw||null});
    if(p.img) iImg.run(uuid(),pid,p.img);
    for(const l of (p.listings||[])){
      const seller=sidMap[l.s]; if(!seller) continue;
      iList.run(uuid(),seller,pid,l.p,p.mrp,l.q??20,l.moq??1,p.unit||'piece',avail(l.q??20),l.del??1,1,'ACTIVE','MANUAL',ago(l.m??30));
    }
    return pid;
  }

  // Pexels image pool (construction/hardware themed)
  const IMGS = {
    cement: 'https://images.pexels.com/photos/6474201/pexels-photo-6474201.jpeg?auto=compress&cs=tinysrgb&w=900',
    pipe: 'https://images.pexels.com/photos/29301874/pexels-photo-29301874.jpeg?auto=compress&cs=tinysrgb&w=900',
    electric: 'https://images.pexels.com/photos/6349402/pexels-photo-6349402.jpeg?auto=compress&cs=tinysrgb&w=900',
    grinder: 'https://images.pexels.com/photos/4792496/pexels-photo-4792496.jpeg?auto=compress&cs=tinysrgb&w=900',
    paint: 'https://images.pexels.com/photos/3615721/pexels-photo-3615721.jpeg?auto=compress&cs=tinysrgb&w=900',
    steel: 'https://images.pexels.com/photos/10059198/pexels-photo-10059198.jpeg?auto=compress&cs=tinysrgb&w=900',
    tools: 'https://images.pexels.com/photos/1249611/pexels-photo-1249611.jpeg?auto=compress&cs=tinysrgb&w=900',
    drill: 'https://images.pexels.com/photos/4792733/pexels-photo-4792733.jpeg?auto=compress&cs=tinysrgb&w=900',
    tile: 'https://images.pexels.com/photos/5824883/pexels-photo-5824883.jpeg?auto=compress&cs=tinysrgb&w=900',
    safety: 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=900',
    fan: 'https://images.pexels.com/photos/6980537/pexels-photo-6980537.jpeg?auto=compress&cs=tinysrgb&w=900',
    hardware: 'https://images.pexels.com/photos/210881/pexels-photo-210881.jpeg?auto=compress&cs=tinysrgb&w=900',
    welding: 'https://images.pexels.com/photos/3680949/pexels-photo-3680949.jpeg?auto=compress&cs=tinysrgb&w=900',
    adhesive: 'https://images.pexels.com/photos/5825556/pexels-photo-5825556.jpeg?auto=compress&cs=tinysrgb&w=900',
    garden: 'https://images.pexels.com/photos/1453499/pexels-photo-1453499.jpeg?auto=compress&cs=tinysrgb&w=900',
    pump: 'https://images.pexels.com/photos/4792496/pexels-photo-4792496.jpeg?auto=compress&cs=tinysrgb&w=900',
    door: 'https://images.pexels.com/photos/277559/pexels-photo-277559.jpeg?auto=compress&cs=tinysrgb&w=900',
    glass: 'https://images.pexels.com/photos/1029599/pexels-photo-1029599.jpeg?auto=compress&cs=tinysrgb&w=900',
    lock: 'https://images.pexels.com/photos/60504/security-protection-anti-virus-software-60504.jpeg?auto=compress&cs=tinysrgb&w=900',
  };

  const PRODUCTS = [
    // ── BUILDING MATERIALS ────────────────────────────────────────────────
    {name:'UltraTech OPC 53 Grade Cement 50kg',brand:'UltraTech',sku:'UTC-OPC53-50',cat:C('Building Materials'),
      desc:'Premium OPC 53 Grade cement. High early strength ideal for RCC, precast and prestressed concrete.',
      specs:{grade:'OPC 53',weight:'50 kg',standard:'IS 12269:2013',initial_setting:'30 min',compressive_strength:'53 MPa'},
      unit:'bag',mrp:420,mfr:'UltraTech Cement Ltd',kw:'cement ultratech opc 53 construction concrete',img:IMGS.cement,
      listings:[{s:'ATPS-SKH01',p:390,q:40,m:12},{s:'ATPS-BSD01',p:398,q:25,m:31},{s:'ATPS-UBM01',p:405,q:100,m:8},{s:'ATPS-PBH01',p:410,q:15,m:45},{s:'ATPS-BHW01',p:412,q:200,m:60}]},

    {name:'ACC OPC 43 Grade Cement 50kg',brand:'ACC',sku:'ACC-OPC43-50',cat:C('Building Materials'),
      desc:'ACC OPC 43 grade cement. Suitable for general construction, brickwork and plastering.',
      specs:{grade:'OPC 43',weight:'50 kg',standard:'IS 8112:2013'},
      unit:'bag',mrp:400,mfr:'ACC Cement Ltd',kw:'cement acc opc 43 construction plaster',img:IMGS.cement,
      listings:[{s:'ATPS-SKH01',p:375,q:60,m:20},{s:'ATPS-UBM01',p:382,q:80,m:15},{s:'ATPS-MNH01',p:388,q:30,m:35},{s:'ATPS-NHP01',p:392,q:50,m:50}]},

    {name:'Dalmia PPC Cement 50kg',brand:'Dalmia',sku:'DAL-PPC-50',cat:C('Building Materials'),
      desc:'Portland Pozzolana Cement. Better workability and durability for general construction.',
      specs:{grade:'PPC',weight:'50 kg',standard:'IS 1489:2015'},
      unit:'bag',mrp:410,mfr:'Dalmia Cement',kw:'cement dalmia ppc portland construction',img:IMGS.cement,
      listings:[{s:'ATPS-UBM01',p:385,q:50,m:25},{s:'ATPS-KHE01',p:392,q:30,m:40},{s:'ATPS-RKH01',p:398,q:20,m:60}]},

    {name:'UltraTech PPC Cement 50kg',brand:'UltraTech',sku:'UTC-PPC-50',cat:C('Building Materials'),
      desc:'UltraTech Portland Pozzolana Cement. Excellent workability and long-term strength.',
      specs:{grade:'PPC',weight:'50 kg',standard:'IS 1489:2015'},
      unit:'bag',mrp:415,mfr:'UltraTech Cement Ltd',kw:'cement ultratech ppc portland workability',img:IMGS.cement,
      listings:[{s:'ATPS-SKH01',p:388,q:70,m:10},{s:'ATPS-UBM01',p:395,q:120,m:5},{s:'ATPS-BSD01',p:400,q:40,m:22}]},

    {name:'Fosroc Waterproofing Compound 1kg',brand:'Fosroc',sku:'FOS-WP-1KG',cat:C('Building Materials'),
      desc:'Waterproofing admixture for concrete and mortar. Reduces water penetration and permeability.',
      specs:{weight:'1 kg',coverage:'for 50kg cement bag',type:'powder admixture'},
      unit:'kg',mrp:185,mfr:'Fosroc Construction Chemicals',kw:'waterproofing compound fosroc concrete admixture cement',img:IMGS.cement,
      listings:[{s:'ATPS-SKH01',p:165,q:30,m:18},{s:'ATPS-UBM01',p:172,q:50,m:12},{s:'ATPS-BPT01',p:178,q:20,m:30}]},

    {name:'JSW Neolite Wall Putty 20kg',brand:'JSW',sku:'JSW-WP-20',cat:C('Building Materials'),
      desc:'White cement-based wall putty for smooth interior surfaces before painting.',
      specs:{weight:'20 kg',type:'white cement based',coverage:'20–25 sq ft per kg (2 coats)'},
      unit:'bag',mrp:595,mfr:'JSW Cement',kw:'wall putty jsw white cement interior smooth painting',img:IMGS.cement,
      listings:[{s:'ATPS-CHS01',p:548,q:25,m:15},{s:'ATPS-BPT01',p:562,q:15,m:28},{s:'ATPS-SKH01',p:575,q:10,m:45}]},

    // ── PLUMBING & SANITARY ───────────────────────────────────────────────
    {name:'Astral CPVC FlowGuard Plus 1 inch x 3m',brand:'Astral',sku:'AST-CPVC-1X3',cat:C('Plumbing & Sanitary'),
      desc:'CPVC pressure pipe for hot and cold water. NSF certified for potable water.',
      specs:{diameter:'1 inch (25mm)',length:'3 metres',pressure_rating:'SDR 11 / 1.6 MPa',material:'CPVC'},
      unit:'piece',mrp:315,mfr:'Astral Pipes Ltd',kw:'cpvc pipe astral flowguard hot cold water plumbing 1 inch',img:IMGS.pipe,
      listings:[{s:'ATPS-BPC01',p:275,q:60,m:8},{s:'ATPS-SKH01',p:284,q:35,m:22},{s:'ATPS-UPH01',p:291,q:50,m:45},{s:'ATPS-SPP01',p:296,q:40,m:60},{s:'ATPS-SPE01',p:299,q:30,m:90}]},

    {name:'Astral CPVC FlowGuard Plus 3/4 inch x 3m',brand:'Astral',sku:'AST-CPVC-075X3',cat:C('Plumbing & Sanitary'),
      desc:'CPVC pipe 3/4 inch, 3 metre. For hot and cold water piping.',
      specs:{diameter:'3/4 inch (20mm)',length:'3 metres',material:'CPVC'},
      unit:'piece',mrp:225,mfr:'Astral Pipes Ltd',kw:'cpvc pipe astral 3/4 inch plumbing hot cold water',img:IMGS.pipe,
      listings:[{s:'ATPS-BPC01',p:196,q:80,m:10},{s:'ATPS-UPH01',p:204,q:60,m:30},{s:'ATPS-SPE01',p:210,q:45,m:55}]},

    {name:'Astral CPVC Elbow 1 inch',brand:'Astral',sku:'AST-CPVC-EL1',cat:C('Plumbing & Sanitary'),
      desc:'CPVC 90° elbow fitting for 1 inch pipe. For hot and cold water piping systems.',
      specs:{size:'1 inch',angle:'90°',material:'CPVC',connection:'solvent weld'},
      unit:'piece',mrp:48,mfr:'Astral Pipes Ltd',kw:'cpvc elbow astral 1 inch fitting plumbing',img:IMGS.pipe,
      listings:[{s:'ATPS-BPC01',p:38,q:200,m:12},{s:'ATPS-SPE01',p:42,q:150,m:25},{s:'ATPS-UPH01',p:44,q:100,m:40}]},

    {name:'Astral CPVC Tee 1 inch',brand:'Astral',sku:'AST-CPVC-TEE1',cat:C('Plumbing & Sanitary'),
      desc:'CPVC T-fitting for 1 inch pipe. For hot and cold water plumbing.',
      specs:{size:'1 inch',type:'equal tee',material:'CPVC'},
      unit:'piece',mrp:55,mfr:'Astral Pipes Ltd',kw:'cpvc tee astral 1 inch fitting plumbing',img:IMGS.pipe,
      listings:[{s:'ATPS-BPC01',p:44,q:150,m:15},{s:'ATPS-UPH01',p:48,q:100,m:35},{s:'ATPS-SPP01',p:50,q:80,m:50}]},

    {name:'Finolex PVC Pipe 4 inch x 6m (Class 6)',brand:'Finolex',sku:'FNX-PVC-4X6',cat:C('Plumbing & Sanitary'),
      desc:'Finolex PVC drainage/sewage pipe. 4 inch diameter, 6 metre length, Class 6.',
      specs:{diameter:'4 inch (110mm)',length:'6 metres',class:'Class 6',standard:'IS 4985'},
      unit:'piece',mrp:1050,mfr:'Finolex Industries',kw:'pvc pipe finolex 4 inch drainage sewage plumbing',img:IMGS.pipe,
      listings:[{s:'ATPS-UPH01',p:935,q:20,m:18},{s:'ATPS-BPC01',p:958,q:15,m:30},{s:'ATPS-KPC01',p:978,q:10,m:45}]},

    {name:'Ashirvad CPVC Pipe 1/2 inch x 3m',brand:'Ashirvad',sku:'ASH-CPVC-05X3',cat:C('Plumbing & Sanitary'),
      desc:'Ashirvad CPVC pipe for domestic hot and cold water plumbing. 1/2 inch.',
      specs:{diameter:'1/2 inch (15mm)',length:'3 metres',material:'CPVC'},
      unit:'piece',mrp:145,mfr:'Ashirvad Pipes',kw:'ashirvad cpvc pipe 1/2 inch half inch plumbing hot cold',img:IMGS.pipe,
      listings:[{s:'ATPS-BPC01',p:128,q:100,m:12},{s:'ATPS-SPE01',p:133,q:80,m:25},{s:'ATPS-UPH01',p:137,q:60,m:40}]},

    {name:'Jaquar Ball Valve 1 inch (Brass)',brand:'Jaquar',sku:'JAQ-BV-1IN',cat:C('Plumbing & Sanitary'),
      desc:'Heavy duty brass ball valve, 1 inch BSP. For water supply shut-off.',
      specs:{size:'1 inch',material:'brass',connection:'BSP thread',body:'forged brass'},
      unit:'piece',mrp:485,mfr:'Jaquar Group',kw:'ball valve jaquar brass 1 inch plumbing water shut-off',img:IMGS.pipe,
      listings:[{s:'ATPS-BPC01',p:418,q:30,m:20},{s:'ATPS-UPH01',p:435,q:20,m:35},{s:'ATPS-UES01',p:448,q:15,m:55}]},

    {name:'Supreme PVC Ball Valve 3/4 inch',brand:'Supreme',sku:'SUP-BV-075',cat:C('Plumbing & Sanitary'),
      desc:'PVC ball valve 3/4 inch. Economy choice for domestic plumbing.',
      specs:{size:'3/4 inch',material:'PVC',type:'ball valve'},
      unit:'piece',mrp:165,mfr:'Supreme Industries',kw:'ball valve supreme pvc 3/4 inch plumbing economy',img:IMGS.pipe,
      listings:[{s:'ATPS-BPC01',p:142,q:50,m:15},{s:'ATPS-SPE01',p:148,q:40,m:28},{s:'ATPS-RKH01',p:152,q:30,m:45}]},

    {name:'PTFE Teflon Thread Seal Tape 12mm',brand:'Generic',sku:'PTFE-12MM',cat:C('Plumbing & Sanitary'),
      desc:'PTFE thread seal tape for pipe joints. Prevents leaks. 12mm width, 12m length.',
      specs:{width:'12mm',length:'12 metres',material:'PTFE/Teflon'},
      unit:'roll',mrp:28,mfr:'Various',kw:'ptfe teflon tape thread seal plumbing pipe joint',img:IMGS.pipe,
      listings:[{s:'ATPS-BPC01',p:18,q:500,m:5},{s:'ATPS-SKH01',p:20,q:300,m:10},{s:'ATPS-UPH01',p:22,q:200,m:20}]},

    // ── ELECTRICAL ────────────────────────────────────────────────────────
    {name:'Havells 16A 1-Way Modular Switch',brand:'Havells',sku:'HAV-SW16-1W',cat:C('Electrical'),
      desc:'16A one-way modular switch. Crabtree/Coral/Reo range. White plate.',
      specs:{rating:'16A/250V',type:'1-way modular',color:'white',range:'Coral'},
      unit:'piece',mrp:148,mfr:'Havells India Ltd',kw:'havells switch 16a modular 1-way electrical domestic',img:IMGS.electric,
      listings:[{s:'ATPS-PPE01',p:128,q:200,m:15},{s:'ATPS-BEL01',p:134,q:90,m:42},{s:'ATPS-SKH01',p:138,q:30,m:60},{s:'ATPS-UES01',p:141,q:50,m:75}]},

    {name:'Legrand Myrius 16A 1-Way Switch',brand:'Legrand',sku:'LEG-MYR-16-1W',cat:C('Electrical'),
      desc:'Legrand Myrius modular switch 16A, 1-way. Premium European design.',
      specs:{rating:'16A/250V',type:'1-way',range:'Myrius',color:'white'},
      unit:'piece',mrp:195,mfr:'Legrand India',kw:'legrand myrius switch 16a modular premium electrical',img:IMGS.electric,
      listings:[{s:'ATPS-PPE01',p:168,q:100,m:18},{s:'ATPS-UES01',p:175,q:60,m:35},{s:'ATPS-BEL01',p:180,q:40,m:55}]},

    {name:'Anchor Roma 6A Modular Switch',brand:'Anchor',sku:'ANC-ROM-6A',cat:C('Electrical'),
      desc:'Anchor Roma classic modular switch 6A. Economy range for general domestic use.',
      specs:{rating:'6A/250V',type:'1-way modular',range:'Roma Classic'},
      unit:'piece',mrp:72,mfr:'Panasonic/Anchor Electricals',kw:'anchor roma switch 6a modular economy domestic electrical',img:IMGS.electric,
      listings:[{s:'ATPS-BEL01',p:58,q:300,m:12},{s:'ATPS-SKH01',p:62,q:100,m:25},{s:'ATPS-UES01',p:65,q:80,m:40}]},

    {name:'Polycab 1.5 sq mm FR Wire 90m (Red)',brand:'Polycab',sku:'POL-FR15-90R',cat:C('Electrical'),
      desc:'Polycab FRLSH copper wire 1.5 sq mm, 90 metre coil. Fire retardant low smoke halogen.',
      specs:{size:'1.5 sq mm',length:'90 metres',type:'FRLSH',conductor:'annealed copper',color:'red'},
      unit:'coil',mrp:1150,mfr:'Polycab India Ltd',kw:'polycab wire 1.5 sqmm copper frlsh fire retardant electrical domestic',img:IMGS.electric,
      listings:[{s:'ATPS-PPE01',p:1040,q:25,m:20},{s:'ATPS-BEL01',p:1068,q:18,m:38},{s:'ATPS-UES01',p:1090,q:12,m:55},{s:'ATPS-SKH01',p:1105,q:8,m:70}]},

    {name:'Polycab 2.5 sq mm FR Wire 90m (Red)',brand:'Polycab',sku:'POL-FR25-90R',cat:C('Electrical'),
      desc:'Polycab FRLSH copper wire 2.5 sq mm, 90 metre coil.',
      specs:{size:'2.5 sq mm',length:'90 metres',type:'FRLSH',conductor:'annealed copper'},
      unit:'coil',mrp:1750,mfr:'Polycab India Ltd',kw:'polycab wire 2.5 sqmm copper frlsh electrical domestic',img:IMGS.electric,
      listings:[{s:'ATPS-PPE01',p:1580,q:20,m:22},{s:'ATPS-BEL01',p:1620,q:15,m:40},{s:'ATPS-SKH01',p:1660,q:10,m:65}]},

    {name:'Finolex 4 sq mm FR Wire 90m',brand:'Finolex',sku:'FNX-FR4-90',cat:C('Electrical'),
      desc:'Finolex FRLSH copper wire 4 sq mm, 90 metre coil. For heavy loads.',
      specs:{size:'4 sq mm',length:'90 metres',type:'FR',conductor:'annealed copper'},
      unit:'coil',mrp:2850,mfr:'Finolex Cables',kw:'finolex wire 4 sqmm copper fr electrical heavy load',img:IMGS.electric,
      listings:[{s:'ATPS-PPE01',p:2580,q:15,m:25},{s:'ATPS-BEL01',p:2640,q:10,m:45},{s:'ATPS-UES01',p:2700,q:8,m:60}]},

    {name:'Legrand 32A MCB Single Pole C Curve',brand:'Legrand',sku:'LEG-MCB-32A',cat:C('Electrical'),
      desc:'Legrand MCB 32A single pole C curve. For branch circuit protection.',
      specs:{rating:'32A',poles:'1 pole',curve:'C',breaking_capacity:'6kA',standard:'IS/IEC 60898'},
      unit:'piece',mrp:485,mfr:'Legrand India',kw:'mcb legrand 32a single pole breaker circuit protection electrical',img:IMGS.electric,
      listings:[{s:'ATPS-PPE01',p:418,q:30,m:18},{s:'ATPS-UES01',p:435,q:20,m:32},{s:'ATPS-BEL01',p:450,q:15,m:48}]},

    {name:'Havells MCB 16A Single Pole B Curve',brand:'Havells',sku:'HAV-MCB-16-1P',cat:C('Electrical'),
      desc:'Havells MCB 16A single pole B curve. For lighting and general purpose.',
      specs:{rating:'16A',poles:'1 pole',curve:'B',breaking_capacity:'6kA'},
      unit:'piece',mrp:348,mfr:'Havells India Ltd',kw:'mcb havells 16a breaker circuit protection lighting electrical',img:IMGS.electric,
      listings:[{s:'ATPS-PPE01',p:298,q:50,m:15},{s:'ATPS-BEL01',p:312,q:30,m:30},{s:'ATPS-UES01',p:322,q:20,m:50}]},

    {name:'Crompton Greaves Ceiling Fan 1200mm',brand:'Crompton',sku:'CRO-CF-1200',cat:C('Electrical'),
      desc:'Crompton Aura ceiling fan 1200mm sweep. 380 RPM, energy efficient.',
      specs:{sweep:'1200mm',speed:'380 RPM',power:'75W',blades:'3',airflow:'215 CMM'},
      unit:'piece',mrp:1850,mfr:'Crompton Greaves Consumer',warranty:'2 years',kw:'ceiling fan crompton 1200mm sweep energy efficient',img:IMGS.fan,
      listings:[{s:'ATPS-PPE01',p:1590,q:15,m:20},{s:'ATPS-BEL01',p:1640,q:10,m:38},{s:'ATPS-SKH01',p:1680,q:5,m:55}]},

    {name:'Orient Electric 48W LED Panel 600x600',brand:'Orient',sku:'ORI-LED-48W-600',cat:C('Electrical'),
      desc:'Orient 48W LED flat panel 600x600mm. Cool white 6500K. For false ceilings.',
      specs:{power:'48W',size:'600x600mm',color_temp:'6500K cool white',lumens:'4800 lm',voltage:'220V'},
      unit:'piece',mrp:1250,mfr:'Orient Electric',warranty:'2 years',kw:'led panel orient 48w 600x600 flat ceiling light electrical',img:IMGS.electric,
      listings:[{s:'ATPS-PPE01',p:1080,q:20,m:22},{s:'ATPS-BEL01',p:1110,q:15,m:40},{s:'ATPS-UES01',p:1135,q:10,m:58}]},

    // ── TOOLS & MACHINERY ─────────────────────────────────────────────────
    {name:'Bosch Professional Angle Grinder 4 inch GWS 600',brand:'Bosch',model:'GWS 600',sku:'BSH-GWS600',cat:C('Tools & Machinery'),
      desc:'Bosch Professional 4-inch angle grinder. 670W motor, 11,000 RPM. For cutting and grinding.',
      specs:{power:'670W',disc_size:'100mm (4 inch)',speed:'11000 RPM',weight:'1.7 kg',voltage:'220V'},
      unit:'piece',mrp:3750,mfr:'Bosch Power Tools',warranty:'1 year',kw:'bosch angle grinder 4 inch gws 600 power tool grinding cutting',img:IMGS.grinder,
      listings:[{s:'ATPS-TWD01',p:3199,q:12,m:18},{s:'ATPS-BTM01',p:3275,q:7,m:28},{s:'ATPS-SKH01',p:3350,q:3,m:60},{s:'ATPS-MTE01',p:3420,q:5,m:45},{s:'ATPS-KTH01',p:3490,q:4,m:72}]},

    {name:'Bosch Professional Angle Grinder 5 inch GWS 750',brand:'Bosch',model:'GWS 750',sku:'BSH-GWS750',cat:C('Tools & Machinery'),
      desc:'Bosch Professional 5-inch angle grinder. 750W motor.',
      specs:{power:'750W',disc_size:'125mm (5 inch)',speed:'11000 RPM',weight:'2.0 kg'},
      unit:'piece',mrp:4350,mfr:'Bosch Power Tools',warranty:'1 year',kw:'bosch angle grinder 5 inch gws 750 power tool',img:IMGS.grinder,
      listings:[{s:'ATPS-TWD01',p:3750,q:8,m:20},{s:'ATPS-MTE01',p:3820,q:5,m:35},{s:'ATPS-NTE01',p:3900,q:6,m:50}]},

    {name:'Makita Angle Grinder 4 inch 9523NB',brand:'Makita',model:'9523NB',sku:'MAK-9523NB',cat:C('Tools & Machinery'),
      desc:'Makita 4-inch angle grinder. 720W. Compact and lightweight design.',
      specs:{power:'720W',disc_size:'100mm (4 inch)',speed:'11000 RPM',weight:'1.8 kg'},
      unit:'piece',mrp:4200,mfr:'Makita India',warranty:'1 year',kw:'makita angle grinder 4 inch 9523nb power tool grinding',img:IMGS.grinder,
      listings:[{s:'ATPS-TWD01',p:3690,q:6,m:22},{s:'ATPS-MTE01',p:3750,q:4,m:38},{s:'ATPS-NTE01',p:3820,q:5,m:55}]},

    {name:'Bosch Professional Drill GSB 13 RE',brand:'Bosch',model:'GSB 13 RE',sku:'BSH-GSB13',cat:C('Tools & Machinery'),
      desc:'Bosch 13mm impact drill. 600W, 2 speed. For drilling in concrete, wood and metal.',
      specs:{power:'600W',chuck:'13mm keyless',speed:'0-2800 RPM',torque:'7.5 Nm',voltage:'220V'},
      unit:'piece',mrp:5200,mfr:'Bosch Power Tools',warranty:'1 year',kw:'bosch drill gsb 13 re impact 600w professional power tool',img:IMGS.drill,
      listings:[{s:'ATPS-TWD01',p:4450,q:8,m:15},{s:'ATPS-BTM01',p:4580,q:5,m:28},{s:'ATPS-MTE01',p:4680,q:4,m:42}]},

    {name:'Makita Corded Drill 10mm HP1620',brand:'Makita',model:'HP1620',sku:'MAK-HP1620',cat:C('Tools & Machinery'),
      desc:'Makita 10mm two-speed hammer drill. 570W. Variable speed with reverse.',
      specs:{power:'570W',chuck:'10mm',speed:'0-2800 RPM',voltage:'220V'},
      unit:'piece',mrp:4500,mfr:'Makita India',warranty:'1 year',kw:'makita drill 10mm hp1620 hammer power tool wood concrete',img:IMGS.drill,
      listings:[{s:'ATPS-TWD01',p:3880,q:6,m:18},{s:'ATPS-GTH01',p:3950,q:4,m:32},{s:'ATPS-NTE01',p:4020,q:5,m:48}]},

    {name:'Stanley Tool Set 65 Piece',brand:'Stanley',sku:'STN-TS65',cat:C('Tools & Machinery'),
      desc:'Stanley 65-piece tool set with carrying bag. Complete home/workshop kit.',
      specs:{pieces:'65',includes:'hammer, screwdrivers, pliers, spanners, tape',case:'blow-mould'},
      unit:'set',mrp:2850,mfr:'Stanley Black & Decker',warranty:'1 year',kw:'stanley tool set 65 piece kit screwdriver plier spanner hammer',img:IMGS.tools,
      listings:[{s:'ATPS-TWD01',p:2420,q:10,m:25},{s:'ATPS-BTM01',p:2490,q:7,m:40},{s:'ATPS-GTH01',p:2560,q:5,m:55}]},

    {name:'Taparia Combination Spanner Set 8pc (6–22mm)',brand:'Taparia',sku:'TAP-CSS8',cat:C('Tools & Machinery'),
      desc:'Taparia combination spanner set 8 pieces. Sizes 6, 8, 10, 12, 13, 14, 17, 22mm. Drop forged.',
      specs:{pieces:'8',sizes:'6,8,10,12,13,14,17,22mm',material:'drop forged alloy steel',finish:'chrome vanadium'},
      unit:'set',mrp:860,mfr:'Taparia Tools',kw:'taparia spanner set combination 8 piece drop forged',img:IMGS.tools,
      listings:[{s:'ATPS-TWD01',p:748,q:20,m:15},{s:'ATPS-BTM01',p:780,q:15,m:28},{s:'ATPS-GTH01',p:805,q:10,m:42}]},

    {name:'Taparia Screwdriver Set 6 Piece',brand:'Taparia',sku:'TAP-SD6',cat:C('Tools & Machinery'),
      desc:'Taparia screwdriver set 6 piece. 3 flathead + 3 Phillips. Ergonomic handle.',
      specs:{pieces:'6',types:'3 flathead, 3 Phillips',handle:'ergonomic bi-material'},
      unit:'set',mrp:380,mfr:'Taparia Tools',kw:'taparia screwdriver set 6 piece flathead phillips hand tool',img:IMGS.tools,
      listings:[{s:'ATPS-TWD01',p:325,q:30,m:12},{s:'ATPS-BTM01',p:338,q:20,m:25},{s:'ATPS-SKH01',p:350,q:15,m:40}]},

    {name:'Grinding Disc 4 inch (100mm) Pack of 10',brand:'Norton',sku:'NOR-GD100-10',cat:C('Tools & Machinery'),
      desc:'Norton grinding disc 100mm for 4-inch grinders. For metal grinding. A24RBF grade.',
      specs:{diameter:'100mm (4 inch)',thickness:'6mm',bore:'16mm',grade:'A24RBF',pack:'10 pieces'},
      unit:'pack',mrp:320,mfr:'Saint-Gobain/Norton',kw:'grinding disc 4 inch 100mm norton metal pack',img:IMGS.grinder,
      listings:[{s:'ATPS-TWD01',p:268,q:50,m:10},{s:'ATPS-BTM01',p:278,q:40,m:20},{s:'ATPS-UWS01',p:285,q:30,m:35}]},

    {name:'Cutting Disc 4 inch (105mm) Pack of 10',brand:'Bosch',sku:'BSH-CD105-10',cat:C('Tools & Machinery'),
      desc:'Bosch cutting disc 105mm for 4-inch grinders. Thin cut for steel and metal.',
      specs:{diameter:'105mm',thickness:'1.2mm',bore:'16mm',pack:'10 pieces'},
      unit:'pack',mrp:380,mfr:'Bosch',kw:'cutting disc 4 inch 105mm bosch metal thin cut pack',img:IMGS.grinder,
      listings:[{s:'ATPS-TWD01',p:322,q:40,m:12},{s:'ATPS-UWS01',p:335,q:30,m:25},{s:'ATPS-KTH01',p:348,q:25,m:40}]},

    {name:'Stanley 5m Measuring Tape',brand:'Stanley',sku:'STN-MT5M',cat:C('Tools & Machinery'),
      desc:'Stanley FatMax 5 metre measuring tape. Magnetic tip, Mylar-coated blade.',
      specs:{length:'5 metres',blade_width:'25mm',material:'Mylar-coated steel',locking:'auto lock'},
      unit:'piece',mrp:550,mfr:'Stanley',warranty:'lifetime',kw:'stanley measuring tape 5m fatmax steel blade',img:IMGS.tools,
      listings:[{s:'ATPS-TWD01',p:468,q:25,m:15},{s:'ATPS-BTM01',p:488,q:18,m:28},{s:'ATPS-SKH01',p:505,q:10,m:45}]},

    {name:'Claw Hammer 500g Wooden Handle',brand:'Taparia',sku:'TAP-CH500',cat:C('Tools & Machinery'),
      desc:'Taparia claw hammer 500g. Forged steel head, wooden handle. For nailing and demolition.',
      specs:{weight:'500g',head:'drop forged steel',handle:'seasoned wood'},
      unit:'piece',mrp:285,mfr:'Taparia Tools',kw:'hammer claw taparia 500g wooden handle nail demolition',img:IMGS.tools,
      listings:[{s:'ATPS-BTM01',p:238,q:30,m:10},{s:'ATPS-TWD01',p:248,q:20,m:22},{s:'ATPS-SKH01',p:258,q:15,m:38}]},

    // ── PAINTS & CHEMICALS ────────────────────────────────────────────────
    {name:'Asian Paints Apex Exterior Emulsion 20L',brand:'Asian Paints',sku:'AP-APEX-20L',cat:C('Paints & Chemicals'),
      desc:'Asian Paints Apex premium exterior emulsion. Weather and UV resistant. Suitable for all exterior surfaces.',
      specs:{volume:'20 litres',type:'exterior emulsion',coverage:'60–80 sq ft per litre (2 coats)',dry_time:'2 hours touch dry'},
      unit:'can',mrp:4850,mfr:'Asian Paints Ltd',kw:'asian paints apex exterior emulsion 20 litre weathercoat paint',img:IMGS.paint,
      listings:[{s:'ATPS-CHS01',p:4280,q:20,m:20},{s:'ATPS-BPT01',p:4380,q:12,m:35},{s:'ATPS-MYP01',p:4450,q:8,m:50}]},

    {name:'Asian Paints Interior Emulsion Tractor 20L',brand:'Asian Paints',sku:'AP-TRAC-20L',cat:C('Paints & Chemicals'),
      desc:'Asian Paints Tractor interior emulsion. Economical and durable for interior walls.',
      specs:{volume:'20 litres',type:'interior emulsion',coverage:'80–100 sq ft per litre'},
      unit:'can',mrp:2250,mfr:'Asian Paints Ltd',kw:'asian paints tractor interior emulsion 20 litre wall paint',img:IMGS.paint,
      listings:[{s:'ATPS-CHS01',p:1980,q:25,m:18},{s:'ATPS-BPT01',p:2050,q:15,m:32},{s:'ATPS-GLP01',p:2100,q:10,m:48}]},

    {name:'Berger WeatherCoat Exterior 20L',brand:'Berger',sku:'BER-WC-20L',cat:C('Paints & Chemicals'),
      desc:'Berger WeatherCoat smooth exterior emulsion. 10-year warranty against peeling.',
      specs:{volume:'20 litres',type:'exterior emulsion',coverage:'55–65 sq ft per litre',finish:'smooth'},
      unit:'can',mrp:5200,mfr:'Berger Paints',warranty:'10 year surface warranty',kw:'berger weathercoat exterior paint 20 litre weather proof',img:IMGS.paint,
      listings:[{s:'ATPS-CHS01',p:4580,q:15,m:22},{s:'ATPS-GLP01',p:4680,q:10,m:38},{s:'ATPS-MYP01',p:4750,q:8,m:55}]},

    {name:'Nerolac Impressions Exterior Paint 20L',brand:'Nerolac',sku:'NER-IMP-20L',cat:C('Paints & Chemicals'),
      desc:'Nerolac Impressions premium exterior paint. Advanced weather protection.',
      specs:{volume:'20 litres',type:'exterior emulsion',coverage:'60–80 sq ft per litre'},
      unit:'can',mrp:4950,mfr:'Kansai Nerolac Paints',kw:'nerolac impressions exterior paint 20 litre weather',img:IMGS.paint,
      listings:[{s:'ATPS-CHS01',p:4350,q:12,m:25},{s:'ATPS-BPT01',p:4450,q:8,m:40},{s:'ATPS-GLP01',p:4520,q:6,m:58}]},

    {name:'Berger Bison Acrylic Distemper 5L',brand:'Berger',sku:'BER-BIS-5L',cat:C('Paints & Chemicals'),
      desc:'Berger Bison acrylic distemper. Economy interior finish. Washable and durable.',
      specs:{volume:'5 litres',type:'acrylic distemper',coverage:'100–120 sq ft per litre'},
      unit:'can',mrp:680,mfr:'Berger Paints',kw:'berger bison distemper 5 litre interior economy washable',img:IMGS.paint,
      listings:[{s:'ATPS-BPT01',p:592,q:30,m:15},{s:'ATPS-CHS01',p:612,q:20,m:28},{s:'ATPS-GLP01',p:628,q:15,m:45}]},

    {name:'Dr. Fixit Pidiproof LW+ Waterproofing 1L',brand:'Dr. Fixit',sku:'DRF-LW1-1L',cat:C('Paints & Chemicals'),
      desc:'Dr. Fixit Pidiproof LW+ waterproofing admixture. For concrete and mortar. 1 litre.',
      specs:{volume:'1 litre',type:'liquid waterproofing admixture',coverage:'for 50kg cement bag'},
      unit:'litre',mrp:275,mfr:'Pidilite Industries',kw:'dr fixit pidiproof waterproofing admixture concrete moisture',img:IMGS.paint,
      listings:[{s:'ATPS-BPT01',p:238,q:40,m:18},{s:'ATPS-CHS01',p:248,q:30,m:30},{s:'ATPS-SKH01',p:258,q:20,m:45}]},

    // ── STEEL & METAL ─────────────────────────────────────────────────────
    {name:'JSW TMT Bar 12mm Fe-500D 12m',brand:'JSW',sku:'JSW-TMT12-12M',cat:C('Steel & Metal'),
      desc:'JSW Neosteel 550D TMT bar 12mm, Fe-500D grade. 12m length. Superior earthquake resistance.',
      specs:{diameter:'12mm',grade:'Fe-500D',length:'12 metres',rib_pattern:'crescent shaped',standard:'IS 1786:2008'},
      unit:'piece',mrp:78,mfr:'JSW Steel Ltd',kw:'jsw tmt bar 12mm fe500d steel reinforcement rcc construction',img:IMGS.steel,
      listings:[{s:'ATPS-CST01',p:68,q:500,m:10},{s:'ATPS-BSD01',p:70,q:300,m:26},{s:'ATPS-UST01',p:72,q:200,m:40},{s:'ATPS-SKH01',p:74,q:100,m:60}]},

    {name:'Tata Tiscon TMT Bar 12mm 12m',brand:'Tata',sku:'TAT-TMT12-12M',cat:C('Steel & Metal'),
      desc:'Tata Tiscon 500SD TMT bar 12mm, 12m length. Country most trusted TMT brand.',
      specs:{diameter:'12mm',grade:'Fe-500D',length:'12 metres',standard:'IS 1786'},
      unit:'piece',mrp:80,mfr:'Tata Steel Ltd',kw:'tata tiscon tmt bar 12mm steel reinforcement rcc concrete',img:IMGS.steel,
      listings:[{s:'ATPS-CST01',p:70,q:400,m:12},{s:'ATPS-BSD01',p:72,q:250,m:28},{s:'ATPS-UBM01',p:75,q:150,m:42}]},

    {name:'JSW TMT Bar 8mm Fe-500D 12m',brand:'JSW',sku:'JSW-TMT8-12M',cat:C('Steel & Metal'),
      desc:'JSW Neosteel 8mm TMT bar, Fe-500D grade, 12m length.',
      specs:{diameter:'8mm',grade:'Fe-500D',length:'12 metres',standard:'IS 1786'},
      unit:'piece',mrp:42,mfr:'JSW Steel Ltd',kw:'jsw tmt bar 8mm steel reinforcement construction',img:IMGS.steel,
      listings:[{s:'ATPS-CST01',p:36,q:600,m:8},{s:'ATPS-BSD01',p:38,q:400,m:22},{s:'ATPS-UST01',p:39,q:300,m:35}]},

    {name:'MS Angle 40x40x4mm 6m',brand:'SAIL',sku:'SAIL-MSA-40404-6',cat:C('Steel & Metal'),
      desc:'SAIL mild steel equal angle 40x40x4mm, 6m length. For structural fabrication and shelving.',
      specs:{size:'40x40x4mm',length:'6 metres',grade:'E250',standard:'IS 2062',type:'equal angle'},
      unit:'piece',mrp:820,mfr:'SAIL',kw:'ms angle sail 40x40x4mm mild steel structural fabrication',img:IMGS.steel,
      listings:[{s:'ATPS-CST01',p:720,q:100,m:15},{s:'ATPS-BSD01',p:745,q:80,m:30},{s:'ATPS-UST01',p:768,q:60,m:48}]},

    {name:'GI Binding Wire 16 SWG 20kg Roll',brand:'Generic',sku:'GI-BW16-20',cat:C('Steel & Metal'),
      desc:'Galvanised iron binding wire 16 SWG, 20kg roll. For tying TMT bars in construction.',
      specs:{gauge:'16 SWG',weight:'20 kg',coating:'galvanised',material:'mild steel'},
      unit:'roll',mrp:1650,mfr:'Various',kw:'binding wire gi galvanised 16 swg 20kg construction rcc',img:IMGS.steel,
      listings:[{s:'ATPS-CST01',p:1480,q:30,m:10},{s:'ATPS-BSD01',p:1520,q:20,m:25},{s:'ATPS-SKH01',p:1560,q:15,m:40}]},

    // ── FASTENERS & HARDWARE ──────────────────────────────────────────────
    {name:'Anchor Bolt M12x100mm (Pack of 50)',brand:'Rawlplug',sku:'RWL-AB-M12-50',cat:C('Fasteners & Hardware'),
      desc:'Rawlplug anchor bolts M12x100mm. For concrete and masonry fastening. Pack of 50.',
      specs:{size:'M12x100mm',material:'zinc plated steel',application:'concrete/masonry',pack:'50 pieces'},
      unit:'pack',mrp:780,mfr:'Rawlplug',kw:'anchor bolt m12 rawlplug concrete masonry fastener 50 pack',img:IMGS.hardware,
      listings:[{s:'ATPS-GFH01',p:668,q:20,m:15},{s:'ATPS-SKH01',p:695,q:15,m:28},{s:'ATPS-MNH01',p:715,q:10,m:45}]},

    {name:'MS Hex Bolt M10x75mm Grade 8.8 (Pack of 50)',brand:'Generic',sku:'MS-HB-M10-50',cat:C('Fasteners & Hardware'),
      desc:'Mild steel hex bolt M10x75mm Grade 8.8 with nut and washer. Pack of 50.',
      specs:{size:'M10x75mm',grade:'8.8',material:'mild steel',finish:'hot dip galvanised',pack:'50 pieces'},
      unit:'pack',mrp:580,mfr:'Various',kw:'hex bolt m10 ms mild steel grade 8.8 nut washer pack fastener',img:IMGS.hardware,
      listings:[{s:'ATPS-GFH01',p:498,q:30,m:12},{s:'ATPS-SKH01',p:518,q:20,m:25},{s:'ATPS-BTM01',p:535,q:15,m:40}]},

    {name:'CSK Self-Tapping Screw 12mm No.8 (Box of 100)',brand:'Generic',sku:'CSK-STS-12-100',cat:C('Fasteners & Hardware'),
      desc:'Countersunk self-tapping screw 12mm No.8. Phosphate finish. For wood and metal sheet.',
      specs:{size:'12mm No.8',type:'self-tapping CSK',finish:'phosphate',pack:'100 pieces'},
      unit:'box',mrp:145,mfr:'Various',kw:'screw self tapping 12mm countersunk csK wood metal fastener',img:IMGS.hardware,
      listings:[{s:'ATPS-GFH01',p:118,q:100,m:8},{s:'ATPS-SKH01',p:125,q:80,m:18},{s:'ATPS-BTM01',p:130,q:60,m:30}]},

    {name:'MS Butt Hinge 4 inch Heavy Duty (Pair)',brand:'Dorset',sku:'DOR-BH-4IN',cat:C('Fasteners & Hardware'),
      desc:'Dorset heavy-duty MS butt hinge 4 inch. For wooden doors and gates. Pair.',
      specs:{size:'4 inch',material:'mild steel',finish:'zinc plated',pack:'1 pair'},
      unit:'pair',mrp:185,mfr:'Dorset',kw:'hinge butt 4 inch ms door gate dorset pair heavy duty',img:IMGS.hardware,
      listings:[{s:'ATPS-GFH01',p:155,q:50,m:10},{s:'ATPS-SKH01',p:162,q:30,m:22},{s:'ATPS-MNH01',p:168,q:20,m:38}]},

    // ── SAFETY & PPE ──────────────────────────────────────────────────────
    {name:'Karam Industrial Safety Helmet',brand:'Karam',sku:'KAR-SH-PN521',cat:C('Safety & PPE'),
      desc:'Karam PN521 industrial safety helmet. HDPE shell. Meets IS 2925. Yellow.',
      specs:{standard:'IS 2925',material:'HDPE',color:'yellow',suspension:'6-point nylon',peak:'full brim'},
      unit:'piece',mrp:450,mfr:'Karam Industries',warranty:'3 years',kw:'safety helmet karam industrial hdpe construction hard hat',img:IMGS.safety,
      listings:[{s:'ATPS-KSA01',p:388,q:30,m:20},{s:'ATPS-UWS01',p:405,q:20,m:35},{s:'ATPS-TWD01',p:420,q:15,m:50}]},

    {name:'Bonn Nitrile Exam Gloves Medium (Box 100)',brand:'Bonn',sku:'BON-NIT-M100',cat:C('Safety & PPE'),
      desc:'Bonn nitrile examination gloves, powder-free. Box of 100. Medium size. For general protection.',
      specs:{material:'nitrile',powder:'powder-free',size:'medium',pack:'100 pieces',standard:'EN374'},
      unit:'box',mrp:320,mfr:'Bonn Medical',kw:'nitrile gloves powder free medium box 100 safety protection',img:IMGS.safety,
      listings:[{s:'ATPS-KSA01',p:275,q:20,m:15},{s:'ATPS-UWS01',p:288,q:15,m:28}]},

    {name:'3M 6200 Half Face Respirator Mask',brand:'3M',sku:'3M-6200-HF',cat:C('Safety & PPE'),
      desc:'3M 6200 half-face respirator. For dust, mist and organic vapors with compatible cartridges.',
      specs:{model:'6200',size:'medium',type:'half face reusable',cartridge:'compatible 6000/6500 series'},
      unit:'piece',mrp:1250,mfr:'3M India',warranty:'1 year',kw:'3m 6200 respirator mask half face dust mist safety',img:IMGS.safety,
      listings:[{s:'ATPS-KSA01',p:1080,q:10,m:22},{s:'ATPS-UWS01',p:1120,q:8,m:38}]},

    // ── WELDING & CUTTING ─────────────────────────────────────────────────
    {name:'Ador Welding Electrode 2.5mm 3.15kg Box',brand:'Ador',sku:'ADO-WE25-3KG',cat:C('Welding & Cutting'),
      desc:'Ador Supercito general purpose welding electrode 2.5mm. 3.15kg box.',
      specs:{diameter:'2.5mm',type:'rutile low-hydrogen',weight:'3.15 kg',current:'AC/DC',code:'E6013'},
      unit:'box',mrp:415,mfr:'Ador Welding Ltd',kw:'welding electrode ador 2.5mm box e6013 rutile general purpose',img:IMGS.welding,
      listings:[{s:'ATPS-UWS01',p:358,q:40,m:15},{s:'ATPS-TWD01',p:372,q:25,m:28},{s:'ATPS-SKH01',p:385,q:15,m:45}]},

    {name:'Esab Arc Welding Machine 160A',brand:'Esab',sku:'ESB-ARC160',cat:C('Welding & Cutting'),
      desc:'Esab 160A arc welding machine. Suitable for electrodes up to 3.15mm. Single phase 230V input.',
      specs:{output:'160A',input:'230V single phase',duty_cycle:'60% at 130A',electrodes:'up to 3.15mm',weight:'5.5 kg'},
      unit:'piece',mrp:8500,mfr:'Esab India',warranty:'1 year',kw:'esab arc welding machine 160a mma welder single phase',img:IMGS.welding,
      listings:[{s:'ATPS-UWS01',p:7400,q:5,m:20},{s:'ATPS-TWD01',p:7600,q:3,m:35},{s:'ATPS-NTE01',p:7800,q:4,m:50}]},

    // ── ADHESIVES, TAPES & SEALANTS ───────────────────────────────────────
    {name:'Fevicol SH Synthetic Resin Adhesive 1kg',brand:'Fevicol',sku:'FEV-SH-1KG',cat:C('Adhesives, Tapes & Sealants'),
      desc:'Fevicol SH synthetic resin adhesive 1kg. World famous wood glue for furniture and carpentry.',
      specs:{weight:'1 kg',type:'synthetic resin (PVA)',application:'wood, plywood, laminates'},
      unit:'kg',mrp:195,mfr:'Pidilite Industries',kw:'fevicol sh adhesive 1kg wood glue furniture carpentry pidilite',img:IMGS.adhesive,
      listings:[{s:'ATPS-SAF01',p:168,q:50,m:10},{s:'ATPS-SKH01',p:175,q:30,m:20},{s:'ATPS-BTM01',p:181,q:20,m:35}]},

    {name:'Asian Paints SmartCare Damp Block Silicone Sealant',brand:'Asian Paints',sku:'AP-SCS-280ML',cat:C('Adhesives, Tapes & Sealants'),
      desc:'Asian Paints silicone sealant 280ml. Waterproof, for bathroom, kitchen and exterior gaps.',
      specs:{volume:'280ml',type:'acetoxy silicone',color:'clear',cure:'24 hours',application:'bath, kitchen, exterior'},
      unit:'piece',mrp:185,mfr:'Asian Paints Ltd',kw:'silicone sealant asian paints 280ml waterproof bathroom kitchen',img:IMGS.adhesive,
      listings:[{s:'ATPS-SAF01',p:158,q:40,m:12},{s:'ATPS-BPT01',p:165,q:25,m:25},{s:'ATPS-SKH01',p:172,q:15,m:40}]},

    {name:'Camlin Epoxy Adhesive 50ml',brand:'Camlin',sku:'CAM-EPA-50ML',cat:C('Adhesives, Tapes & Sealants'),
      desc:'Camlin epoxy adhesive 50ml. 2-part structural adhesive for metal, ceramic, glass and wood.',
      specs:{volume:'50ml',type:'2-part epoxy',strength:'3500 PSI',cure:'4 hours'},
      unit:'piece',mrp:130,mfr:'Kokuyo Camlin',kw:'camlin epoxy adhesive 50ml 2 part structural metal ceramic',img:IMGS.adhesive,
      listings:[{s:'ATPS-SAF01',p:108,q:60,m:8},{s:'ATPS-SKH01',p:115,q:40,m:18},{s:'ATPS-BTM01',p:120,q:25,m:32}]},

    // ── TILES & FLOORING ──────────────────────────────────────────────────
    {name:'Kajaria Ceramic Floor Tile 300x300mm',brand:'Kajaria',sku:'KAJ-CER-300',cat:C('Tiles & Flooring'),
      desc:'Kajaria ceramic floor tile 300x300mm. Matt finish. Water resistant.',
      specs:{size:'300x300mm',thickness:'8mm',finish:'matt',water_absorption:'<3%',coverage:'0.09 sq m per tile'},
      unit:'box',pack_size:'12 tiles = 1.08 sq m',mrp:380,mfr:'Kajaria Ceramics',kw:'kajaria ceramic floor tile 300x300 matt kitchen bathroom',img:IMGS.tile,
      listings:[{s:'ATPS-MTH01',p:328,q:30,m:18},{s:'ATPS-PBH01',p:345,q:20,m:32},{s:'ATPS-UBM01',p:358,q:15,m:48}]},

    {name:'Somany Vitrified Tile 600x600mm',brand:'Somany',sku:'SOM-VIT-600',cat:C('Tiles & Flooring'),
      desc:'Somany vitrifed glazed floor tile 600x600mm. High polished finish. For living areas.',
      specs:{size:'600x600mm',thickness:'9mm',finish:'high polished',water_absorption:'<0.1%'},
      unit:'box',pack_size:'4 tiles = 1.44 sq m',mrp:950,mfr:'Somany Ceramics',kw:'somany vitrified tile 600x600 polished floor living area',img:IMGS.tile,
      listings:[{s:'ATPS-MTH01',p:825,q:20,m:20},{s:'ATPS-UBM01',p:860,q:15,m:35}]},

    {name:'Tile Adhesive Laticrete Standard 20kg',brand:'Laticrete',sku:'LAT-TA-20KG',cat:C('Tiles & Flooring'),
      desc:'Laticrete 111 tile adhesive 20kg. For fixing ceramic and vitrified tiles.',
      specs:{weight:'20 kg',type:'polymer modified cementitious',coverage:'4–5 sq m per bag'},
      unit:'bag',mrp:320,mfr:'Laticrete',kw:'tile adhesive laticrete 20kg ceramic vitrified fixing',img:IMGS.tile,
      listings:[{s:'ATPS-MTH01',p:278,q:30,m:15},{s:'ATPS-UBM01',p:290,q:25,m:28},{s:'ATPS-SKH01',p:300,q:15,m:42}]},

    // ── AGRICULTURE & IRRIGATION ──────────────────────────────────────────
    {name:'Jain Drip Irrigation Lateral 16mm 50m',brand:'Jain',sku:'JAI-DL-16-50',cat:C('Agriculture & Irrigation'),
      desc:'Jain 16mm drip irrigation lateral tape, 50m roll. For row crops.',
      specs:{diameter:'16mm',length:'50 metres',wall_thickness:'150 micron',dripper_spacing:'30cm'},
      unit:'roll',mrp:450,mfr:'Jain Irrigation Systems',kw:'jain drip irrigation lateral 16mm 50m row crop agriculture',img:IMGS.garden,
      listings:[{s:'ATPS-AGH01',p:390,q:20,m:15},{s:'ATPS-RKH01',p:408,q:12,m:28}]},

    {name:'Kirloskar Star 1HP Submersible Pump',brand:'Kirloskar',sku:'KIR-SS-1HP',cat:C('Agriculture & Irrigation'),
      desc:'Kirloskar STAR 1HP domestic submersible pump. For bore wells up to 80 feet.',
      specs:{power:'1 HP (0.75kW)',head:'up to 80 feet',voltage:'220V single phase',outlet:'1 inch'},
      unit:'piece',mrp:8500,mfr:'Kirloskar Brothers',warranty:'1 year',kw:'kirloskar submersible pump 1hp borewell domestic water',img:IMGS.pump,
      listings:[{s:'ATPS-AGH01',p:7400,q:5,m:20},{s:'ATPS-UES01',p:7600,q:4,m:35},{s:'ATPS-KHE01',p:7800,q:3,m:50}]},

    // ── LADDERS & SCAFFOLDING ─────────────────────────────────────────────
    {name:'Laddersafe Aluminium Ladder 6 Feet',brand:'Laddersafe',sku:'LAD-AL-6FT',cat:C('Ladders & Scaffolding'),
      desc:'Laddersafe 6-foot aluminium folding ladder. 150kg capacity. Non-slip rubber feet.',
      specs:{height:'6 feet (1.83m)',material:'aluminium alloy',capacity:'150 kg',steps:'6',type:'folding A-type'},
      unit:'piece',mrp:2200,mfr:'Laddersafe',warranty:'1 year',kw:'aluminium ladder 6 feet folding lightweight safety',img:IMGS.tools,
      listings:[{s:'ATPS-TWD01',p:1880,q:8,m:22},{s:'ATPS-BTM01',p:1950,q:5,m:38},{s:'ATPS-SKH01',p:2020,q:3,m:55}]},

    {name:'Laddersafe Aluminium Ladder 8 Feet',brand:'Laddersafe',sku:'LAD-AL-8FT',cat:C('Ladders & Scaffolding'),
      desc:'Laddersafe 8-foot aluminium folding ladder. 150kg capacity.',
      specs:{height:'8 feet (2.44m)',material:'aluminium alloy',capacity:'150 kg',steps:'8'},
      unit:'piece',mrp:2850,mfr:'Laddersafe',warranty:'1 year',kw:'aluminium ladder 8 feet folding lightweight safety step',img:IMGS.tools,
      listings:[{s:'ATPS-TWD01',p:2450,q:6,m:25},{s:'ATPS-NTE01',p:2530,q:4,m:40}]},

    // ── BATHROOM & HOME IMPROVEMENT ───────────────────────────────────────
    {name:'Cera One Piece EWC Water Closet',brand:'Cera',sku:'CER-OPC-WC',cat:C('Bathroom & Home Improvement'),
      desc:'Cera Viva one-piece water closet. S-trap, 6 litre flush. White.',
      specs:{type:'one piece',flush:'6 litre dual flush',trap:'S-trap',color:'white',warranty:'10 year glaze'},
      unit:'piece',mrp:12500,mfr:'Cera Sanitaryware',warranty:'10 year on glaze',kw:'cera ewc one piece toilet water closet wc bathroom sanitary',img:IMGS.hardware,
      listings:[{s:'ATPS-MSH01',p:10800,q:5,m:25},{s:'ATPS-CSH01',p:11200,q:3,m:40}]},

    {name:'Parryware Aria Basin 550mm',brand:'Parryware',sku:'PAR-AB-550',cat:C('Bathroom & Home Improvement'),
      desc:'Parryware Aria table-top wash basin 550mm. White vitreous china.',
      specs:{size:'550mm',type:'table-top',material:'vitreous china',color:'white'},
      unit:'piece',mrp:4200,mfr:'Parryware India',kw:'parryware aria basin 550mm wash basin bathroom sanitary',img:IMGS.hardware,
      listings:[{s:'ATPS-MSH01',p:3620,q:8,m:20},{s:'ATPS-UES01',p:3750,q:5,m:35},{s:'ATPS-CSH01',p:3850,q:4,m:50}]},

    // ── HVAC & VENTILATION ────────────────────────────────────────────────
    {name:'Havells Ventilair 12 inch Exhaust Fan',brand:'Havells',sku:'HAV-EF-12',cat:C('HVAC & Ventilation'),
      desc:'Havells Ventilair 12-inch exhaust fan. For kitchen, bathroom, toilet. 300mm sweep.',
      specs:{diameter:'12 inch (300mm)',speed:'1300 RPM',power:'35W',airflow:'735 CMH',voltage:'220V'},
      unit:'piece',mrp:1150,mfr:'Havells India Ltd',warranty:'2 year',kw:'havells exhaust fan 12 inch 300mm bathroom kitchen ventilation',img:IMGS.fan,
      listings:[{s:'ATPS-PPE01',p:988,q:15,m:18},{s:'ATPS-BEL01',p:1020,q:10,m:32},{s:'ATPS-UES01',p:1048,q:8,m:48}]},

    // ── SECURITY & SAFETY SYSTEMS ─────────────────────────────────────────
    {name:'CP Plus 2MP CCTV Dome Camera',brand:'CP Plus',sku:'CPP-2MP-DOM',cat:C('Safety & Security Systems'),
      desc:'CP Plus 2MP HD dome CCTV camera. IR night vision 20m. For indoor surveillance.',
      specs:{resolution:'2MP (1080P)',type:'dome',IR:'20 metres',lens:'3.6mm',power:'12V DC'},
      unit:'piece',mrp:1800,mfr:'CP Plus',warranty:'2 year',kw:'cp plus cctv dome camera 2mp 1080p security surveillance ir',img:IMGS.lock,
      listings:[{s:'ATPS-PPE01',p:1550,q:10,m:20},{s:'ATPS-BEL01',p:1620,q:7,m:35}]},

    // ── TESTING & INSTRUMENTS ─────────────────────────────────────────────
    {name:'Fluke 115 Digital Multimeter',brand:'Fluke',sku:'FLK-115-DMM',cat:C('Testing & Instruments'),
      desc:'Fluke 115 true RMS digital multimeter. For HVAC, electrical and general purpose.',
      specs:{type:'true RMS',display:'6000 count',voltage:'AC/DC 600V',current:'10A AC/DC',resistance:'40 MΩ'},
      unit:'piece',mrp:8500,mfr:'Fluke Corporation',warranty:'3 year',kw:'fluke 115 multimeter digital true rms electrical test measurement',img:IMGS.tools,
      listings:[{s:'ATPS-PPE01',p:7400,q:5,m:25},{s:'ATPS-TWD01',p:7600,q:3,m:40}]},

    {name:'Bosch GTL2 Laser Level',brand:'Bosch',sku:'BSH-GTL2',cat:C('Testing & Instruments'),
      desc:'Bosch GTL 2 cross line laser. Self-levelling. For tiling, plumbing, and electrical.',
      specs:{type:'cross line laser',levelling:'self-levelling ±4°',range:'10m',accuracy:'±0.5mm/m'},
      unit:'piece',mrp:5200,mfr:'Bosch',warranty:'1 year',kw:'bosch laser level gtl2 cross line self levelling tiling electrical',img:IMGS.tools,
      listings:[{s:'ATPS-TWD01',p:4480,q:4,m:22},{s:'ATPS-NTE01',p:4580,q:3,m:38}]},

    // ── GARDEN & OUTDOOR ──────────────────────────────────────────────────
    {name:'Greenworks Garden Hose 30m with Spray Gun',brand:'Greenworks',sku:'GRW-GH30',cat:C('Garden & Outdoor'),
      desc:'Greenworks expandable garden hose 30m. Comes with 8-pattern spray gun.',
      specs:{length:'30 metres',material:'multilayer latex',spray_patterns:'8',connection:'3/4 inch'},
      unit:'piece',mrp:1450,mfr:'Greenworks',kw:'garden hose 30m greenworks spray gun expandable outdoor',img:IMGS.garden,
      listings:[{s:'ATPS-AGH01',p:1240,q:10,m:15},{s:'ATPS-SKH01',p:1295,q:6,m:30}]},

    // ── INDUSTRIAL & MRO ──────────────────────────────────────────────────
    {name:'SKF Deep Groove Ball Bearing 6205-2Z',brand:'SKF',sku:'SKF-6205-2Z',cat:C('Industrial & MRO'),
      desc:'SKF deep groove ball bearing 6205-2Z. 25mm bore, 52mm OD. Metal shielded.',
      specs:{type:'deep groove ball bearing',bore:'25mm',OD:'52mm',width:'15mm',shields:'2Z metal'},
      unit:'piece',mrp:380,mfr:'SKF India',kw:'skf bearing 6205 2z deep groove ball bearing industrial machinery',img:IMGS.hardware,
      listings:[{s:'ATPS-NTE01',p:328,q:20,m:18},{s:'ATPS-TWD01',p:342,q:15,m:32}]},

    {name:'Shell Tellus S2 M 68 Hydraulic Oil 20L',brand:'Shell',sku:'SHL-T68-20L',cat:C('Industrial & MRO'),
      desc:'Shell Tellus S2 M 68 hydraulic oil. For industrial hydraulic systems. 20 litre.',
      specs:{grade:'ISO VG 68',volume:'20 litres',type:'mineral oil anti-wear',standard:'DIN 51524-2 HM'},
      unit:'can',mrp:3800,mfr:'Shell India',kw:'shell tellus hydraulic oil 68 20 litre industrial machinery',img:IMGS.hardware,
      listings:[{s:'ATPS-NTE01',p:3280,q:8,m:20},{s:'ATPS-BHE01',p:3380,q:5,m:35}]},

    // ── FURNITURE HARDWARE ────────────────────────────────────────────────
    {name:'Hettich Drawer Channel Full Extension 400mm',brand:'Hettich',sku:'HET-DC-400',cat:C('Furniture Hardware'),
      desc:'Hettich full-extension drawer channel 400mm. Smooth ball bearing slides. Pair.',
      specs:{length:'400mm',type:'full extension',load:'25kg per pair',material:'steel',finish:'zinc plated'},
      unit:'pair',mrp:385,mfr:'Hettich India',kw:'hettich drawer channel 400mm full extension ball bearing furniture',img:IMGS.hardware,
      listings:[{s:'ATPS-SKH01',p:330,q:25,m:15},{s:'ATPS-MNH01',p:345,q:18,m:28},{s:'ATPS-GFH01',p:358,q:12,m:42}]},

    // ── MATERIAL HANDLING ─────────────────────────────────────────────────
    {name:'Nilkamal Folding Hand Truck 200kg',brand:'Nilkamal',sku:'NIL-HT-200',cat:C('Material Handling'),
      desc:'Nilkamal folding hand truck. 200kg capacity. Steel frame with rubber wheels.',
      specs:{capacity:'200 kg',wheel:'6 inch rubber',material:'steel',type:'folding'},
      unit:'piece',mrp:2200,mfr:'Nilkamal',warranty:'1 year',kw:'nilkamal hand truck trolley 200kg folding material handling',img:IMGS.hardware,
      listings:[{s:'ATPS-SKH01',p:1880,q:8,m:20},{s:'ATPS-UBM01',p:1950,q:5,m:35}]},
  ];

  const txn = db.transaction(() => {
    for (const p of PRODUCTS) addProduct(p);
  });
  txn();

  const prodCount = db.prepare('SELECT COUNT(*) c FROM products').get().c;
  const listCount = db.prepare('SELECT COUNT(*) c FROM seller_listings').get().c;
  console.log(`  ${prodCount} products seeded`);
  console.log(`  ${listCount} seller listings seeded`);

  // ── Admin + Demo Customer ───────────────────────────────────────────────
  const adminUid = uuid();
  iUser.run(adminUid,'ADMIN','AtPrice Admin','admin@atprice.demo','9000000000',DEMO_HASH);
  iUser.run(uuid(),'CUSTOMER','Demo Customer','customer@atprice.demo','9000000001',DEMO_HASH);

  console.log('Seed complete.');
}

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  buildSchema(db);
  seedIfEmpty(db);
  return db;
}

module.exports = { getDb, DB_PATH };

if (require.main === module) {
  console.log('Initialising AtPrice database...');
  const db = getDb();
  const stats = db.prepare(`SELECT
    (SELECT COUNT(*) FROM products) products,
    (SELECT COUNT(*) FROM sellers) sellers,
    (SELECT COUNT(*) FROM seller_listings) listings,
    (SELECT COUNT(*) FROM categories) categories
  `).get();
  console.log('Database stats:', stats);
  db.close();
}
