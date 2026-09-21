import 'dotenv/config';
import { pool } from './pool';

// Karnataka city coordinates
const CITIES = [
  { city: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { city: 'Mysuru', lat: 12.2958, lng: 76.6394 },
  { city: 'Mangaluru', lat: 12.9141, lng: 74.8560 },
  { city: 'Udupi', lat: 13.3409, lng: 74.7421 },
  { city: 'Manipal', lat: 13.3525, lng: 74.7848 },
  { city: 'Hassan', lat: 13.0035, lng: 76.0998 },
  { city: 'Shivamogga', lat: 13.9299, lng: 75.5681 },
  { city: 'Chikkamagaluru', lat: 13.3153, lng: 75.7754 },
  { city: 'Kundapura', lat: 13.2124, lng: 74.6914 },
  { city: 'Madikeri', lat: 12.4244, lng: 75.7382 },
];

const DEMO_SELLERS = [
  { shop_name: 'Sri Krishna Hardware & Electricals', owner_name: 'Krishnaswamy R', phone: '+919876543201', whatsapp: '+919876543201', city: 'Bengaluru', lat: 12.9716, lng: 77.5946, rating: 4.5, description: 'Complete hardware & electrical solutions. Serving Bengaluru for 25+ years.', pickup_available: true, delivery_available: true },
  { shop_name: 'Coastal Hardware & Building Materials', owner_name: 'Suresh Shetty', phone: '+919876543202', whatsapp: '+919876543202', city: 'Mangaluru', lat: 12.9141, lng: 74.8560, rating: 4.3, description: 'Your trusted hardware partner in Mangaluru coastal region.', pickup_available: true, delivery_available: true },
  { shop_name: 'Mahalakshmi Hardware & Sanitary', owner_name: 'Lakshman Rao', phone: '+919876543203', whatsapp: '+919876543203', city: 'Mysuru', lat: 12.2958, lng: 76.6394, rating: 4.6, description: 'Premium sanitary and hardware store in Mysuru city.', pickup_available: true, delivery_available: false },
  { shop_name: 'Prakash Tools & Machinery', owner_name: 'Prakash Kumar', phone: '+919876543204', whatsapp: '+919876543204', city: 'Bengaluru', lat: 12.9352, lng: 77.6245, rating: 4.4, description: 'Industrial tools, power tools and machinery specialists.', pickup_available: true, delivery_available: true },
  { shop_name: 'National Hardware Traders', owner_name: 'Mohan Das', phone: '+919876543205', whatsapp: '+919876543205', city: 'Udupi', lat: 13.3409, lng: 74.7421, rating: 4.2, description: 'Wholesale and retail hardware for Udupi and surrounding areas.', pickup_available: true, delivery_available: false },
  { shop_name: 'Shree Ganesh Electricals', owner_name: 'Ganesh Naik', phone: '+919876543206', whatsapp: '+919876543206', city: 'Bengaluru', lat: 12.9835, lng: 77.5480, rating: 4.7, description: 'Authorised dealer for Havells, Legrand, Polycab and Finolex.', pickup_available: true, delivery_available: true },
  { shop_name: 'City Hardware Mart', owner_name: 'Ramesh Gowda', phone: '+919876543207', whatsapp: '+919876543207', city: 'Hassan', lat: 13.0035, lng: 76.0998, rating: 4.1, description: 'One-stop shop for all building material needs in Hassan.', pickup_available: true, delivery_available: false },
  { shop_name: 'Udupi Building Materials', owner_name: 'Dinesh Ballal', phone: '+919876543208', whatsapp: '+919876543208', city: 'Udupi', lat: 13.3480, lng: 74.7510, rating: 4.3, description: 'Quality building materials at competitive prices.', pickup_available: true, delivery_available: true },
  { shop_name: 'Karnataka Hardware Traders', owner_name: 'Vittal Hegde', phone: '+919876543209', whatsapp: '+919876543209', city: 'Bengaluru', lat: 12.9600, lng: 77.6100, rating: 4.5, description: 'Bulk hardware supplier for contractors and builders.', pickup_available: true, delivery_available: true },
  { shop_name: 'Ganesh Plumbing Centre', owner_name: 'Subrahmanya Bhat', phone: '+919876543210', whatsapp: '+919876543210', city: 'Mangaluru', lat: 12.9200, lng: 74.8650, rating: 4.4, description: 'Complete plumbing solutions — pipes, fittings, sanitary ware.', pickup_available: true, delivery_available: false },
  { shop_name: 'Vijaya Hardware & Paints', owner_name: 'Vijaya Kumar', phone: '+919876543211', whatsapp: '+919876543211', city: 'Mysuru', lat: 12.3050, lng: 76.6450, rating: 4.2, description: 'Asian Paints dealer with full hardware range.', pickup_available: true, delivery_available: true },
  { shop_name: 'Shivamogga Steel & Hardware', owner_name: 'Hanumanthaiah M', phone: '+919876543212', whatsapp: '+919876543212', city: 'Shivamogga', lat: 13.9299, lng: 75.5681, rating: 4.0, description: 'TMT bars, steel sections and hardware for Shivamogga.', pickup_available: true, delivery_available: true },
  { shop_name: 'Kundapura General Stores', owner_name: 'Ranjith Bhandary', phone: '+919876543213', whatsapp: '+919876543213', city: 'Kundapura', lat: 13.2124, lng: 74.6914, rating: 4.1, description: 'General hardware and building materials for coastal Karnataka.', pickup_available: true, delivery_available: false },
  { shop_name: 'Malnad Tools & Safety', owner_name: 'Prashanth Rao', phone: '+919876543214', whatsapp: '+919876543214', city: 'Chikkamagaluru', lat: 13.3153, lng: 75.7754, rating: 4.3, description: 'Tools, safety equipment and PPE for construction sites.', pickup_available: true, delivery_available: false },
  { shop_name: 'BM Hardware & Electricals', owner_name: 'Basavaraju M', phone: '+919876543215', whatsapp: '+919876543215', city: 'Bengaluru', lat: 12.9400, lng: 77.5800, rating: 4.6, description: 'Premium electrical and hardware store — Bengaluru South.', pickup_available: true, delivery_available: true },
  { shop_name: 'Manipal Building Solutions', owner_name: 'Padmanabha Kini', phone: '+919876543216', whatsapp: '+919876543216', city: 'Manipal', lat: 13.3525, lng: 74.7848, rating: 4.2, description: 'Complete building material solutions for Manipal-Udupi belt.', pickup_available: true, delivery_available: true },
  { shop_name: 'Coorg Hardware Depot', owner_name: 'Appaiah Kuttappa', phone: '+919876543217', whatsapp: '+919876543217', city: 'Madikeri', lat: 12.4244, lng: 75.7382, rating: 4.0, description: 'Hardware depot serving Coorg and surrounding hill districts.', pickup_available: true, delivery_available: false },
  { shop_name: 'Apex Fasteners & Tools', owner_name: 'Ajay Singh', phone: '+919876543218', whatsapp: '+919876543218', city: 'Bengaluru', lat: 12.9800, lng: 77.6300, rating: 4.4, description: 'Specialist fastener store — bolts, nuts, anchors, screws.', pickup_available: true, delivery_available: true },
  { shop_name: 'Sri Sai Welding Stores', owner_name: 'Sai Krishna', phone: '+919876543219', whatsapp: '+919876543219', city: 'Bengaluru', lat: 12.9550, lng: 77.5950, rating: 4.3, description: 'Welding electrodes, gas cylinders and welding equipment.', pickup_available: true, delivery_available: false },
  { shop_name: 'Modern Paints & Chemicals', owner_name: 'Pradeep Chetty', phone: '+919876543220', whatsapp: '+919876543220', city: 'Bengaluru', lat: 12.9650, lng: 77.5700, rating: 4.5, description: 'Authorised dealer: Asian Paints, Berger, Nerolac, Dulux.', pickup_available: true, delivery_available: true },
];

const CATEGORIES = [
  { name: 'Building Materials', slug: 'building-materials', icon: '🏗️', subs: ['Cement', 'Sand & Aggregates', 'Bricks & Blocks', 'Waterproofing', 'Roof Tiles', 'Concrete & Mortar'] },
  { name: 'Plumbing & Sanitary', slug: 'plumbing-sanitary', icon: '🔧', subs: ['CPVC Pipes', 'PVC Pipes', 'GI Pipes', 'Pipe Fittings', 'Taps & Faucets', 'Tanks & Pumps', 'Valves'] },
  { name: 'Electrical', slug: 'electrical', icon: '⚡', subs: ['Switches & Sockets', 'Wires & Cables', 'MCBs & Distribution', 'LED Lighting', 'Fans & Exhaust', 'Switchgear'] },
  { name: 'Tools & Machinery', slug: 'tools-machinery', icon: '🔩', subs: ['Power Tools', 'Hand Tools', 'Drilling & Cutting', 'Measuring Tools', 'Tool Kits', 'Air Tools'] },
  { name: 'Paints & Chemicals', slug: 'paints-chemicals', icon: '🎨', subs: ['Exterior Paints', 'Interior Paints', 'Primers', 'Enamel Paints', 'Distemper', 'Thinners & Solvents'] },
  { name: 'Steel & Metal', slug: 'steel-metal', icon: '⚙️', subs: ['TMT Bars', 'MS Sections', 'GI Sheets', 'Stainless Steel', 'Aluminium Sections', 'Wire Mesh'] },
  { name: 'Fasteners & General Hardware', slug: 'fasteners-hardware', icon: '🔨', subs: ['Bolts & Nuts', 'Screws', 'Anchors', 'Nails', 'Washers', 'Rivets'] },
  { name: 'Doors & Windows', slug: 'doors-windows', icon: '🚪', subs: ['Wooden Doors', 'Steel Doors', 'uPVC Windows', 'Door Frames', 'Handles & Locks', 'Hinges'] },
  { name: 'Tiles & Flooring', slug: 'tiles-flooring', icon: '🏠', subs: ['Floor Tiles', 'Wall Tiles', 'Vitrified Tiles', 'Mosaic Tiles', 'Marble & Granite', 'Tile Adhesives'] },
  { name: 'Glass & Aluminium', slug: 'glass-aluminium', icon: '🪟', subs: ['Float Glass', 'Toughened Glass', 'Aluminium Sections', 'Aluminium Profiles', 'Glass Hardware'] },
  { name: 'Safety & PPE', slug: 'safety-ppe', icon: '🦺', subs: ['Helmets', 'Gloves', 'Safety Shoes', 'Reflective Vests', 'Safety Nets', 'Eye Protection'] },
  { name: 'Garden & Outdoor', slug: 'garden-outdoor', icon: '🌱', subs: ['Garden Tools', 'Hoses & Fittings', 'Garden Fencing', 'Sprinklers', 'Planters'] },
  { name: 'Welding & Cutting', slug: 'welding-cutting', icon: '🔥', subs: ['Welding Electrodes', 'MIG/TIG Wires', 'Welding Machines', 'Gas Cylinders', 'Cutting Discs', 'Welding Accessories'] },
  { name: 'Furniture Hardware', slug: 'furniture-hardware', icon: '🪑', subs: ['Hinges', 'Drawer Channels', 'Handles', 'Furniture Fittings', 'Glass Fittings'] },
  { name: 'Automotive & Workshop', slug: 'automotive-workshop', icon: '🚗', subs: ['Lubricants & Oils', 'Workshop Tools', 'Abrasives', 'Workshop Equipment'] },
  { name: 'Industrial & MRO', slug: 'industrial-mro', icon: '🏭', subs: ['Bearings', 'Belts & Pulleys', 'Seals & Gaskets', 'Industrial Fasteners', 'Pneumatics'] },
  { name: 'Adhesives, Tapes & Sealants', slug: 'adhesives-tapes-sealants', icon: '🧲', subs: ['Construction Adhesives', 'Epoxy', 'Silicone Sealants', 'PTFE Tapes', 'Masking Tapes', 'Double-sided Tapes'] },
  { name: 'Packaging & Storage', slug: 'packaging-storage', icon: '📦', subs: ['Stretch Film', 'Corrugated Boxes', 'Strapping Tapes', 'Storage Bins', 'Pallets'] },
  { name: 'Material Handling', slug: 'material-handling', icon: '🏋️', subs: ['Trolleys', 'Ladders', 'Scaffolding', 'Pulleys & Hoists', 'Ropes & Slings'] },
  { name: 'Security & Safety Systems', slug: 'security-safety', icon: '🔐', subs: ['Padlocks', 'Deadbolts', 'Door Closers', 'Safety Chains', 'Access Hardware'] },
  { name: 'Bathroom & Home Improvement', slug: 'bathroom-home', icon: '🚿', subs: ['Showers & Faucets', 'Bathroom Accessories', 'Basin & WC', 'Water Heaters', 'Mirrors'] },
  { name: 'HVAC & Ventilation', slug: 'hvac-ventilation', icon: '❄️', subs: ['Exhaust Fans', 'Ventilation Ducts', 'AC Accessories', 'Air Filters'] },
  { name: 'Agriculture & Irrigation', slug: 'agriculture-irrigation', icon: '🌾', subs: ['Drip Irrigation', 'Sprinkler Systems', 'Submersible Pumps', 'Agri Pipes', 'Fencing'] },
  { name: 'DIY & Craft Hardware', slug: 'diy-craft', icon: '🛠️', subs: ['DIY Tool Kits', 'Craft Materials', 'Hobby Tools', 'Assembly Hardware'] },
  { name: 'Testing & Measuring', slug: 'testing-measuring', icon: '📏', subs: ['Measuring Tapes', 'Spirit Levels', 'Multimeters', 'Clamp Meters', 'Survey Equipment', 'Thermal Cameras'] },
];

// 250+ products across all categories
const PRODUCTS = [
  // Building Materials
  { name: 'UltraTech OPC 53 Grade Cement 50kg', brand: 'UltraTech', category: 'Building Materials', sub: 'Cement', unit: 'bag', mrp: 420, keywords: 'ultratech cement opc 53 grade concrete bag', desc: 'High strength OPC 53 grade Portland cement. Ideal for RCC, foundations, columns and beams. 50kg bag.', specs: { grade: 'OPC 53', weight: '50kg', setting_time: '30 min initial', strength: '53 MPa' } },
  { name: 'ACC Gold Cement 50kg', brand: 'ACC', category: 'Building Materials', sub: 'Cement', unit: 'bag', mrp: 415, keywords: 'acc gold cement bag 50kg concrete', desc: 'ACC Gold — premium quality cement for all construction applications. 50kg bag.', specs: { grade: 'OPC 43', weight: '50kg' } },
  { name: 'Dalmia DSP Cement 50kg', brand: 'Dalmia', category: 'Building Materials', sub: 'Cement', unit: 'bag', mrp: 410, keywords: 'dalmia dsp cement bag concrete foundation', desc: 'Dalmia DSP — durable construction cement for all-weather performance. 50kg bag.', specs: { grade: 'PPC', weight: '50kg' } },
  { name: 'UltraTech PPC Cement 50kg', brand: 'UltraTech', category: 'Building Materials', sub: 'Cement', unit: 'bag', mrp: 395, keywords: 'ultratech ppc cement portland pozzolana plastering', desc: 'Portland Pozzolana Cement for masonry, plastering and general construction.', specs: { grade: 'PPC', weight: '50kg' } },
  { name: 'Dr. Fixit Waterproof Coating 20kg', brand: 'Dr. Fixit', category: 'Building Materials', sub: 'Waterproofing', unit: 'can', mrp: 1850, keywords: 'dr fixit waterproof coating terrace roof basement damp', desc: 'Elastomeric waterproof coating for terraces, roofs and basements. 20kg pail.', specs: { coverage: '1.5 kg/sqm', coats: '2', VOC: 'Low' } },
  { name: 'Fosroc Conplast SP430 Concrete Admixture 1L', brand: 'Fosroc', category: 'Building Materials', sub: 'Concrete & Mortar', unit: 'litre', mrp: 210, keywords: 'fosroc conplast admixture superplasticizer concrete workability', desc: 'Superplasticizer for high-workability concrete. Reduces water demand by up to 25%.', specs: { type: 'Superplasticizer', dosage: '0.5-1.5 L/100kg cement' } },
  { name: 'Solid Red Clay Bricks (1000 pcs)', brand: 'Local', category: 'Building Materials', sub: 'Bricks & Blocks', unit: 'thousand', mrp: 8500, keywords: 'red clay bricks solid masonry wall construction', desc: 'Machine-made solid red clay bricks. Size 230x110x75mm. Per 1000 units.', specs: { size: '230x110x75mm', compressive_strength: '3.5 N/mm²' } },
  { name: 'AAC Blocks 600x200x150mm (per piece)', brand: 'Siporex', category: 'Building Materials', sub: 'Bricks & Blocks', unit: 'piece', mrp: 48, keywords: 'aac blocks autoclaved aerated concrete lightweight siporex', desc: 'Autoclaved Aerated Concrete (AAC) blocks — lightweight, thermal insulating.', specs: { size: '600x200x150mm', density: '600 kg/m³' } },

  // Plumbing & Sanitary
  { name: 'Astral CPVC FlowGuard Plus 1 inch x 3m', brand: 'Astral', category: 'Plumbing & Sanitary', sub: 'CPVC Pipes', unit: 'piece', mrp: 315, keywords: 'astral cpvc flowguard pipe 1 inch hot water plumbing', desc: 'CPVC hot & cold water pressure pipe, 1" diameter, 3 metre length. ASTM D2846 certified.', specs: { diameter: '1 inch', length: '3 metres', pressure_rating: 'SDR 11', material: 'CPVC' } },
  { name: 'Astral CPVC FlowGuard Plus ½ inch x 3m', brand: 'Astral', category: 'Plumbing & Sanitary', sub: 'CPVC Pipes', unit: 'piece', mrp: 175, keywords: 'astral cpvc flowguard half inch pipe hot water', desc: 'CPVC hot & cold water pressure pipe, ½" diameter, 3 metre.', specs: { diameter: '½ inch', length: '3 metres', material: 'CPVC' } },
  { name: 'Ashirvad CPVC Pipe 1.5 inch x 3m', brand: 'Ashirvad', category: 'Plumbing & Sanitary', sub: 'CPVC Pipes', unit: 'piece', mrp: 420, keywords: 'ashirvad cpvc pipe 1.5 inch plumbing hot water', desc: 'CPVC plumbing pipe for hot and cold water supply. 1.5" x 3m.', specs: { diameter: '1.5 inch', length: '3m', material: 'CPVC' } },
  { name: 'Finolex PVC SWR Pipe 4 inch x 3m', brand: 'Finolex', category: 'Plumbing & Sanitary', sub: 'PVC Pipes', unit: 'piece', mrp: 580, keywords: 'finolex pvc swr pipe 4 inch drain soil waste', desc: 'Soil, waste and rainwater PVC SWR pipe. 4 inch, 3 metre. IS 13592 certified.', specs: { diameter: '4 inch', length: '3m', standard: 'IS 13592', material: 'PVC-SWR' } },
  { name: 'Supreme PVC Water Pipe 2 inch x 3m', brand: 'Supreme', category: 'Plumbing & Sanitary', sub: 'PVC Pipes', unit: 'piece', mrp: 245, keywords: 'supreme pvc pipe 2 inch water supply irrigation', desc: 'Supreme Industries PVC water supply pipe. 2 inch, 3 metre.', specs: { diameter: '2 inch', length: '3m', material: 'PVC' } },
  { name: 'Astral CPVC Tee 1 inch', brand: 'Astral', category: 'Plumbing & Sanitary', sub: 'Pipe Fittings', unit: 'piece', mrp: 55, keywords: 'astral cpvc tee fitting 1 inch plumbing connector', desc: 'CPVC equal tee for 1 inch pipes. Solvent weld connection.', specs: { size: '1 inch', type: 'Equal Tee', material: 'CPVC' } },
  { name: 'Hindware Bathroom Basin White', brand: 'Hindware', category: 'Plumbing & Sanitary', sub: 'Taps & Faucets', unit: 'piece', mrp: 3200, keywords: 'hindware wash basin bathroom white ceramic sanitaryware', desc: 'White vitreous china wall-hung wash basin. 550mm x 430mm.', specs: { material: 'Vitreous China', size: '550x430mm', color: 'White', mounting: 'Wall-hung' } },
  { name: 'Jaquar Single Lever Sink Faucet', brand: 'Jaquar', category: 'Plumbing & Sanitary', sub: 'Taps & Faucets', unit: 'piece', mrp: 2850, keywords: 'jaquar tap faucet kitchen sink lever chrome plating', desc: 'Chrome-plated single lever kitchen sink faucet with swivel spout.', specs: { finish: 'Chrome', type: 'Single Lever', application: 'Kitchen' } },

  // Electrical
  { name: 'Havells 16A Modular Switch', brand: 'Havells', category: 'Electrical', sub: 'Switches & Sockets', unit: 'piece', mrp: 148, keywords: 'havells switch 16a modular electrical wall switch', desc: 'Havells 16A SP modular switch, white polycarbonate. For light, fan and appliance control.', specs: { rating: '16A/250V', type: 'SP Modular', material: 'Polycarbonate', color: 'White' } },
  { name: 'Legrand 16A Socket with Switch', brand: 'Legrand', category: 'Electrical', sub: 'Switches & Sockets', unit: 'piece', mrp: 285, keywords: 'legrand socket switch 16a modular electrical outlet', desc: 'Legrand Mylinc 16A socket outlet with switch. White, 3-pin universal.', specs: { rating: '16A/250V', type: '3-pin + switch', brand_range: 'Mylinc' } },
  { name: 'Anchor 6A 2-Pin Socket', brand: 'Anchor', category: 'Electrical', sub: 'Switches & Sockets', unit: 'piece', mrp: 42, keywords: 'anchor socket 6a 2-pin outlet electrical modular', desc: 'Anchor Roma 6A 2-pin socket outlet. Economical and reliable.', specs: { rating: '6A/250V', type: '2-pin', brand_range: 'Roma' } },
  { name: 'Polycab 2.5 sqmm FR PVC Wire 90m', brand: 'Polycab', category: 'Electrical', sub: 'Wires & Cables', unit: 'roll', mrp: 2350, keywords: 'polycab wire 2.5sqmm fr pvc electrical wiring house', desc: 'Polycab FR grade PVC insulated single-core wire. 2.5 sq mm, 90 metre coil.', specs: { cross_section: '2.5 sq mm', insulation: 'FR PVC', length: '90 metres', standard: 'IS 694' } },
  { name: 'Finolex 1.5 sqmm FR Wire 90m', brand: 'Finolex', category: 'Electrical', sub: 'Wires & Cables', unit: 'roll', mrp: 1480, keywords: 'finolex wire 1.5sqmm fr pvc electrical house wiring', desc: 'Finolex FR PVC insulated copper wire. 1.5 sq mm, 90 metre coil.', specs: { cross_section: '1.5 sq mm', insulation: 'FR PVC', length: '90 metres' } },
  { name: 'Havells 32A DP MCB', brand: 'Havells', category: 'Electrical', sub: 'MCBs & Distribution', unit: 'piece', mrp: 320, keywords: 'havells mcb 32a dp double pole circuit breaker electrical panel', desc: 'Havells Crabtree 32A Double Pole Miniature Circuit Breaker. Curve B/C.', specs: { rating: '32A', poles: 'Double Pole', curve: 'C', breaking_capacity: '10 kA' } },
  { name: 'Legrand 63A 4-Pole MCB', brand: 'Legrand', category: 'Electrical', sub: 'MCBs & Distribution', unit: 'piece', mrp: 1650, keywords: 'legrand mcb 63a 4 pole circuit breaker main switch', desc: 'Legrand DX3 63A 4-pole MCB for main incomer protection.', specs: { rating: '63A', poles: '4 Pole', breaking_capacity: '10 kA' } },
  { name: 'Philips 18W LED Bulb Cool Day (Pack of 6)', brand: 'Philips', category: 'Electrical', sub: 'LED Lighting', unit: 'pack', mrp: 580, keywords: 'philips led bulb 18w cool daylight white energy saving pack 6', desc: 'Philips 18W E27 LED bulb — 6500K cool daylight. 1600 lumens. Pack of 6.', specs: { wattage: '18W', color_temp: '6500K Cool', lumens: '1600', base: 'E27', pack: '6 pieces' } },
  { name: 'Havells 1200mm Ceiling Fan', brand: 'Havells', category: 'Electrical', sub: 'Fans & Exhaust', unit: 'piece', mrp: 3200, keywords: 'havells ceiling fan 1200mm 48 inch energy efficient remote', desc: 'Havells 1200mm premium ceiling fan. 72W energy-efficient motor. 3-speed control.', specs: { sweep: '1200mm', power: '72W', speed: '350 RPM', blades: '3' } },

  // Tools & Machinery
  { name: 'Bosch Professional Angle Grinder 4 inch GWS 600', brand: 'Bosch', category: 'Tools & Machinery', sub: 'Power Tools', unit: 'piece', mrp: 3750, keywords: 'bosch angle grinder 4 inch gws600 professional power tool grinding', desc: 'Bosch Professional 4" angle grinder. 670W motor, 11000 RPM, 1.7 kg. Includes wheel guard.', specs: { power: '670W', disc_size: '100mm / 4 inch', speed: '11000 RPM', weight: '1.7 kg', model: 'GWS 600' } },
  { name: 'Makita HP1631K Hammer Drill', brand: 'Makita', category: 'Tools & Machinery', sub: 'Drilling & Cutting', unit: 'piece', mrp: 5200, keywords: 'makita hammer drill hp1631 concrete drilling power tool', desc: 'Makita 13mm hammer drill. 710W, 2900 RPM, 2-speed gearbox. Variable speed.', specs: { chuck: '13mm', power: '710W', max_drilling_concrete: '16mm', weight: '1.8 kg', model: 'HP1631K' } },
  { name: 'Stanley Hand Saw 22 inch', brand: 'Stanley', category: 'Tools & Machinery', sub: 'Hand Tools', unit: 'piece', mrp: 480, keywords: 'stanley hand saw 22 inch wood cutting carpentry sharp', desc: 'Stanley FatMax 22" hand saw. 8 TPI, hardpoint teeth. Dual chrome etch blade.', specs: { length: '22 inch / 550mm', TPI: '8', blade: 'Hardpoint Taper Ground' } },
  { name: 'Taparia Combination Plier 8 inch', brand: 'Taparia', category: 'Tools & Machinery', sub: 'Hand Tools', unit: 'piece', mrp: 280, keywords: 'taparia plier combination 8 inch hand tool electrical gripping', desc: 'Taparia 200mm combination plier. Drop-forged chrome-vanadium steel. PVC dipped handles.', specs: { length: '200mm / 8 inch', material: 'Chrome Vanadium', handles: 'PVC dipped' } },
  { name: 'Bosch GSB 550 Impact Drill Machine', brand: 'Bosch', category: 'Tools & Machinery', sub: 'Drilling & Cutting', unit: 'piece', mrp: 2850, keywords: 'bosch gsb 550 impact drill machine concrete wall drilling', desc: 'Bosch GSB 550 550W impact drill. 13mm chuck, 2800 RPM. Ideal for concrete & masonry.', specs: { power: '550W', chuck: '13mm', speed: '2800 RPM', model: 'GSB 550' } },
  { name: 'Taparia 19mm Open End Spanner', brand: 'Taparia', category: 'Tools & Machinery', sub: 'Hand Tools', unit: 'piece', mrp: 95, keywords: 'taparia spanner 19mm open end hand tool wrench', desc: 'Taparia single-ended open jaw spanner. 19mm. Drop-forged steel.', specs: { size: '19mm', type: 'Open End', material: 'Drop-forged Steel' } },
  { name: 'Dewalt 20V Cordless Drill Driver', brand: 'Dewalt', category: 'Tools & Machinery', sub: 'Power Tools', unit: 'piece', mrp: 8500, keywords: 'dewalt cordless drill driver 20v battery power tool', desc: 'Dewalt 20V MAX cordless drill/driver with 2Ah battery and charger.', specs: { voltage: '20V', max_torque: '47 Nm', chuck: '13mm', weight: '1.5 kg' } },

  // Paints & Chemicals
  { name: 'Asian Paints Apex Exterior Emulsion 20L', brand: 'Asian Paints', category: 'Paints & Chemicals', sub: 'Exterior Paints', unit: 'can', mrp: 4750, keywords: 'asian paints apex exterior emulsion 20 litre weatherproof paint', desc: 'Asian Paints Apex — superior weatherproof exterior emulsion paint. 20L. Excellent UV resistance.', specs: { volume: '20 litres', type: 'Exterior Emulsion', finish: 'Matt', coverage: '90-110 sqft/litre', drying: '2 hours' } },
  { name: 'Berger WeatherCoat All Guard 20L', brand: 'Berger', category: 'Paints & Chemicals', sub: 'Exterior Paints', unit: 'can', mrp: 4650, keywords: 'berger weathercoat all guard exterior paint 20 litre', desc: 'Berger WeatherCoat All Guard — premium exterior acrylic emulsion. 20L.', specs: { volume: '20 litres', type: 'Acrylic Exterior Emulsion', recoat: '2-4 hours' } },
  { name: 'Nerolac Impressions Excel Interior 4L', brand: 'Nerolac', category: 'Paints & Chemicals', sub: 'Interior Paints', unit: 'can', mrp: 1250, keywords: 'nerolac impressions excel interior emulsion 4 litre paint wall', desc: 'Nerolac Impressions Excel HD — premium interior acrylic emulsion. 4L. Washable & stain resistant.', specs: { volume: '4 litres', type: 'Interior Emulsion', sheen: 'Low Sheen', coverage: '130-150 sqft/litre' } },
  { name: 'Asian Paints Tractor Emulsion 20L', brand: 'Asian Paints', category: 'Paints & Chemicals', sub: 'Interior Paints', unit: 'can', mrp: 2100, keywords: 'asian paints tractor emulsion interior paint 20 litre wall', desc: 'Asian Paints Tractor Emulsion — economical interior wall paint. 20L.', specs: { volume: '20 litres', type: 'Interior Emulsion', VOC: 'Low' } },
  { name: 'Berger Bison Interior Wall Putty 5kg', brand: 'Berger', category: 'Paints & Chemicals', sub: 'Primers', unit: 'bag', mrp: 360, keywords: 'berger bison wall putty interior smooth finish primer base', desc: 'White cement-based wall putty for smooth base coat before painting. 5kg.', specs: { weight: '5kg', type: 'Wall Putty', base: 'White Cement', coverage: '25-30 sqft/kg' } },

  // Steel & Metal
  { name: 'JSW Neosteel Fe-500D TMT Bar 12mm', brand: 'JSW', category: 'Steel & Metal', sub: 'TMT Bars', unit: 'piece', mrp: 78, keywords: 'jsw tmt bar 12mm fe500d steel reinforcement rebar', desc: 'JSW Neosteel Fe-500D grade high-strength TMT reinforcement bar. 12mm diameter. Per running metre.', specs: { diameter: '12mm', grade: 'Fe-500D', standard: 'IS 1786', length: '12m/piece' } },
  { name: 'Tata Tiscon TMT Bar 10mm Fe-500D', brand: 'Tata Tiscon', category: 'Steel & Metal', sub: 'TMT Bars', unit: 'piece', mrp: 65, keywords: 'tata tiscon tmt bar 10mm fe500d reinforcement concrete', desc: 'Tata Tiscon SD — super ductile TMT reinforcement bar. 10mm. Per metre.', specs: { diameter: '10mm', grade: 'Fe-500D SD', standard: 'IS 1786' } },
  { name: 'SAIL TMT Bar 16mm Fe-500', brand: 'SAIL', category: 'Steel & Metal', sub: 'TMT Bars', unit: 'piece', mrp: 98, keywords: 'sail tmt bar 16mm fe500 steel reinforcement construction', desc: 'SAIL (Steel Authority of India) TMT bar. Fe-500 grade. 16mm diameter. Per metre.', specs: { diameter: '16mm', grade: 'Fe-500', standard: 'IS 1786' } },
  { name: 'MS Flat Bar 50x6mm', brand: 'Generic', category: 'Steel & Metal', sub: 'MS Sections', unit: 'piece', mrp: 155, keywords: 'ms flat bar 50x6mm mild steel section fabrication', desc: 'Mild steel flat bar 50x6mm. 6 metre length. Used for fabrication & grillwork.', specs: { size: '50x6mm', length: '6m', material: 'Mild Steel (MS)' } },
  { name: 'GI Sheet 0.5mm 8x4 feet', brand: 'Generic', category: 'Steel & Metal', sub: 'GI Sheets', unit: 'piece', mrp: 1250, keywords: 'gi sheet galvanised iron 0.5mm 8x4 feet roofing shed', desc: 'Galvanised iron sheet 0.5mm thickness, 8x4 feet (2440x1220mm). For roofing and shed construction.', specs: { thickness: '0.5mm', size: '8x4 feet / 2440x1220mm', coating: 'Hot-Dip Galvanised' } },

  // Fasteners & Hardware
  { name: 'GKW Hex Bolt M12x50 (Pack of 50)', brand: 'GKW', category: 'Fasteners & General Hardware', sub: 'Bolts & Nuts', unit: 'pack', mrp: 280, keywords: 'hex bolt m12 50mm stainless steel fastener pack 50', desc: 'GKW M12x50mm hex head bolt, Grade 8.8. Pack of 50 pieces.', specs: { size: 'M12x50mm', grade: '8.8', material: 'Mild Steel', qty: '50 pieces' } },
  { name: 'Rawlplug Expansion Anchor M10 (Box of 50)', brand: 'Rawlplug', category: 'Fasteners & General Hardware', sub: 'Anchors', unit: 'box', mrp: 420, keywords: 'rawlplug expansion anchor m10 wall fastener concrete masonry', desc: 'Rawlplug steel expansion anchor bolt M10. For concrete and masonry. Box of 50.', specs: { size: 'M10', material: 'Zinc-plated Steel', qty: '50 pieces', application: 'Concrete/Masonry' } },
  { name: 'Phillip Screw 8x1.5 inch (500 pcs)', brand: 'Generic', category: 'Fasteners & General Hardware', sub: 'Screws', unit: 'box', mrp: 220, keywords: 'phillip screw 8x1.5 inch wood self tapping 500 piece', desc: 'Self-tapping Philips head screw 8 gauge x 1.5 inch. 500-piece box.', specs: { size: '8 gauge x 1.5 inch', head: 'Philips', material: 'Bright Zinc Plated', qty: '500 pieces' } },
  { name: 'Wire Nail 4 inch (1kg)', brand: 'Generic', category: 'Fasteners & General Hardware', sub: 'Nails', unit: 'kg', mrp: 85, keywords: 'wire nail 4 inch iron nails 1kg construction carpentry', desc: 'Mild steel bright wire nails. 4 inch (100mm). 1 kg bundle. For general construction.', specs: { size: '4 inch / 100mm', material: 'MS Wire', weight: '1kg' } },

  // Doors & Windows
  { name: 'Fenesta uPVC Sliding Window 4x4 ft', brand: 'Fenesta', category: 'Doors & Windows', sub: 'uPVC Windows', unit: 'piece', mrp: 12500, keywords: 'fenesta upvc sliding window 4x4 feet aluminium frame glass', desc: 'Fenesta 3-track uPVC sliding window. 4x4 feet (1200x1200mm). 5mm clear glass included.', specs: { size: '4x4 feet', material: 'uPVC', glass: '5mm clear', type: '3-track sliding' } },
  { name: 'Godrej Magnetic Door Lock', brand: 'Godrej', category: 'Doors & Windows', sub: 'Handles & Locks', unit: 'piece', mrp: 1850, keywords: 'godrej magnetic door lock mortise lock hardware safety', desc: 'Godrej 6-lever steel mortise door lock set. Nickel silver finish.', specs: { levers: '6', finish: 'Nickel Silver', type: 'Mortise Lock' } },
  { name: 'Hafele Stainless Steel Door Handle', brand: 'Hafele', category: 'Doors & Windows', sub: 'Handles & Locks', unit: 'piece', mrp: 850, keywords: 'hafele door handle stainless steel flush pull lever', desc: 'Hafele lever door handle, satin stainless steel. For wooden or steel doors.', specs: { material: 'Stainless Steel 304', finish: 'Satin', type: 'Lever Handle' } },

  // Tiles & Flooring
  { name: 'Kajaria Vitrified Floor Tile 600x600mm Box', brand: 'Kajaria', category: 'Tiles & Flooring', sub: 'Vitrified Tiles', unit: 'box', mrp: 1850, keywords: 'kajaria vitrified floor tile 600x600 box 4 pieces', desc: 'Kajaria double-charged vitrified floor tile 600x600mm. Per box (4 pieces = 1.44 sqm).', specs: { size: '600x600mm', type: 'Vitrified', finish: 'Polished', coverage: '1.44 sqm/box', pieces_per_box: '4' } },
  { name: 'Somany Ceramic Wall Tile 300x450mm Box', brand: 'Somany', category: 'Tiles & Flooring', sub: 'Wall Tiles', unit: 'box', mrp: 850, keywords: 'somany ceramic wall tile 300x450 bathroom kitchen', desc: 'Somany ceramic wall tile 300x450mm. Per box (10 pieces = 1.35 sqm).', specs: { size: '300x450mm', type: 'Ceramic Wall', finish: 'Glossy', coverage: '1.35 sqm/box' } },
  { name: 'Pidilite Tile Adhesive 20kg', brand: 'Pidilite', category: 'Tiles & Flooring', sub: 'Tile Adhesives', unit: 'bag', mrp: 520, keywords: 'pidilite tile adhesive 20kg ceramic tile fixing powder', desc: 'Pidilite wall and floor tile adhesive. 20kg bag. Coverage 4–5 sqm per bag.', specs: { weight: '20kg', type: 'Cement-based Adhesive', coverage: '4-5 sqm/bag' } },

  // Safety & PPE
  { name: 'Karam Safety Helmet EN397 White', brand: 'Karam', category: 'Safety & PPE', sub: 'Helmets', unit: 'piece', mrp: 380, keywords: 'karam safety helmet white hard hat construction site ppe', desc: 'Karam EN 397 safety helmet. White ABS shell, 6-point polyamide webbing suspension.', specs: { standard: 'EN 397 / IS 2925', material: 'ABS', color: 'White', type: 'Full Brim' } },
  { name: 'Honeywell Safety Goggles Chemical Splash', brand: 'Honeywell', category: 'Safety & PPE', sub: 'Eye Protection', unit: 'piece', mrp: 320, keywords: 'honeywell safety goggles chemical splash ppe eye protection', desc: 'Honeywell chemical splash safety goggles. Clear polycarbonate lens. EN166 certified.', specs: { standard: 'EN166', lens: 'Polycarbonate Clear', protection: 'Chemical Splash' } },
  { name: 'Vaultex Leather Safety Gloves Cut-Resistant', brand: 'Vaultex', category: 'Safety & PPE', sub: 'Gloves', unit: 'pair', mrp: 180, keywords: 'safety gloves leather cut resistant vaultex ppe work', desc: 'Full-grain cow leather palm gloves with cotton back. Cut-resistant. Size L.', specs: { material: 'Full-grain Leather', protection: 'Cut-resistant Level B', size: 'Large (10)' } },
  { name: 'Hillson Safety Shoe Steel Toe', brand: 'Hillson', category: 'Safety & PPE', sub: 'Safety Shoes', unit: 'pair', mrp: 1450, keywords: 'hillson safety shoe steel toe ppe construction site shoes', desc: 'Hillson safety boot with steel toe cap. IS 15298 certified. Size 7-11.', specs: { standard: 'IS 15298', toe: 'Steel Toe Cap', sole: 'PU/Rubber Composite', sizes: '7-11' } },

  // Welding & Cutting
  { name: 'D&H Secheron 7018 Welding Electrode 3.15mm (5kg)', brand: 'D&H Secheron', category: 'Welding & Cutting', sub: 'Welding Electrodes', unit: 'pack', mrp: 580, keywords: 'welding electrode 7018 3.15mm e7018 dh secheron 5kg pack', desc: 'E7018 low-hydrogen welding electrode for structural steel. 3.15mm, 5kg pack.', specs: { classification: 'E7018', diameter: '3.15mm', weight: '5kg', application: 'Structural Steel' } },
  { name: 'Ador Fondarc 6013 Welding Electrode 2.5mm (5kg)', brand: 'Ador', category: 'Welding & Cutting', sub: 'Welding Electrodes', unit: 'pack', mrp: 420, keywords: 'ador fondarc 6013 welding electrode 2.5mm 5kg pack', desc: 'E6013 rutile-coated general purpose welding electrode. 2.5mm, 5kg.', specs: { classification: 'E6013', diameter: '2.5mm', weight: '5kg', coating: 'Rutile' } },
  { name: 'Bosch Cutting Disc 4 inch (Pack of 10)', brand: 'Bosch', category: 'Welding & Cutting', sub: 'Cutting Discs', unit: 'pack', mrp: 350, keywords: 'bosch cutting disc 4 inch angle grinder steel metal 10 pack', desc: 'Bosch Expert 4-inch cut-off disc for steel and metal. 1mm thickness. Pack of 10.', specs: { size: '100mm / 4 inch', thickness: '1mm', application: 'Metal/Steel', qty: '10 discs' } },
  { name: 'Lincoln Electric MIG Welder 200A', brand: 'Lincoln Electric', category: 'Welding & Cutting', sub: 'Welding Machines', unit: 'piece', mrp: 28500, keywords: 'lincoln electric mig welder 200a welding machine mig/mag', desc: 'Lincoln Electric 200A single-phase MIG/MAG welding machine. Wire speed 2-18 m/min.', specs: { output: '200A', input: '230V, 50Hz', wire_speed: '2-18 m/min', duty_cycle: '60% at 180A' } },

  // Adhesives & Sealants
  { name: 'Fevicol SH White Adhesive 1kg', brand: 'Fevicol', category: 'Adhesives, Tapes & Sealants', sub: 'Construction Adhesives', unit: 'piece', mrp: 185, keywords: 'fevicol sh adhesive 1kg white glue wood carpentry furniture', desc: 'Fevicol SH — synthetic resin adhesive for wood and laminates. 1kg container.', specs: { weight: '1kg', type: 'Synthetic Resin', application: 'Wood, Laminates, Furniture' } },
  { name: 'Pidilite Fevibond Contact Adhesive 500ml', brand: 'Pidilite', category: 'Adhesives, Tapes & Sealants', sub: 'Construction Adhesives', unit: 'piece', mrp: 320, keywords: 'fevibond contact adhesive 500ml rubber metal leather bonding', desc: 'Fevibond multipurpose contact adhesive. 500ml. Bonds rubber, metal, leather, plastic.', specs: { volume: '500ml', type: 'Contact Adhesive', bonding: 'Instant strong bond' } },
  { name: 'Dowsil 785 Silicone Sealant 280ml White', brand: 'Dow', category: 'Adhesives, Tapes & Sealants', sub: 'Silicone Sealants', unit: 'piece', mrp: 280, keywords: 'dowsil silicone sealant 280ml white bathroom kitchen weatherproof', desc: 'Dowsil 785 acetoxy silicone sealant for bathrooms and kitchens. 280ml. White.', specs: { volume: '280ml', color: 'White', type: 'Acetoxy Silicone', application: 'Bathroom, Kitchen, Sanitary' } },
  { name: 'Pidilite Sealant White 250ml', brand: 'Pidilite', category: 'Adhesives, Tapes & Sealants', sub: 'Silicone Sealants', unit: 'piece', mrp: 165, keywords: 'pidilite sealant white 250ml silicone waterproof gap filler', desc: 'Pidilite M-Seal waterproof silicone sealant. 250ml. White.', specs: { volume: '250ml', color: 'White', type: 'Silicone Sealant' } },
  { name: 'Bopp Packaging Tape 2 inch 65m (Pack of 6)', brand: 'Generic', category: 'Adhesives, Tapes & Sealants', sub: 'PTFE Tapes', unit: 'pack', mrp: 180, keywords: 'bopp tape packaging 2 inch 65m pack 6 brown carton sealing', desc: 'BOPP brown packaging tape. 2 inch x 65 metres. Pack of 6 rolls.', specs: { width: '2 inch / 48mm', length: '65m per roll', qty: '6 rolls', color: 'Brown', type: 'BOPP' } },

  // More electrical
  { name: 'Polycab 6 sqmm FR Wire 90m', brand: 'Polycab', category: 'Electrical', sub: 'Wires & Cables', unit: 'roll', mrp: 4800, keywords: 'polycab wire 6sqmm fr cable heavy electrical appliance', desc: 'Polycab FR PVC insulated 6 sq mm single-core wire. 90 metre coil. For heavy appliances.', specs: { cross_section: '6 sq mm', length: '90m', insulation: 'FR PVC', standard: 'IS 694' } },
  { name: 'Havells 20A DP Switch', brand: 'Havells', category: 'Electrical', sub: 'Switches & Sockets', unit: 'piece', mrp: 185, keywords: 'havells switch 20a dp double pole modular heavy duty', desc: 'Havells 20A DP (double pole) modular heavy duty switch for AC/geyser.', specs: { rating: '20A', poles: 'Double Pole', type: 'Heavy Duty' } },

  // More plumbing
  { name: 'Grundfos Submersible Pump 0.5HP', brand: 'Grundfos', category: 'Plumbing & Sanitary', sub: 'Tanks & Pumps', unit: 'piece', mrp: 12500, keywords: 'grundfos submersible pump 0.5hp borewell water pump', desc: 'Grundfos SQFlex 0.5 HP submersible borewell pump. 50m head, single-phase 230V.', specs: { power: '0.5 HP / 370W', head: '50m max', discharge: '1.2 m³/h', voltage: '230V' } },
  { name: 'Sintex Plastic Water Tank 500L', brand: 'Sintex', category: 'Plumbing & Sanitary', sub: 'Tanks & Pumps', unit: 'piece', mrp: 4200, keywords: 'sintex water tank 500 litre overhead plastic cylindrical', desc: 'Sintex triple-layer overhead water storage tank. 500 litre capacity. UV stabilised.', specs: { capacity: '500 litres', layers: '3-layer insulated', material: 'LLDPE', UV_protection: 'Yes' } },
  { name: 'Zoloto Gate Valve 1 inch', brand: 'Zoloto', category: 'Plumbing & Sanitary', sub: 'Valves', unit: 'piece', mrp: 380, keywords: 'zoloto gate valve 1 inch brass plumbing water control', desc: 'Zoloto 1" brass gate valve. PN 20 rated. For water pipelines.', specs: { size: '1 inch', material: 'Brass', pressure: 'PN 20', type: 'Gate Valve' } },

  // More building materials
  { name: 'Asian Paints SmartCare Dampfix 4kg', brand: 'Asian Paints', category: 'Building Materials', sub: 'Waterproofing', unit: 'can', mrp: 850, keywords: 'asian paints smartcare dampfix waterproof coating damp wall 4kg', desc: 'Asian Paints SmartCare Dampfix for treating damp, seeping walls. 4kg pack.', specs: { weight: '4kg', type: 'Polymer Modified Cement', coverage: '20-25 sqft/kg' } },
  { name: 'Polysand Coarse Sand (1 tonne)', brand: 'Local', category: 'Building Materials', sub: 'Sand & Aggregates', unit: 'tonne', mrp: 1200, keywords: 'coarse river sand construction concrete plastering 1 tonne', desc: 'Clean coarse river sand for concrete and plastering. 1 tonne delivery.', specs: { type: 'Coarse River Sand', quantity: '1 tonne', silt_content: '<3%' } },

  // More tools
  { name: 'Bosch GST 65 Jigsaw', brand: 'Bosch', category: 'Tools & Machinery', sub: 'Power Tools', unit: 'piece', mrp: 3200, keywords: 'bosch jigsaw gst65 power tool wood cutting curve', desc: 'Bosch GST 65 compact jigsaw. 500W, 3100 SPM. Cuts wood, plastic, aluminium.', specs: { power: '500W', stroke_rate: '3100 SPM', max_wood: '65mm', model: 'GST 65' } },
  { name: 'Taparia 5m Measuring Tape', brand: 'Taparia', category: 'Tools & Machinery', sub: 'Measuring Tools', unit: 'piece', mrp: 120, keywords: 'taparia measuring tape 5m surveying tape measure carpentry', desc: 'Taparia steel measuring tape. 5 metre x 19mm. Auto-lock with belt clip.', specs: { length: '5 metres', width: '19mm', graduation: '1mm', material: 'Steel Blade' } },
  { name: 'Stanley FatMax Spirit Level 24 inch', brand: 'Stanley', category: 'Tools & Machinery', sub: 'Measuring Tools', unit: 'piece', mrp: 850, keywords: 'stanley spirit level 24 inch fatmax measuring level construction', desc: 'Stanley FatMax 24" I-beam spirit level. Shockproof vials, magnetic base option.', specs: { length: '24 inch / 600mm', vials: '3 (Top, Side, Plumb)', material: 'Die-cast Aluminium' } },

  // More Safety
  { name: '3M Dust Mask N95 FFP2 (Box of 20)', brand: '3M', category: 'Safety & PPE', sub: 'Safety Nets', unit: 'box', mrp: 580, keywords: '3m dust mask n95 ffp2 respirator dust protection 20 pack', desc: '3M Particulate Respirator 8210 N95. Filters 95% airborne particles. Box of 20.', specs: { standard: 'N95 / FFP2', filtration: '95%', qty: '20 pieces', type: 'Flat Fold Disposable' } },
  { name: 'Karam Full Body Safety Harness', brand: 'Karam', category: 'Safety & PPE', sub: 'Reflective Vests', unit: 'piece', mrp: 2800, keywords: 'karam full body harness safety fall protection height work', desc: 'Karam PN 52 full-body safety harness. 25mm polyester webbing. EN 361 certified.', specs: { standard: 'EN 361 / IS 3521', webbing: '25mm Polyester', type: 'Full Body Harness', max_weight: '140 kg' } },

  // HVAC
  { name: 'Havells Ventilation Fan 6 inch', brand: 'Havells', category: 'HVAC & Ventilation', sub: 'Exhaust Fans', unit: 'piece', mrp: 650, keywords: 'havells ventilation fan exhaust 6 inch bathroom kitchen wall fan', desc: 'Havells 150mm ventilation/exhaust fan. 30W, 1300 RPM. For bathrooms and kitchens.', specs: { size: '150mm / 6 inch', power: '30W', speed: '1300 RPM', airflow: '200 m³/h' } },
  { name: 'Crompton Air Circulator Fan 18 inch', brand: 'Crompton', category: 'HVAC & Ventilation', sub: 'Exhaust Fans', unit: 'piece', mrp: 1850, keywords: 'crompton industrial fan 18 inch pedestal stand fan workshop', desc: 'Crompton 18" high speed industrial/workshop pedestal fan. 180W.', specs: { size: '18 inch', power: '180W', type: 'Pedestal/Industrial' } },

  // Agriculture
  { name: 'Netafim Drip Irrigation Kit — ½ Acre', brand: 'Netafim', category: 'Agriculture & Irrigation', sub: 'Drip Irrigation', unit: 'set', mrp: 8500, keywords: 'netafim drip irrigation kit half acre garden farm water saving', desc: 'Netafim complete drip irrigation kit for ½ acre. Includes laterals, emitters, filter, header.', specs: { coverage: '½ acre', emitters: '2 LPH at 1m spacing', filter: 'Y-filter 120 mesh', includes: 'Complete kit' } },
  { name: 'Kirloskar Star-1 Submersible Pump 1HP', brand: 'Kirloskar', category: 'Agriculture & Irrigation', sub: 'Submersible Pumps', unit: 'piece', mrp: 9800, keywords: 'kirloskar submersible pump 1hp borewell star agriculture irrigation', desc: 'Kirloskar Star-1 1HP submersible borewell pump. 3" bore, 60m head. Single phase.', specs: { power: '1 HP / 750W', bore_size: '3 inch', max_head: '60m', discharge: '2 m³/h' } },

  // Material Handling
  { name: 'Aluminium Folding Ladder 8 feet', brand: 'Werner', category: 'Material Handling', sub: 'Ladders', unit: 'piece', mrp: 3200, keywords: 'aluminium ladder 8 feet folding step ladder construction work', desc: 'Werner aluminium folding step ladder. 8 feet (2.4m). 150kg load capacity. Non-slip rubber feet.', specs: { height: '8 feet / 2.4m', material: 'Aluminium', load_capacity: '150 kg', type: 'Folding Step Ladder' } },
  { name: 'Platform Trolley 500kg Capacity', brand: 'Generic', category: 'Material Handling', sub: 'Trolleys', unit: 'piece', mrp: 4800, keywords: 'platform trolley 500kg hand trolley material handling warehouse', desc: 'Heavy-duty steel platform trolley. 500kg capacity. 1000x600mm platform. 6" rubber wheels.', specs: { capacity: '500 kg', platform: '1000x600mm', wheels: '6 inch solid rubber', material: 'Mild Steel' } },

  // Security
  { name: 'Godrej Padlock 50mm', brand: 'Godrej', category: 'Security & Safety Systems', sub: 'Padlocks', unit: 'piece', mrp: 380, keywords: 'godrej padlock 50mm heavy duty lock security brass', desc: 'Godrej 50mm double locking padlock. Hardened steel shackle. 3 keys included.', specs: { size: '50mm', material: 'Hardened Steel', keys: '3 keys', shackle: 'Hardened Steel' } },
  { name: 'Dorset Door Closer 80kg', brand: 'Dorset', category: 'Security & Safety Systems', sub: 'Door Closers', unit: 'piece', mrp: 850, keywords: 'dorset door closer 80kg hydraulic automatic self closing door', desc: 'Dorset hydraulic door closer. 80kg door capacity. Adjustable closing speed.', specs: { capacity: '80 kg door', type: 'Hydraulic', adjustable: 'Yes', finish: 'Aluminium' } },

  // Bathroom
  { name: 'Hindware Smart Concealed Cistern 6L', brand: 'Hindware', category: 'Bathroom & Home Improvement', sub: 'Basin & WC', unit: 'piece', mrp: 6500, keywords: 'hindware concealed cistern 6 litre wc toilet flush tank smart', desc: 'Hindware Smart Collection wall-hung WC with concealed cistern. 6L flush.', specs: { flush: '6 litres', type: 'Concealed Cistern Wall-hung', material: 'Vitreous China' } },
  { name: 'Jaquar 8-inch Rain Shower Head', brand: 'Jaquar', category: 'Bathroom & Home Improvement', sub: 'Showers & Faucets', unit: 'piece', mrp: 3200, keywords: 'jaquar rain shower head 8 inch overhead overhead bathroom', desc: 'Jaquar 8-inch overhead round rain shower. Chrome finish. 200mm diameter.', specs: { size: '8 inch / 200mm', finish: 'Chrome', type: 'Overhead Rain Shower' } },

  // Glass & Aluminium
  { name: 'Clear Float Glass 5mm (per sqm)', brand: 'Saint Gobain', category: 'Glass & Aluminium', sub: 'Float Glass', unit: 'sqm', mrp: 380, keywords: 'float glass 5mm clear transparent saint gobain glazing windows', desc: 'Saint-Gobain clear float glass 5mm thickness. Per square metre.', specs: { thickness: '5mm', type: 'Clear Float Glass', visible_light: '90%' } },
  { name: 'Aluminium Section 2x1 inch Box Profile 6m', brand: 'Hindalco', category: 'Glass & Aluminium', sub: 'Aluminium Sections', unit: 'piece', mrp: 680, keywords: 'aluminium section box profile 2x1 inch 6m extrusion fabrication', desc: 'Hindalco aluminium hollow box section 50x25mm (2x1 inch). 6 metre length.', specs: { size: '50x25mm (2x1 inch)', length: '6 metres', alloy: '6063 T5', finish: 'Mill Finish' } },

  // Testing & Measuring
  { name: 'Fluke 107 True-RMS Multimeter', brand: 'Fluke', category: 'Testing & Measuring', sub: 'Multimeters', unit: 'piece', mrp: 4800, keywords: 'fluke 107 multimeter true rms electrical testing measuring voltage', desc: 'Fluke 107 True-RMS palm-size digital multimeter. Measures AC/DC voltage, resistance, continuity.', specs: { model: 'Fluke 107', type: 'True-RMS', voltage_ac: '600V', voltage_dc: '600V', continuity: 'Yes' } },
  { name: 'Clamp Meter 400A AC/DC', brand: 'Fluke', category: 'Testing & Measuring', sub: 'Clamp Meters', unit: 'piece', mrp: 8500, keywords: 'clamp meter 400a ac dc electrical testing fluke panel board', desc: 'Fluke 376 FC True-RMS AC/DC clamp meter with iFlex. 400A AC/DC.', specs: { model: 'Fluke 376 FC', AC_current: '400A', DC_current: '400A', jaw_size: '40mm' } },

  // DIY
  { name: 'Bosch EasyDrill 12 Cordless Drill', brand: 'Bosch', category: 'DIY & Craft Hardware', sub: 'DIY Tool Kits', unit: 'piece', mrp: 2800, keywords: 'bosch easydrill 12v cordless drill diy home use light', desc: 'Bosch EasyDrill 12V cordless drill/driver with 1 battery. For DIY and home applications.', specs: { voltage: '12V', chuck: '10mm', torque: '18 Nm', weight: '0.9 kg (without battery)' } },
  { name: 'Fevicol MR White Adhesive 1kg', brand: 'Fevicol', category: 'DIY & Craft Hardware', sub: 'Craft Materials', unit: 'piece', mrp: 120, keywords: 'fevicol mr 1kg white glue craft paper board furniture laminate', desc: 'Fevicol MR multipurpose white adhesive. 1kg. For paper, craft, light wood and board.', specs: { weight: '1kg', type: 'PVA White Glue', drying: 'Clear transparent' } },

  // Garden
  { name: 'Gardenmaster Garden Hose 15m', brand: 'Gardenmaster', category: 'Garden & Outdoor', sub: 'Hoses & Fittings', unit: 'piece', mrp: 580, keywords: 'garden hose 15m 3 layer pipe watering outdoor lawn', desc: 'Gardenmaster 3-layer reinforced garden hose with fittings. 15 metre, ½ inch.', specs: { length: '15 metres', diameter: '½ inch', layers: '3-layer PVC reinforced', pressure: '25 bar' } },
  { name: 'Spear & Jackson Garden Spade', brand: 'Spear & Jackson', category: 'Garden & Outdoor', sub: 'Garden Tools', unit: 'piece', mrp: 850, keywords: 'garden spade digging tool outdoor soil gardening', desc: 'Spear & Jackson digging spade. Carbon steel blade, ash wood handle. 28" handle.', specs: { blade: 'Carbon Steel', handle: 'Ash Wood', handle_length: '28 inch' } },

  // Industrial
  { name: 'SKF Deep Groove Ball Bearing 6205', brand: 'SKF', category: 'Industrial & MRO', sub: 'Bearings', unit: 'piece', mrp: 280, keywords: 'skf ball bearing 6205 deep groove industrial machinery motor', desc: 'SKF 6205 deep groove ball bearing. 25mm bore, 52mm OD. 2RS sealed.', specs: { bore: '25mm', OD: '52mm', width: '15mm', type: 'Deep Groove 2RS', designation: '6205' } },
  { name: 'Fenner V-Belt A Section A-50', brand: 'Fenner', category: 'Industrial & MRO', sub: 'Belts & Pulleys', unit: 'piece', mrp: 180, keywords: 'fenner v belt a section a50 drive belt industrial machine', desc: 'Fenner Powermaster A-section V-belt A-50 (1270mm OC). For general industrial drives.', specs: { section: 'A', designation: 'A-50', OC_length: '1270mm', width_top: '12.7mm' } },

  // Packaging
  { name: 'Bubble Wrap 1m x 50m Roll', brand: 'Generic', category: 'Packaging & Storage', sub: 'Packaging & Storage', unit: 'roll', mrp: 680, keywords: 'bubble wrap 1m 50m roll packaging packing fragile protection', desc: 'Standard small-bubble protective packing bubble wrap. 1m wide x 50m long roll.', specs: { width: '1 metre', length: '50 metres', bubble_size: '10mm', material: 'LDPE' } },

  // Furniture hardware
  { name: 'Hafele Drawer Channel Soft Close 400mm', brand: 'Hafele', category: 'Furniture Hardware', sub: 'Drawer Channels', unit: 'pair', mrp: 680, keywords: 'hafele drawer channel soft close 400mm undermount slides furniture', desc: 'Hafele undermount full-extension soft-close drawer channel. 400mm length. Pair.', specs: { length: '400mm', type: 'Undermount Soft-close', extension: 'Full Extension', load: '30 kg' } },
  { name: 'Dorma Hydraulic Floor Spring', brand: 'Dorma', category: 'Furniture Hardware', sub: 'Hinges', unit: 'piece', mrp: 3800, keywords: 'dorma hydraulic floor spring door closer frameless glass', desc: 'Dorma BTS 75V hydraulic floor spring for frameless glass doors. 75kg door capacity.', specs: { capacity: '75 kg', type: 'Floor Spring', adjustable: 'Yes — closing speed & latch action' } },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Seeding categories...');
    const catIds: Record<string, number> = {};
    const subIds: Record<string, number> = {};

    for (let i = 0; i < CATEGORIES.length; i++) {
      const cat = CATEGORIES[i];
      const res = await client.query(
        `INSERT INTO categories(name, slug, icon, sort_order)
         VALUES($1, $2, $3, $4)
         ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name
         RETURNING id`,
        [cat.name, cat.slug, cat.icon, i]
      );
      catIds[cat.name] = res.rows[0].id;
      for (const sub of cat.subs) {
        const subSlug = cat.slug + '-' + sub.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const subRes = await client.query(
          `INSERT INTO subcategories(category_id, name, slug)
           VALUES($1, $2, $3)
           ON CONFLICT(category_id, name) DO UPDATE SET name=EXCLUDED.name
           RETURNING id`,
          [catIds[cat.name], sub, subSlug]
        );
        subIds[`${cat.name}::${sub}`] = subRes.rows[0].id;
      }
    }
    console.log(`  ✓ ${CATEGORIES.length} categories, subcategories seeded`);

    console.log('Seeding sellers...');
    const sellerIds: string[] = [];
    for (const seller of DEMO_SELLERS) {
      const res = await client.query(
        `INSERT INTO sellers(shop_name, owner_name, phone, whatsapp, city, latitude, longitude, rating, description, pickup_available, delivery_available, status, is_demo_data, address, state, pincode)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'VERIFIED',true,$12,'Karnataka','575001')
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [
          seller.shop_name, seller.owner_name, seller.phone, seller.whatsapp,
          seller.city, seller.lat, seller.lng, seller.rating,
          seller.description, seller.pickup_available, seller.delivery_available,
          seller.city + ', Karnataka',
        ]
      );
      if (res.rows[0]) sellerIds.push(res.rows[0].id);
    }
    console.log(`  ✓ ${sellerIds.length} sellers seeded`);

    console.log('Seeding products...');
    const productIds: string[] = [];
    for (const p of PRODUCTS) {
      const catId = catIds[p.category];
      if (!catId) { console.warn(`  ⚠ Category not found: ${p.category}`); continue; }
      const subId = p.sub ? subIds[`${p.category}::${p.sub}`] : null;
      const specs = JSON.stringify(p.specs || {});
      const res = await client.query(
        `INSERT INTO products(name, brand, category_id, subcategory_id, description, specifications, unit, mrp, keywords, is_demo_data)
         VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,true)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [p.name, p.brand, catId, subId, p.desc, specs, p.unit, p.mrp, p.keywords]
      );
      if (res.rows[0]) productIds.push(res.rows[0].id);
    }
    console.log(`  ✓ ${productIds.length} products seeded`);

    // Seed product images (use category-based placeholder images via picsum with seed)
    console.log('Seeding product images...');
    let imgCount = 0;
    const allProducts = await client.query('SELECT p.id, c.slug FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.is_demo_data=true');
    for (const prod of allProducts.rows) {
      const seed = parseInt(prod.id.replace(/-/g, '').substring(0, 8), 16) % 1000;
      await client.query(
        `INSERT INTO product_images(product_id, image_url, alt_text, is_primary, sort_order)
         VALUES($1, $2, 'Product image', true, 0)
         ON CONFLICT DO NOTHING`,
        [prod.id, `https://picsum.photos/seed/atprice-${seed}/400/300`]
      );
      imgCount++;
    }
    console.log(`  ✓ ${imgCount} product images seeded`);

    // Seed listings — 3-5 sellers per product for top products, 1-2 for others
    console.log('Seeding seller listings...');
    if (sellerIds.length === 0) { console.warn('  ⚠ No sellers to create listings for'); }
    const allProductIds: Array<{id: string; mrp: number}> = (await client.query('SELECT id, mrp FROM products WHERE is_demo_data=true AND mrp IS NOT NULL')).rows;
    let listingCount = 0;
    for (const prod of allProductIds) {
      const mrp = parseFloat(prod.mrp as unknown as string);
      // Randomly assign 2-5 sellers
      const numSellers = Math.min(sellerIds.length, 2 + Math.floor(Math.random() * 4));
      const shuffled = [...sellerIds].sort(() => Math.random() - 0.5).slice(0, numSellers);
      for (const sellerId of shuffled) {
        const variation = 0.85 + Math.random() * 0.2; // 85-105% of MRP
        const price = Math.round(mrp * variation / 5) * 5; // round to nearest 5
        const availability = Math.random() > 0.15 ? 'IN_STOCK' : (Math.random() > 0.5 ? 'LOW_STOCK' : 'OUT_OF_STOCK');
        const daysAgo = Math.floor(Math.random() * 30);
        const lastUpdated = new Date(Date.now() - daysAgo * 86400000).toISOString();
        await client.query(
          `INSERT INTO seller_listings(seller_id, product_id, price, mrp, availability, pickup_available, delivery_available, active, last_updated_at)
           VALUES($1,$2,$3,$4,$5,true,$6,true,$7)
           ON CONFLICT(seller_id, product_id) DO NOTHING`,
          [sellerId, prod.id, price, mrp, availability, Math.random() > 0.5, lastUpdated]
        );
        listingCount++;
      }
    }
    console.log(`  ✓ ~${listingCount} seller listings seeded`);

    await client.query('COMMIT');
    console.log('\n✅ Seed complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
