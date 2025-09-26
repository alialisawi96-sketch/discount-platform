// api/merchant-redeem.js
import { getSheets, read, toObj, findBy, RANGES } from "../lib/sheets.js";

export default async function merchantRedeem(req, res) {
  try {
    const merchant_code = String(req.merchantCode || "").trim();
    const { client_code, bill_total } = req.body || {};
    const total = Number(bill_total);
    if (!client_code || !bill_total) {
      return res.status(400).json({ error: "client_code and bill_total are required" });
    }
    if (!(total > 0)) return res.status(400).json({ error: "bill_total must be > 0" });

    const clients   = await read(RANGES.CLIENTS);
    const merchants = await read(RANGES.MERCHANTS);
    const ch = clients.header;
    const mh = merchants.header;

    const cRow =
      findBy(ch, clients.rows, "client_code", client_code) ||
      findBy(ch, clients.rows, "code", client_code);
    if (!cRow) return res.status(404).json({ error: "Client not found" });
    const c = toObj(ch, cRow);

    const mRow =
      findBy(mh, merchants.rows, "merchant_code", merchant_code) ||
      findBy(mh, merchants.rows, "code", merchant_code);
    if (!mRow) return res.status(401).json({ error: "Unknown merchant" });
    const m = toObj(mh, mRow);

    const type = String(m.discount_type || "").toLowerCase();
    const val  = Number(m.discount_value || 0);
    const pct  = Number(m.discount_percent || (type === "percent" ? val : 0) || 0);

    let discount = 0;
    if (type === "percent" || pct) {
      const p = pct || val;
      discount = Math.floor(total * (p / 100));
    } else if (type === "fixed") {
      discount = Math.min(val, total);
    } else {
      discount = Math.floor(total * (val / 100));
    }

    const payable = Math.max(0, total - discount);

    const sheets = getSheets();
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: RANGES.TRANSACTIONS,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          new Date().toISOString(),
          c.client_code || c.code || "",
          m.merchant_code || m.code || "",
          total,
          type || (pct ? "percent" : ""),
          type === "fixed" ? val : (pct || val),
          discount,
          "",
          payable
        ]]
      }
    });

    return res.json({
      client: { name: c.name || "", phone: c.phone || "", points: Number(c.points || c.points_balance || 0) },
      merchant: { name: m.name || "", code: m.merchant_code || m.code || "", pct: pct || (type==="percent"?val:0) },
      bill: { total, discount, payable }
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
