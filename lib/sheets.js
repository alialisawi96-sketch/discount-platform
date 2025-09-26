// lib/sheets.js
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { google } from 'googleapis';

const projectRoot = process.cwd();
const envDotEnv = path.join(projectRoot, '.env');
const envDotEnvLocal = path.join(projectRoot, '.env.local');

// حمّل .env
if (fs.existsSync(envDotEnv)) {
  dotenv.config({ path: envDotEnv });
} else if (fs.existsSync(envDotEnvLocal)) {
  dotenv.config({ path: envDotEnvLocal });
}

// تشخيص بسيط
console.log('[ENV CHECK]', {
  cwd: projectRoot,
  envDotEnvExists: fs.existsSync(envDotEnv),
  envDotEnvLocalExists: fs.existsSync(envDotEnvLocal),
  SHEET_ID: !!process.env.SHEET_ID,
  GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL || null,
  KEY_LEN: (process.env.GOOGLE_PRIVATE_KEY || '').length
});

const SHEET_ID = process.env.SHEET_ID;
const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
// مهم: استبدال \n الحرفي بسطر جديد فعلي
const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function getAuth() {
  if (!SHEET_ID || !clientEmail || !privateKey) {
    throw new Error('Missing SHEET_ID/GOOGLE_CLIENT_EMAIL/GOOGLE_PRIVATE_KEY');
  }
  return new google.auth.JWT(clientEmail, null, privateKey, SCOPES);
}

export function getSheets() {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
}

export async function read(range) {
  const sheets = getSheets();
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID, range
  });
  const values = (data && data.values) || [];
  const header = values[0] || [];
  const rows = values.slice(1);
  return { header, rows };
}

export async function append(range, values) {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] }
  });
}

export function toObj(header, row) {
  const o = {};
  header.forEach((h, i) => o[h] = row[i] ?? '');
  return o;
}

export function colIndex(header, name) {
  const target = String(name).trim().toLowerCase();
  return header.findIndex(h => String(h || '').trim().toLowerCase() === target);
}

export function findBy(header, rows, field, value) {
  const idx = colIndex(header, field);
  if (idx === -1) return null;
  const want = String(value ?? '').trim();
  return rows.find(r => String(r[idx] ?? '').trim() === want) || null;
}

export function sumBy(header, rows, fieldFilter, valueFilter, fieldSum) {
  const fIdx = colIndex(header, fieldFilter);
  const sIdx = colIndex(header, fieldSum);
  if (fIdx === -1 || sIdx === -1) return 0;
  const want = String(valueFilter ?? '').trim();
  return rows.reduce((acc, r) =>
    (String(r[fIdx] ?? '').trim() === want ? acc + Number(r[sIdx] || 0) : acc), 0);
}

// <<< هنا ضفنا RATINGS >>>
export const RANGES = {
  CLIENTS: 'Clients!A:Z',
  MERCHANTS: 'Merchants!A:Z',
  TRANSACTIONS: 'Transactions!A:Z',
  RATINGS: 'Ratings!A:Z',           // <— جديد
};

// ===== Helpers لتحويل رقم عمود إلى A1 مثل AA, AB ...
function toA1Col(idxZeroBased) {
  let n = idxZeroBased + 1;
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** تحديث صف حسب مفتاح */
export async function updateRowByKey(sheetName, keyColName, keyValue, updates) {
  const range = `${sheetName}!A:Z`;
  const { header, rows } = await read(range);
  const keyIdx = colIndex(header, keyColName);
  if (keyIdx === -1) throw new Error(`العمود ${keyColName} غير موجود في ${sheetName}`);

  const wanted = String(keyValue ?? '').trim();
  const rowIdx = rows.findIndex(r => String(r[keyIdx] ?? '').trim() === wanted);
  if (rowIdx === -1) throw new Error(`القيمة ${keyValue} غير موجودة في ${keyColName}`);

  const realRow = rowIdx + 2;
  const current = rows[rowIdx].slice(0, header.length);
  for (let i = 0; i < header.length; i++) if (typeof current[i] === 'undefined') current[i] = '';

  for (const [k, val] of Object.entries(updates || {})) {
    const cIdx = colIndex(header, k);
    if (cIdx !== -1) current[cIdx] = String(val);
  }

  const sheets = getSheets();
  const lastCol = toA1Col(header.length - 1);
  const updateRange = `${sheetName}!A${realRow}:${lastCol}${realRow}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: updateRange,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [current] }
  });

  return true;
}

// === رابرز لتوافق الكود القديم ===
export async function getRows(sheetName) {
  const range = `${sheetName}!A:Z`;
  const { header, rows } = await read(range);
  return rows.map(r => toObj(header, r));
}

export async function appendRow(sheetName, obj) {
  const range = `${sheetName}!A:Z`;
  const { header } = await read(range);

  const lower = {};
  for (const [k, v] of Object.entries(obj || {})) {
    lower[String(k).trim().toLowerCase()] = v;
  }

  const row = header.map((h) => {
    if (obj && typeof obj[h] !== 'undefined') return obj[h];
    const alt = lower[String(h || '').trim().toLowerCase()];
    return typeof alt !== 'undefined' ? alt : '';
  });

  await append(range, row);
  return true;
}

// كذلك نصدّر Default يحوي كل شي حتى إذا أحد كتب import sheets from ...
export default {
  getSheets, read, append, toObj, colIndex, findBy, sumBy, RANGES,
  updateRowByKey, getRows, appendRow
};
