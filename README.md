# منصة الخصومات — نسخة كاملة جاهزة

## الإعداد السريع
1) أنشئ ملف `.env` في جذر المشروع:
```
SHEET_ID=YOUR_SHEET_ID
GOOGLE_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nXXXX\n-----END PRIVATE KEY-----\n"
```
> إذا تحفظ المفتاح بسطر واحد، خليه مع `\n` مثل المثال.

2) ثبّت واعمل تشغيل:
```
npm install
npm run dev
```
حيشتغل على: `http://localhost:3000`

## الواجهات
- صفحة دخول موحّدة: `/`
- واجهة العميل: `/index.html` — **بدون** تأكيد/احتساب خصم
- واجهة التاجر: `/merchant.html` — تسجيل خصم + تقرير العملاء

## الشيتات (الألسنة)
- `Clients`  الأعمدة المقترحة: `client_code, name, phone, points_balance`
- `Merchants` الأعمدة المقترحة: `merchant_code, name, discount_type, discount_value, discount_percent, phone, min_bill`
- `Transactions` الأعمدة المقترحة: `ts, client_code, merchant_code, bill_total, discount_type, discount_value, discount_applied, points_spent, payable`

> المطابقة بدون حساسية لحالة الحروف. الأعمدة الإضافية ما تضر.
