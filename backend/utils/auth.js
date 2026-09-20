'use strict';
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'atprice-dev-secret-change-in-production';
function signToken(payload) { return jwt.sign(payload, SECRET, { expiresIn: '30d' }); }
function verifyToken(token) { return jwt.verify(token, SECRET); }
module.exports = { signToken, verifyToken };
