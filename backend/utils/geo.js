'use strict';
// Haversine great-circle distance in km
function haversineKm(lat1, lng1, lat2, lng2) {
  if (lat1==null||lng1==null||lat2==null||lng2==null) return null;
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2-lat1), dLng = toRad(lng2-lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
module.exports = { haversineKm };
