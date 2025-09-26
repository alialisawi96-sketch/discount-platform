async function loginClient() {
  const code = document.getElementById("clientCode").value.trim();
  if (!code) return alert("يرجى إدخال كود العميل");

  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_code: code })
  });

  const data = await res.json();
  if (!res.ok) return alert(data.error || "فشل تسجيل الدخول");

  const c = data.client || {};
  document.getElementById("clientInfo").innerText =
    `👤 ${c.name || '—'} | نقاطك: ${c.points_balance ?? '0'}`;
}

async function showMerchants() {
  const res = await fetch("/api/merchants");
  const data = await res.json();
  if (!res.ok) return alert(data.error || "فشل تحميل المتاجر");

  const list = (data.merchants || [])
    .map(m => `🏪 ${m.name} — خصم: ${m.discount_value}${(m.discount_type||'')==='percent'?'%':' دينار'}`)
    .join('\n');

  document.getElementById("merchantsList").innerText = list || "لا توجد متاجر";
}

// مسارات العميل (موجودة عندك): /api/login, /api/merchants, /api/qr, /api/redeem
// ... موجودة أساساً عندك. :contentReference[oaicite:0]{index=0}

/* ========== مسارات التاجر ========== */
app.use('/api/merchant', requireMerchant);

app.post("/api/merchant/login", async (req, res) => {
  const mod = await import("./api/merchant-login.js"); return mod.default(req, res);
});

app.post("/api/merchant/redeem", async (req, res) => {
  const mod = await import("./api/merchant-redeem.js"); return mod.default(req, res);
});

app.get("/api/merchant/customers", async (req, res) => {
  const mod = await import("./api/merchant-customers.js"); return mod.default(req, res);
});
