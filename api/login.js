// api/login.js
import { read, toObj, findBy, RANGES } from "../lib/sheets.js";

export default async function clientLogin(req, res) {
  // اقبل POST فقط
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST /api/login with { client_code }" });
  }
  try {
    const { client_code } = req.body || {};
    if (!client_code) return res.status(400).json({ error: "client_code is required" });

    const data = await read(RANGES.CLIENTS);
    const h = data.header;
    const row =
      findBy(h, data.rows, "client_code", client_code) ||
      findBy(h, data.rows, "code", client_code);
    if (!row) return res.status(401).json({ error: "Invalid client code" });

    const c = toObj(h, row);
    return res.json({
      ok: true,
      role: "client",
      code: c.client_code || c.code || "",
      name: c.name || "",
      phone: c.phone || "",
      points: Number(c.points_balance || c.starting_points || 0),
      expiry: c["client.expiry"] || "",
      category: c.category || "",
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
