// api/redeem.js
import {
  getSheets,
  read,
  toObj,
  findBy,
  colIndex,
  RANGES,
} from '../lib/sheets.js';

const DINAR_PER_POINT = 500; // كل 500 د.ع = 1 نقطة

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // نقرأ القيم القادمة من الواجهة
    const body = req.body || {};
    const clientCode   = String(body.client_code || req.headers['x-client-code'] || '').trim();
    const merchantCode = String(body.merchant_code || '').trim();
    const billTotal    = Number(body.bill_total || 0);

    if (!clientCode)   return res.status(400).json({ error: 'client_code مفقود' });
    if (!merchantCode) return res.status(400).json({ error: 'merchant_code مفقود' });
    if (!(billTotal > 0)) return res.status(400).json({ error: 'bill_total غير صالح' });

    // نقرأ الشيتات
    const clientsData   = await read(RANGES.CLIENTS);     // Clients!A:Z
    const merchantsData = await read(RANGES.MERCHANTS);   // Merchants!A:Z

    const ch = clientsData.header;
    const mh = merchantsData.header;

    // نلاقي صف العميل والتاجر
    const cRow =
      findBy(ch, clientsData.rows, 'client_code', clientCode) ||
      findBy(ch, clientsData.rows, 'code',        clientCode);
    if (!cRow) return res.status(404).json({ error: 'العميل غير موجود' });

    const mRow =
      findBy(mh, merchantsData.rows, 'merchant_code', merchantCode) ||
      findBy(mh, merchantsData.rows, 'code',          merchantCode);
    if (!mRow) return res.status(404).json({ error: 'التاجر غير موجود' });

    const cObj = toObj(ch, cRow);
    const mObj = toObj(mh, mRow);

    // أعمدة مهمة (نبحث بدون حساسية للحروف)
    const nameCol   = colIndex(ch, 'name');
    const phoneCol  = colIndex(ch, 'phone');
    const pointsCol =
      colIndex(ch, 'points_balance') !== -1
        ? colIndex(ch, 'points_balance')
        : colIndex(ch, 'points');

    if (pointsCol === -1) {
      return res.status(500).json({ error: 'لا يوجد عمود points/points_balance في تبويب Clients' });
    }

    // بيانات التاجر
    const discountType  = String(mObj.discount_type || '').toLowerCase(); // percent | fixed
    const discountValue = Number(mObj.discount_value || 0);
    const minBill       = Number(mObj.min_bill || 0);

    if (minBill && billTotal < minBill) {
      return res.status(400).json({ error: `حد أدنى للفاتورة: ${minBill}` });
    }

    // حساب الخصم بالدنانير
    const discount = discountType === 'percent'
      ? Math.floor(billTotal * (discountValue / 100))
      : Math.min(discountValue, billTotal);

    const payable = Math.max(0, billTotal - discount);

    // كم نقطة نحتاج؟ (500 د.ع = 1 نقطة)
    const pointsRequired = Math.ceil(discount / DINAR_PER_POINT);

    const currentPoints = Math.floor(Number(cRow[pointsCol] || 0));
    if (pointsRequired > currentPoints) {
      return res.status(400).json({
        error: `رصيد النقاط غير كاف. متاح: ${currentPoints} | مطلوب: ${pointsRequired}`,
      });
    }

    const newPoints = currentPoints - pointsRequired;

    // نجهز التحديث على الشيت
    const sheets = getSheets();

    // رقم صف العميل الحقيقي في الشيت (الهيدر صف 1)
    const rowIdx = clientsData.rows.indexOf(cRow); // يبدأ من 0
    const rowNumber = 2 + rowIdx; // 2 لأن الهيدر 1 + الإندكس 0 = صف 2
    if (rowIdx === -1) {
      return res.status(500).json({ error: 'تعذّر تحديد صف العميل' });
    }

    // نحدّث صف العميل (نفس الصف مع تعديل النقاط فقط)
    const updatedRow = [...cRow];
    updatedRow[pointsCol] = String(newPoints);

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SHEET_ID,
      range: `Clients!A${rowNumber}:Z${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [updatedRow] },
    });

    // نسجل العملية في Transactions
    const now = new Date();
    const txnRow = [
      now.toISOString(),           // timestamp
      clientCode,                  // client_code
      merchantCode,                // merchant_code
      billTotal,                   // bill_total
      discountType,                // discount_type
      discountValue,               // discount_value
      discount,                    // discount_applied (بالدينار)
      pointsRequired,              // points_spent
      payable                      // payable
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: RANGES.TRANSACTIONS,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [txnRow] },
    });

    // نرجّع للواجهة الرصيد الجديد حتى يتحدّث الهيرو
    return res.json({
      ok: true,
      client: {
        name:  nameCol  !== -1 ? String(cRow[nameCol]  || '') : (cObj.name  || ''),
        phone: phoneCol !== -1 ? String(cRow[phoneCol] || '') : (cObj.phone || ''),
        client_code: clientCode,
        points_balance: newPoints,
      },
      merchant: {
        merchant_code: merchantCode,
        discount_type: discountType,
        discount_value: discountValue,
      },
      calc: { billTotal, discount, pointsRequired, payable },
    });
  } catch (e) {
    console.error('REDEEM ERROR:', e);
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}
