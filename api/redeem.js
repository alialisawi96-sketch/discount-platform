// api/redeem.js
import { appendRow } from '../lib/sheets.js';

export default async function redeem(req, res){
  try{
    if(req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});

    const { client_code, merchant_code, bill_total, discount_type, discount_value } = req.body || {};
    const total = Number(bill_total || 0);
    if(!client_code || !merchant_code || !(total > 0)) {
      return res.status(400).json({error:'client_code, merchant_code, bill_total required'});
    }

    // احسب الخصم بالدينار
    const dtype = String(discount_type || '').toLowerCase();    // 'percent' | 'fixed'
    const dval  = Number(discount_value || 0);
    let savings = 0;
    if (dtype === 'percent') {
      const pct = dval / 100;                    // 10% => 0.10
      savings = Math.round(total * pct);         // دائماً بالدينار
    } else if (dtype === 'fixed') {
      savings = Math.min(dval, total);           // لا يتجاوز الفاتورة
    } else {
      return res.status(400).json({error:'discount_type must be percent or fixed'});
    }
    const amount_payable = Math.max(0, total - savings);

    // اكتب الصف حسب السكيمة الجديدة
    await appendRow('Transactions', {
      id: `TX-${Date.now()}`,
      created_at: new Date().toISOString(),
      client_code,
      merchant_code,
      bill_total: total,
      discount_type: dtype,
      amount_payable,
      savings
    });

    return res.json({ ok:true, bill_total: total, savings, amount_payable });
  }catch(e){
    return res.status(500).json({error:e.message});
  }
}
