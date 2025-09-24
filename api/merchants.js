// api/merchants.js
import { read, toObj, RANGES } from '../lib/sheets.js';

// هيلبر محلي: يجلب رقم العمود بدون حساسية للحروف/المسافات
function colIndex(header, name) {
  const target = String(name).trim().toLowerCase();
  return header.findIndex(h => String(h || '').trim().toLowerCase() === target);
}

export default async function handler(req, res) {
  if ((req.method || 'GET').toUpperCase() !== 'GET') {
    res.statusCode = 405;
    return res.end('Method Not Allowed');
  }

  try {
    const { header, rows } = await read(RANGES.MERCHANTS);

    // لو ماكو header نهائياً
    if (!header || header.length === 0) {
      res.statusCode = 200;
      res.setHeader('Content-Type','application/json');
      return res.end(JSON.stringify({ merchants: [] }));
    }

    const aIdx = colIndex(header, 'active');

    // فلترة آمنة: إذا ماكو عمود active أصلاً، رجّع الكل
    const list = rows
      .filter(r => {
        if (aIdx === -1) return true; // لا يوجد عمود active -> لا نفلتر
        const v = String(r[aIdx] || '').trim().toLowerCase();
        return v === 'true' || v === '1' || v === 'yes';
      })
      .map(r => toObj(header, r));

    res.statusCode = 200;
    res.setHeader('Content-Type','application/json');
    res.end(JSON.stringify({ merchants: list }));
  } catch (e) {
    console.error('MERCHANTS_ERROR', e?.response?.data || e?.message || e);
    res.statusCode = 500;
    res.setHeader('Content-Type','application/json');
    res.end(JSON.stringify({ error: 'Server error' }));
  }
}
