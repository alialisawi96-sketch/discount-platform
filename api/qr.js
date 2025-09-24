import { read, findBy, toObj, RANGES } from '../lib/sheets.js';

export default async function handler(req, res) {
  if ((req.method || 'GET').toUpperCase() !== 'GET') {
    res.statusCode = 405; return res.end('Method Not Allowed');
  }
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const code = url.searchParams.get('code');
    if (!code) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'code required' })); }

    const { header, rows } = await read(RANGES.MERCHANTS);
    const mrow = findBy(header, rows, 'merchant_code', code);
    if (!mrow) { res.statusCode = 404; return res.end(JSON.stringify({ error: 'Merchant not found' })); }
    const merchant = toObj(header, mrow);
    if ((merchant.active || '').toString().toLowerCase() !== 'true') {
      res.statusCode = 400; return res.end(JSON.stringify({ error: 'Merchant inactive' }));
    }
    res.statusCode = 200; res.setHeader('Content-Type','application/json');
    res.end(JSON.stringify({ merchant }));
  } catch (e) {
    console.error('QR_ERROR', e?.response?.data || e?.message || e);
    res.statusCode = 500; res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({ error: 'Server error' }));
  }
}
