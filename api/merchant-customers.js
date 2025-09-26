// api/merchant-customers.js
import { getSheets, RANGES } from "../lib/sheets.js";

const toLower = (arr=[]) => arr.map(h => String(h||'').trim().toLowerCase());
const idxOf = (header, names) => {
  const alts = Array.isArray(names) ? names : [names];
  for (const n of alts) {
    const i = header.indexOf(String(n).toLowerCase());
    if (i !== -1) return i;
  }
  return -1;
};

export default async function handler(req, res) {
  try {
    const merchant_code = String(req.merchantCode || "").trim();
    if (!merchant_code) return res.status(401).json({ error: "Unauthorized (merchant)" });

    const sheets = getSheets();

    // === Transactions ===
    const tResp = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: RANGES.TRANSACTIONS,
    });
    const tVals = tResp.data.values || [];
    if (!tVals.length) {
      return res.json({
        stats: { unique_clients: 0, total_visits: 0, avg_visits_per_client: 0 },
        customers: []
      });
    }
    const th = toLower(tVals[0]);
    const trows = tVals.slice(1);

    // === Clients (لجلب الاسم/الهاتف) ===
    const cResp = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: RANGES.CLIENTS,
    });
    const cVals = cResp.data.values || [];
    const ch = cVals.length ? toLower(cVals[0]) : [];
    const crows = cVals.slice(1);
    const ic_code  = idxOf(ch, ["client_code","code"]);
    const ic_name  = idxOf(ch, ["name","client_name"]);
    const ic_phone = idxOf(ch, ["phone","mobile","tel"]);
    const clientMap = new Map();
    if (ic_code !== -1) {
      for (const r of crows) {
        const code = String(r[ic_code]||"").trim();
        if (!code) continue;
        clientMap.set(code, {
          name:  ic_name  !== -1 ? (r[ic_name]  || "") : "",
          phone: ic_phone !== -1 ? (r[ic_phone] || "") : "",
        });
      }
    }

    // فهارس Transactions وفق سكيمتك الجديدة
    const ix_mc  = idxOf(th, ["merchant_code","merchant","mcode"]);
    const ix_cc  = idxOf(th, ["client_code","client","ccode"]);
    const ix_bt  = idxOf(th, ["bill_total","bill","total"]);
    const ix_sav = idxOf(th, ["savings","discount_value","discount_applied"]);
    const ix_ts  = idxOf(th, ["created_at","ts","timestamp"]);

    const mine = trows.filter(r => String(r[ix_mc]||"").trim() === merchant_code);

    // تجميع حسب العميل
    const grouped = new Map();
    for (const r of mine) {
      const code = String(r[ix_cc]||"").trim();
      if (!code) continue;
      const arr = grouped.get(code) || [];
      arr.push(r);
      grouped.set(code, arr);
    }

    // بناء صفوف العملاء
    const customers = [];
    for (const [code, arr] of grouped.entries()) {
      const total_bill    = arr.reduce((s,a)=> s + (Number(a[ix_bt]  ||0) || 0), 0);
      const total_savings = arr.reduce((s,a)=> s + (Number(a[ix_sav]||0) || 0), 0);
      const last_visit    = arr.map(a=> a[ix_ts] || "")
                               .filter(Boolean).sort().slice(-1)[0] || null;

      const ci = clientMap.get(code) || { name:"", phone:"" };
      customers.push({
        client_code: code,
        name:  ci.name,
        phone: ci.phone,
        visits: arr.length,
        total_bill,
        total_savings,
        last_visit,
      });
    }

    // إحصائيات
    const uniqueClients = customers.length;
    const totalVisits   = mine.length;
    const avg           = uniqueClients ? totalVisits / uniqueClients : 0;

    return res.json({
      stats: {
        unique_clients: uniqueClients,
        total_visits: totalVisits,
        avg_visits_per_client: Number(avg.toFixed(2)),
      },
      customers: customers.sort((a,b)=> b.visits - a.visits),
    });
  } catch (e) {
    console.error("merchant-customers error:", e);
    return res.status(500).json({ error: e.message });
  }
}
