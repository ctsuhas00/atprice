import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-navy-950 text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-1 mb-3">
              <span className="text-2xl font-bold text-gold-400">At</span>
              <span className="text-2xl font-bold text-white">Price</span>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Compare Local Hardware Prices. Buy From Local Sellers.
            </p>
            <p className="text-xs text-gray-500">
              Serving Karnataka's construction & hardware community.
            </p>
          </div>

          {/* Customer */}
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">For Customers</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/search" className="hover:text-gold-400 transition-colors">Browse Products</Link></li>
              <li><Link href="/categories/building-materials" className="hover:text-gold-400 transition-colors">Building Materials</Link></li>
              <li><Link href="/categories/electrical" className="hover:text-gold-400 transition-colors">Electrical</Link></li>
              <li><Link href="/categories/plumbing-sanitary" className="hover:text-gold-400 transition-colors">Plumbing</Link></li>
              <li><Link href="/categories/tools-machinery" className="hover:text-gold-400 transition-colors">Tools & Machinery</Link></li>
            </ul>
          </div>

          {/* Sellers */}
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">For Sellers</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/login" className="hover:text-gold-400 transition-colors">List Your Shop</Link></li>
              <li><Link href="/seller/dashboard" className="hover:text-gold-400 transition-colors">Seller Dashboard</Link></li>
              <li><Link href="/seller/listings" className="hover:text-gold-400 transition-colors">Manage Listings</Link></li>
              <li><Link href="/seller/enquiries" className="hover:text-gold-400 transition-colors">View Enquiries</Link></li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">About</h3>
            <ul className="space-y-2 text-sm">
              <li><span className="text-gray-500 cursor-default">How AtPrice Works</span></li>
              <li><span className="text-gray-500 cursor-default">Contact Us</span></li>
              <li><span className="text-gray-500 cursor-default">Privacy Policy</span></li>
              <li><span className="text-gray-500 cursor-default">Terms of Service</span></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-navy-800 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} AtPrice. All rights reserved. Demo data — not real market prices.
          </p>
          <p className="text-xs text-gray-500">
            Bengaluru, Karnataka, India
          </p>
        </div>
      </div>
    </footer>
  );
}
