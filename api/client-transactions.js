// api/client-transactions.js
import { read, RANGES } from '../lib/sheets.js';

export default async function clientTransactions(req, res) {
  try {
    const client_code = String(req.clientCode || '').trim();
    if (!client_code) return res.status(401).json({ error: 'No client header' });

    // اقرأ الجداول
    const txS = await read(RANGES.TRANSACTIONS);
    const mS  = await read(RANGES.MERCHANTS);

    const H = (arr) => arr.map(h => String(h||'').trim().toLowerCase());
    const hTx = H(txS.header);
    const rTx = txS.rows;
    const idx = (h, n) => h.indexOf(String(n).toLowerCase());

    const ix_id   = idx(hTx,'id');
    const ix_at   = idx(hTx,'created_at');
    const ix_cc   = idx(hTx,'client_code');
    const ix_mc   = idx(hTx,'merchant_code');
    const ix_tot  = idx(hTx,'bill_total');
    const ix_dt   = idx(hTx,'discount_type');
    const ix_pay  = idx(hTx,'amount_payable');
    const ix_save = idx(hTx,'savings');

    // خريطة code->name من Merchants
    const hM  = H(mS.header);
    const rM  = mS.rows;
    const ix_mcode = idx(hM,'merchant_code');
    const ix_mname = idx(hM,'name');
    const nameByCode = new Map(
      rM.map(r => [ String(r[ix_mcode]||'').trim(), String(r[ix_mname]||'') ])
    );

    const list = rTx
      .filter(r => String(r[ix_cc]||'').trim() === client_code)
      .map(r => {
        const code = String(r[ix_mc]||'').trim();
        return {
          id: r[ix_id] || '',
          ts: r[ix_at] || null,
          merchant_code: code,
          merchant_name: nameByCode.get(code) || code || '',
          bill_total: Number(r[ix_tot] || 0),
          discount_type: String(r[ix_dt] || '').toLowerCase(),
          payable: Number(r[ix_pay] || 0),
          savings: Number(r[ix_save] || 0),
        };
      })
      .sort((a,b)=> String(b.ts).localeCompare(String(a.ts)));

    return res.json({ client: { code: client_code }, transactions: list });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
