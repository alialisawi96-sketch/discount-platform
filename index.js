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

// Middlewares
app.use(cors());
app.use(express.json());

// Serve static files (UI)
app.use(express.static(__dirname));

// ===== Auth Middlewares =====
// Client auth: allow POST /api/login without header
function requireClient(req, res, next) {
  const open = [/^\/api\/login$/];
  if (open.some(rx => rx.test(req.path))) return next();
  const client = req.headers["x-client-code"];
  if (!client) return res.status(401).json({ error: "Unauthorized (client)" });
  req.clientCode = String(client);
  next();
}

// Merchant auth: allow POST /api/merchant/login without header
function requireMerchant(req, res, next) {
  const open = [/^\/api\/merchant\/login$/];
  if (open.some(rx => rx.test(req.path))) return next();
  const m = req.headers["x-merchant-code"];
  if (!m) return res.status(401).json({ error: "Unauthorized (merchant)" });
  req.merchantCode = String(m);
  next();
}

// ===== Root -> unified login page =====
app.get("/", (req, res) => res.sendFile(join(__dirname, "login.html")));

// ===== Client API Routes =====
app.post("/api/login", async (req, res) => {
  const mod = await import("./api/login.js"); return mod.default(req, res);
});

app.get("/api/merchants", requireClient, async (req, res) => {
  const mod = await import("./api/merchants.js").catch(()=>({default:(rq,rs)=>rs.json([])}));
  return mod.default(req, res);
});

app.get("/api/qr", requireClient, async (req, res) => {
  const mod = await import("./api/qr.js").catch(()=>({default:(rq,rs)=>rs.json({})}));
  return mod.default(req, res);
});

// keep legacy /api/redeem disabled (moved to merchant only)
app.post("/api/redeem", requireClient, async (req, res) => {
  const mod = await import("./api/redeem.js"); return mod.default(req, res);
});

// ===== Merchant API Routes =====
app.post("/api/merchant/login", async (req, res) => {
  const mod = await import("./api/merchant-login.js"); return mod.default(req, res);
});

app.post("/api/merchant/redeem", requireMerchant, async (req, res) => {
  const mod = await import("./api/merchant-redeem.js"); return mod.default(req, res);
});

app.get("/api/merchant/customers", requireMerchant, async (req, res) => {
  const mod = await import("./api/merchant-customers.js"); return mod.default(req, res);
});

// ===== Start =====
app.listen(PORT, () => {
  console.log(`✅ Local dev server running: http://localhost:${PORT}`);
});
app.get("/api/client/transactions", requireClient, async (req, res) => {
  const mod = await import("./api/client-transactions.js"); return mod.default(req, res);
});
app.get("/api/client/transactions", requireClient, async (req, res) => {
  const mod = await import("./api/client-transactions.js");
  return mod.default(req, res);
});
app.post("/api/rate", async (req, res) => {
  const mod = await import("./api/rate.js"); return mod.default(req, res);
});
app.post("/api/rate", async (req, res) => {
  const mod = await import("./api/rate.js"); return mod.default(req, res);
});
