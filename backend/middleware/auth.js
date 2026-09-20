'use strict';
const { verifyToken } = require('../utils/auth');
function attachUser(req, res, next) {
  const h = req.headers.authorization;
  if (h && h.startsWith('Bearer ')) {
    try { req.user = verifyToken(h.slice(7)); } catch { /* invalid token */ }
  }
  next();
}
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
  next();
}
function requireSeller(req, res, next) {
  if (!req.user || (req.user.role !== 'SELLER' && req.user.role !== 'ADMIN'))
    return res.status(403).json({ error: 'Seller access required.' });
  next();
}
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN')
    return res.status(403).json({ error: 'Admin access required.' });
  next();
}
module.exports = { attachUser, requireAuth, requireSeller, requireAdmin };
