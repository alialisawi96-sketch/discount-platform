// index.js

// ===== Imports =====
import express from "express";
import cors from "cors";
import path, { join } from "path";
import { fileURLToPath } from "url";

// ===== Setup =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Middlewares =====
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Serve static files (UI)
app.use(express.static(__dirname));

// ===== Auth Middlewares =====
function requireClient(req, res, next) {
  const open = [/^\/api\/login$/];
  if (open.some((rx) => rx.test(req.path))) return next();
  const client = req.headers["x-client-code"];
  if (!client) return res.status(401).json({ error: "Unauthorized (client)" });
  req.clientCode = String(client);
  next();
}

function requireMerchant(req, res, next) {
  const open = [/^\/api\/merchant\/login$/];
  if (open.some((rx) => rx.test(req.path))) return next();
  const m = req.headers["x-merchant-code"];
  if (!m) return res.status(401).json({ error: "Unauthorized (merchant)" });
  req.merchantCode = String(m);
  next();
}

// ===== Health & Root =====
app.get("/healthz", (_req, res) => res.json({ ok: true }));
app.get("/", (_req, res) => res.sendFile(join(__dirname, "login.html")));

// ===== Client API =====
// استخدم app.all للتعامل مع GET و POST. نحول GET إلى body لنفس الدالة
app.all("/api/login", async (req, res) => {
  try {
    if (req.method === "GET") {
      // بعض المتصفحات ترسل GET – نحول query إلى body
      const { client_code, code } = req.query || {};
      req.body = { client_code: client_code || code };
    } else if (req.method !== "POST") {
      return res.status(405).json({ error: "Use POST /api/login with { client_code }" });
    }

    const mod = await import("./api/login.js");
    return mod.default(req, res);
  } catch (e) {
    return res.status(500).json({ error: e.message || "login failed" });
  }
});

app.get("/api/merchants", requireClient, async (req, res) => {
  try {
    const mod = await import("./api/merchants.js");
    return mod.default(req, res);
  } catch {
    return res.json([]);
  }
});

app.get("/api/qr", requireClient, async (req, res) => {
  try {
    const mod = await import("./api/qr.js");
    return mod.default(req, res);
  } catch {
    return res.json({});
  }
});

app.get("/api/client/transactions", requireClient, async (req, res) => {
  try {
    const mod = await import("./api/client-transactions.js");
    return mod.default(req, res);
  } catch (e) {
    return res.status(500).json({ error: e.message || "transactions failed" });
  }
});

app.post("/api/rate", async (req, res) => {
  try {
    const mod = await import("./api/rate.js");
    return mod.default(req, res);
  } catch (e) {
    return res.status(500).json({ error: e.message || "rate failed" });
  }
});

// ===== Merchant API =====
// نفس الفكرة هنا: app.all تقبل GET وPOST وتحوّل GET إلى body
app.all("/api/merchant/login", async (req, res) => {
  try {
    if (req.method === "GET") {
      const { merchant_code, code } = req.query || {};
      req.body = { merchant_code: merchant_code || code };
    } else if (req.method !== "POST") {
      return res.status(405).json({ error: "Use POST /api/merchant/login with { merchant_code }" });
    }

    const mod = await import("./api/merchant-login.js");
    return mod.default(req, res);
  } catch (e) {
    return res.status(500).json({ error: e.message || "merchant login failed" });
  }
});

app.post("/api/merchant/redeem", requireMerchant, async (req, res) => {
  try {
    const mod = await import("./api/merchant-redeem.js");
    return mod.default(req, res);
  } catch (e) {
    return res.status(500).json({ error: e.message || "merchant redeem failed" });
  }
});

app.get("/api/merchant/customers", requireMerchant, async (req, res) => {
  try {
    const mod = await import("./api/merchant-customers.js");
    return mod.default(req, res);
  } catch (e) {
    return res.status(500).json({ error: e.message || "merchant customers failed" });
  }
});

// ===== Legacy =====
app.post("/api/redeem", requireClient, async (req, res) => {
  try {
    const mod = await import("./api/redeem.js");
    return mod.default(req, res);
  } catch (e) {
    return res.status(500).json({ error: e.message || "redeem failed" });
  }
});

// ===== 404 للـ API فقط =====
app.use("/api", (_req, res) => res.status(404).json({ error: "Not Found" }));

// ===== Start =====
app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
