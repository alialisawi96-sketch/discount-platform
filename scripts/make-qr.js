import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

// Edit this array with your merchant codes
const CODES = [
  'MRC-1001',
  'MRC-1002'
];

const outDir = './qrs';
if(!fs.existsSync(outDir)) fs.mkdirSync(outDir);

for (const code of CODES) {
  const file = path.join(outDir, `${code}.png`);
  await QRCode.toFile(file, code, { margin: 1, width: 400 });
  console.log('QR saved:', file);
}