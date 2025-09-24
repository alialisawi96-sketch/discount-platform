import { read, findBy, toObj, RANGES, sumBy } from '../lib/sheets.js';

function send(res, status, body) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(status).json(body);
  }
  res.statusCode = status; res.setHeader('Content-Type','application/json');
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  if (req.body && Object.keys(req.body).length) return req.body;
  return await new Promise((resolve) => {
    let raw = ''; req.on('data', c => raw += c);
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { resolve({}); }});
  });
}

export default async function handler(req, res) {
  if ((req.method || 'GET').toUpperCase() !== 'POST') {
    return send(res, 405, { error: 'Method Not Allowed' });
  }
  try {
    const { client_code } = await readJson(req);
    if (!client_code) return send(res, 400, { error: 'client_code required' });

    const { header: ch, rows: cr } = await read(RANGES.CLIENTS);
    const crow = findBy(ch, cr, 'client_code', client_code);
    if (!crow) return send(res, 404, { error: 'Client not found' });
    const client = toObj(ch, crow);

    const { header: th, rows: tr } = await read(RANGES.TRANSACTIONS);
    const spent = sumBy(th, tr, 'client_code', client_code, 'savings');
    const starting = Number(client.starting_points || 0);
    const balance = starting - spent;

    return send(res, 200, { client: { ...client, points_balance: balance } });
  } catch (e) {
    console.error('LOGIN_ERROR', e?.response?.data || e?.message || e);
    return send(res, 500, { error: 'Server error' });
  }
}
