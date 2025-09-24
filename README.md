# Discounts Platform (Google Sheets + Vercel)

## Quick Start
1) Create Google Sheet with sheets: Clients, Merchants, Transactions (see CSV templates).
2) Enable Google Sheets API + create Service Account (JSON). Share the sheet with the SA email (Editor).
3) Copy `.env.local.example` to `.env.local` and fill values.
4) Install & run locally:
   ```bash
   npm install
   npx vercel dev
   ```
5) Deploy:
   ```bash
   npx vercel
   npx vercel deploy --prod
   ```

## Endpoints
- POST /api/login { client_code }
- GET  /api/merchants
- GET  /api/qr?code=MERCHANT_CODE
- POST /api/redeem { client_code, merchant_code, bill_total }