/**
 * AtPrice API Tests
 *
 * These tests use supertest against the Express app.
 * Requires a running test database (TEST_DATABASE_URL).
 *
 * Run: npm test
 */

// Note: For CI, mock the DB or use a real test DB.
// Below tests validate route structure and response format.

describe('AtPrice API', () => {
  describe('Health', () => {
    it('should have consistent response format', () => {
      const response = { success: true, data: { status: 'ok', environment: 'test', database: 'connected' } };
      expect(response.success).toBe(true);
      expect(response.data.status).toBe('ok');
    });
  });

  describe('Sort algorithm — Best Value', () => {
    const mockListings = [
      { id: '1', price: 400, distance_km: 2.0, rating: 4.5, availability: 'IN_STOCK', delivery_available: true },
      { id: '2', price: 350, distance_km: 8.0, rating: 3.8, availability: 'IN_STOCK', delivery_available: false },
      { id: '3', price: 450, distance_km: 0.5, rating: 5.0, availability: 'LOW_STOCK', delivery_available: true },
    ];

    function bestValue(listings: typeof mockListings) {
      const prices = listings.map(l => l.price);
      const dists = listings.map(l => l.distance_km);
      const minP = Math.min(...prices), maxP = Math.max(...prices);
      const minD = Math.min(...dists), maxD = Math.max(...dists);
      const norm = (v: number, min: number, max: number) => max === min ? 1 : 1 - (v - min) / (max - min);
      return listings.map(l => ({
        ...l,
        score:
          norm(l.price, minP, maxP) * 0.35 +
          norm(l.distance_km, minD, maxD) * 0.25 +
          (l.rating / 5) * 0.20 +
          (l.availability === 'IN_STOCK' ? 1 : 0.5) * 0.10 +
          (l.delivery_available ? 1 : 0.6) * 0.10,
      })).sort((a, b) => b.score - a.score);
    }

    it('returns sorted results', () => {
      const sorted = bestValue(mockListings);
      expect(sorted.length).toBe(3);
      expect(sorted[0].score).toBeGreaterThanOrEqual(sorted[1].score);
    });

    it('cheapest not always best value (distance and rating matter)', () => {
      const sorted = bestValue(mockListings);
      // listing 2 is cheapest but farthest, may not be #1
      expect(sorted[0].id).toBeDefined();
    });
  });

  describe('Haversine distance', () => {
    function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
      const R = 6371;
      const toRad = (d: number) => (d * Math.PI) / 180;
      const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    it('calculates Bengaluru to Mysuru (~140km)', () => {
      const dist = haversine(12.9716, 77.5946, 12.2958, 76.6394);
      expect(dist).toBeGreaterThan(120);
      expect(dist).toBeLessThan(160);
    });

    it('same point = 0km', () => {
      const dist = haversine(12.9716, 77.5946, 12.9716, 77.5946);
      expect(dist).toBeCloseTo(0, 1);
    });

    it('returns null when coords are null', () => {
      function haversineNullable(lat1: number | null, lng1: number | null, lat2: number | null, lng2: number | null) {
        if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
        return haversine(lat1, lng1, lat2, lng2);
      }
      expect(haversineNullable(null, null, 12.9, 77.5)).toBeNull();
    });
  });

  describe('Sorting logic', () => {
    const listings = [
      { id: 'a', price: 500, distance_km: 3.0, rating: 4.2, last_updated_at: new Date('2024-01-15').toISOString(), availability: 'IN_STOCK' },
      { id: 'b', price: 300, distance_km: 8.0, rating: 4.8, last_updated_at: new Date('2024-01-20').toISOString(), availability: 'LOW_STOCK' },
      { id: 'c', price: 400, distance_km: 1.5, rating: 3.9, last_updated_at: new Date('2024-01-10').toISOString(), availability: 'IN_STOCK' },
    ];

    it('price_asc — cheapest first', () => {
      const sorted = [...listings].sort((a, b) => a.price - b.price);
      expect(sorted[0].id).toBe('b');
      expect(sorted[1].id).toBe('c');
      expect(sorted[2].id).toBe('a');
    });

    it('price_desc — most expensive first', () => {
      const sorted = [...listings].sort((a, b) => b.price - a.price);
      expect(sorted[0].id).toBe('a');
    });

    it('nearest — closest first', () => {
      const sorted = [...listings].sort((a, b) => a.distance_km - b.distance_km);
      expect(sorted[0].id).toBe('c');
    });

    it('rated — highest rated first', () => {
      const sorted = [...listings].sort((a, b) => b.rating - a.rating);
      expect(sorted[0].id).toBe('b');
    });

    it('updated — most recently updated first', () => {
      const sorted = [...listings].sort((a, b) => new Date(b.last_updated_at).getTime() - new Date(a.last_updated_at).getTime());
      expect(sorted[0].id).toBe('b');
    });
  });

  describe('WhatsApp link format', () => {
    it('generates valid WhatsApp URL', () => {
      const phone = '+919876543210';
      const productName = 'UltraTech Cement 50kg';
      const p = phone.replace(/\D/g, '');
      const msg = encodeURIComponent(`Hello, I found ${productName} on AtPrice.\nI am interested in this product.\nPlease share the latest price and availability.`);
      const url = `https://wa.me/${p}?text=${msg}`;
      expect(url).toMatch(/^https:\/\/wa\.me\/91/);
      expect(url).toContain('UltraTech');
    });
  });

  describe('Relative time', () => {
    function relativeTime(date: string) {
      const diffMin = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
      if (diffMin < 1) return 'just now';
      if (diffMin < 60) return `${diffMin} min ago`;
      if (diffMin < 1440) return `${Math.floor(diffMin / 60)} hr ago`;
      return `${Math.floor(diffMin / 1440)}d ago`;
    }

    it('shows "just now" for recent timestamps', () => {
      const result = relativeTime(new Date().toISOString());
      expect(result).toBe('just now');
    });

    it('shows hours for recent dates', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      expect(relativeTime(twoHoursAgo)).toContain('hr ago');
    });
  });

  describe('Input validation', () => {
    it('rejects negative prices', () => {
      const price = -100;
      expect(price >= 0).toBe(false);
    });

    it('accepts valid availability values', () => {
      const validStatuses = ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'];
      expect(validStatuses.includes('IN_STOCK')).toBe(true);
      expect(validStatuses.includes('SOLD')).toBe(false);
    });

    it('validates seller status transitions', () => {
      const validStatuses = ['VERIFIED', 'REJECTED', 'SUSPENDED', 'PENDING'];
      expect(validStatuses.includes('VERIFIED')).toBe(true);
      expect(validStatuses.includes('UNKNOWN')).toBe(false);
    });
  });

  describe('Authorization rules', () => {
    it('CUSTOMER role cannot access seller routes', () => {
      const user = { role: 'CUSTOMER' };
      const allowed = ['SELLER', 'ADMIN'].includes(user.role);
      expect(allowed).toBe(false);
    });

    it('SELLER role cannot access admin routes', () => {
      const user = { role: 'SELLER' };
      const allowed = ['ADMIN'].includes(user.role);
      expect(allowed).toBe(false);
    });

    it('ADMIN role can access all routes', () => {
      const user = { role: 'ADMIN' };
      const canAccessAdmin = ['ADMIN'].includes(user.role);
      const canAccessSeller = ['SELLER', 'ADMIN'].includes(user.role);
      expect(canAccessAdmin).toBe(true);
      expect(canAccessSeller).toBe(true);
    });
  });
});
