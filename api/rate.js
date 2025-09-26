// api/rate.js
import { getSheets } from '../lib/sheets.js';

export default async function handler(req, res){
  try{
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const client_code = String(
      req.headers['x-client-code'] || req.body?.client_code || ''
    ).trim();
    if(!client_code) return res.status(401).json({ error: 'No client header' });

    const merchant_code = String(req.body?.merchant_code || '').trim();
    const rating = Math.max(0, Math.min(5, Number(req.body?.rating || 0)));
    const comment = String(req.body?.comment || '').trim();
    const transaction_id = String(req.body?.transaction_id || '').trim();

    if(!merchant_code) return res.status(400).json({ error:'merchant_code required' });
    if(!rating) return res.status(400).json({ error:'rating required' });

    const sheets = getSheets();

    // أضف صف في Ratings
    const row = [
      Date.now().toString(),
      new Date().toISOString(),
      client_code,
      merchant_code,
      rating,
      comment,
      transaction_id
    ];
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Ratings!A:Z',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] }
    });

    // (اختياري) تحديث متوسط النجوم في Merchants.stars
    const r = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID, range: 'Ratings!A:Z'
    });
    const vals = r.data.values || [];
    const header = (vals[0]||[]).map(h=>String(h||'').trim().toLowerCase());
    const rows = vals.slice(1);
    const ix_mc = header.indexOf('merchant_code');
    const ix_rate = header.indexOf('rating');

    const my = rows.filter(rr => String(rr[ix_mc]||'').trim()===merchant_code);
    const avg = my.length ? (my.reduce((s,a)=> s+Number(a[ix_rate]||0),0) / my.length) : rating;

    // حدّث Merchants.stars
    const mGet = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID, range: 'Merchants!A:Z'
    });
    const mVals = mGet.data.values || [];
    const mHead = mVals[0] || [];
    const mRows = mVals.slice(1);
    const idxMC = mHead.findIndex(h => String(h||'').trim().toLowerCase()==='merchant_code' || String(h||'').trim().toLowerCase()==='code');
    const idxStars = mHead.findIndex(h => String(h||'').trim().toLowerCase()==='stars');
    const rowIdx = mRows.findIndex(rw => String(rw[idxMC]||'').trim()===merchant_code);

    if (idxStars !== -1 && rowIdx !== -1) {
      const realRow = rowIdx + 2;
      const lastColLetter = String.fromCharCode(65 + mHead.length - 1);
      const current = mRows[rowIdx].slice(0, mHead.length);
      current[idxStars] = Number(avg.toFixed(1)).toString();

      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.SHEET_ID,
        range: `Merchants!A${realRow}:${lastColLetter}${realRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [current] }
      });
    }

    return res.json({ ok:true, avg: Number(avg.toFixed(2)) });
  }catch(e){
    console.error('RATE ERROR:', e);
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}
