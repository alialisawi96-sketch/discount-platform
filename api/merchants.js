// api/merchants.js
import { read, toObj, RANGES } from '../lib/sheets.js';

function colIndex(header, name){
  const t = String(name).trim().toLowerCase();
  return header.findIndex(h => String(h||'').trim().toLowerCase() === t);
}

export default async function handler(req, res){
  if((req.method||'GET').toUpperCase() !== 'GET'){
    res.statusCode = 405; return res.end('Method Not Allowed');
  }
  try{
    const { header, rows } = await read(RANGES.MERCHANTS);
    if(!header || header.length === 0){
      res.setHeader('Content-Type','application/json');
      return res.end(JSON.stringify([]));
    }
    const aIdx = colIndex(header,'active');
    const sIdx = colIndex(header,'stars');

    const list = rows
      .filter(r => {
        if(aIdx === -1) return true;
        const v = String(r[aIdx]||'').trim().toLowerCase();
        return v === 'true' || v === '1' || v === 'yes';
      })
      .map(r => {
        const o = toObj(header,r);
        o.stars = Number(o.stars || 0);
        return o;
      });

    res.setHeader('Content-Type','application/json');
    res.end(JSON.stringify(list));
  }catch(e){
    res.statusCode = 500;
    res.setHeader('Content-Type','application/json');
    res.end(JSON.stringify({error:'Server error'}));
  }
}
