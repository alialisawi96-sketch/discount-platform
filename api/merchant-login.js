// api/merchant-login.js
import { read, toObj, findBy, RANGES } from "../lib/sheets.js";

export default async function merchantLogin(req, res) {
  try {
    const { merchant_code } = req.body || {};
    if (!merchant_code) return res.status(400).json({ error: "merchant_code is required" });

    const data = await read(RANGES.MERCHANTS);
    const h = data.header;
    const row =
      findBy(h, data.rows, "merchant_code", merchant_code) ||
      findBy(h, data.rows, "code", merchant_code);
    if (!row) return res.status(401).json({ error: "Invalid merchant code" });

    const m = toObj(h, row);
    let pct = Number(m.discount_percent || 0);
    if (!pct && String(m.discount_type||"").toLowerCase() === "percent") {
      pct = Number(m.discount_value || 0);
    }

    return res.json({
      code: m.merchant_code || m.code,
      name: m.name || "",
      discount_percent: pct || 0,
      phone: m.phone || "",
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
