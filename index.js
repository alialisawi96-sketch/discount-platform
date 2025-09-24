// index.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// قدّم الواجهة
app.use(express.static(__dirname));

// وسيط مصادقة للـ API (اسمح فقط لـ /api/login بدون هيدر)
function requireAuth(req, res, next) {
  const open = [/^\/api\/login$/];
  if (open.some(rx => rx.test(req.path))) return next();

  const client = req.headers['x-client-code'];
  if (!client) return res.status(401).json({ error: 'Unauthorized' });
  req.clientCode = String(client);
  next();
}
app.use(requireAuth);

// API routes
app.post("/api/login", async (req, res) => {
  const mod = await import("./api/login.js"); return mod.default(req, res);
});
app.get("/api/merchants", async (req, res) => {
  const mod = await import("./api/merchants.js"); return mod.default(req, res);
});
app.get("/api/qr", async (req, res) => {
  const mod = await import("./api/qr.js"); return mod.default(req, res);
});
app.post("/api/redeem", async (req, res) => {
  const mod = await import("./api/redeem.js"); return mod.default(req, res);
});

app.listen(PORT, () => {
  console.log(`✅ Local dev server running: http://localhost:${PORT}`);
});
