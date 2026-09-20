// Central DB handle — uses Node.js built-in SQLite (Node >= 22)
process.emitWarning = (w, ...args) => { if (String(w).includes('experimental')) return; return process.emitWarning(w, ...args); };
const { getDb } = require('../database/db');
module.exports = getDb();
