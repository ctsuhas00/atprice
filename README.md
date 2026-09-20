# AtPrice — Local Hardware Price Comparison Marketplace

> **DEMO DATA**: All prices, sellers and products are fictional sample data for demonstration purposes only.

## Quick Start

```bash
# Requires Node.js >= 22
npm install
npm start
```

Server starts at **http://localhost:8787**

## Demo Credentials

| Role | Phone | Password |
|------|-------|----------|
| Verified Seller | 9900011101 | demo1234 |
| Tool Shop | 9900011106 | demo1234 |
| Admin | email: admin@atprice.demo | demo1234 |

## Architecture

- **Backend**: Node.js + Express + built-in SQLite (`node:sqlite`, Node >= 22)
- **Frontend**: Vanilla HTML/CSS/JS — no framework, no build step
- **Search**: FTS5 full-text search with autocomplete
- **Database**: 83 products, 45 sellers, 244 listings across Karnataka

## Flows

1. **Customer**: Search → Product page → Compare sellers → Call or WhatsApp
2. **Seller**: Register → Pending review → Add listings → Manage dashboard
3. **Admin**: `/api/admin/stats`, `/api/admin/sellers`

## APIs

| Endpoint | Description |
|----------|-------------|
| GET /api/products?q= | Full-text search |
| GET /api/products/:id/compare | Seller price comparison |
| GET /api/categories | Category list |
| GET /api/sellers | Seller directory |
| POST /api/auth/login | Login |
| POST /api/sellers/register | Register shop |
| GET /api/admin/stats | Platform stats |

## Notes

- No payment system — this is a Level-1 marketplace (discovery only)
- Click-to-call and WhatsApp contact links
- Mobile-first responsive design
