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

