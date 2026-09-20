// "Best Value" ranking — intentionally simple and explainable (spec section 43).
// Lower price, closer distance, higher rating, in-stock and fresher listings
// score better. Each factor is normalised to 0..1 within the result set so
// the formula stays meaningful across very different product price ranges.
function rankByBestValue(rows) {
  if (!rows.length) return rows;
  const prices = rows.map((r) => r.price);
  const distances = rows.map((r) => (r.distanceKm ?? 9999));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minDist = Math.min(...distances);
  const maxDist = Math.max(...distances);

  const norm = (v, min, max) => (max === min ? 1 : 1 - (v - min) / (max - min));

  const scored = rows.map((r) => {
    const priceScore = norm(r.price, minPrice, maxPrice); // cheaper => closer to 1
    const distScore = norm(r.distanceKm ?? maxDist, minDist, maxDist); // nearer => closer to 1
    const ratingScore = (r.sellerRating || 0) / 5;
    const stockScore = r.availability === 'IN_STOCK' ? 1 : r.availability === 'LOW_STOCK' ? 0.5 : 0;
    const freshnessScore = r.stalePrice ? 0.3 : 1;
    const deliveryScore = r.deliveryAvailable ? 1 : 0.6;

    const bestValueScore =
      priceScore * 0.35 +
      distScore * 0.25 +
      ratingScore * 0.2 +
      stockScore * 0.1 +
      freshnessScore * 0.05 +
      deliveryScore * 0.05;

    return { ...r, bestValueScore: Math.round(bestValueScore * 100) / 100 };
  });

  return scored;
}

module.exports = { rankByBestValue };
