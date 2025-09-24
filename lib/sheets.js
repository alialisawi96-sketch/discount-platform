// lib/sheets.js
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { google } from 'googleapis';

const projectRoot = process.cwd();
const envDotEnv = path.join(projectRoot, '.env');
const envDotEnvLocal = path.join(projectRoot, '.env.local');

// حمّل .env أولاً، إذا مو موجود حمّل .env.local
if (fs.existsSync(envDotEnv)) {
  dotenv.config({ path: envDotEnv });
} else if (fs.existsSync(envDotEnvLocal)) {
  dotenv.config({ path: envDotEnvLocal });
}

// تشخيص
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
  const values = data.values || [];
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

// ابحث عن رقم العمود بدون حساسية لحالة الأحرف والمسافات
export function colIndex(header, name) {
  const target = String(name).trim().toLowerCase();
  return header.findIndex(h => String(h || '').trim().toLowerCase() === target);
}

// ابحث عن صف يطابق قيمة حقل معيّن (بدون حساسية للحروف/المسافات في الهيدر)
export function findBy(header, rows, field, value) {
  const idx = colIndex(header, field);
  if (idx === -1) return null;
  const want = String(value ?? '').trim();
  return rows.find(r => String(r[idx] ?? '').trim() === want) || null;
}

// اجمع عمود معيّن لصفوف تطابق قيمة حقل آخر (الهيدر غير حساس)
export function sumBy(header, rows, fieldFilter, valueFilter, fieldSum) {
  const fIdx = colIndex(header, fieldFilter);
  const sIdx = colIndex(header, fieldSum);
  if (fIdx === -1 || sIdx === -1) return 0;
  const want = String(valueFilter ?? '').trim();
  return rows.reduce((acc, r) =>
    (String(r[fIdx] ?? '').trim() === want ? acc + Number(r[sIdx] || 0) : acc), 0);
}

export const RANGES = {
  CLIENTS: 'Clients!A:Z',
  MERCHANTS: 'Merchants!A:Z',
  TRANSACTIONS: 'Transactions!A:Z'
};

// ===== Helpers لتحويل رقم عمود إلى A1 مثل AA, AB ... =====
function toA1Col(idxZeroBased) {
  // 0 -> A, 25 -> Z, 26 -> AA ...
  let n = idxZeroBased + 1;
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/**
 * حدّث صف داخل شيت معيّن بالبحث عن قيمة مفتاح (مثلاً client_code)
 * @param {string} sheetName      اسم التبويب داخل الشيت (Clients / Merchants / ...)
 * @param {string} keyColName     اسم عمود المفتاح (مثلاً 'client_code')
 * @param {string|number} keyValue قيمة المفتاح المطلوب تحديث صفّه
 * @param {object} updates        كائن {اسم_عمود: قيمة} يندمج فوق الصف الحالي
 * @returns {Promise<boolean>}    true عند النجاح
 */
export async function updateRowByKey(sheetName, keyColName, keyValue, updates) {
  // نقرأ الهيدر والصفوف
  const range = `${sheetName}!A:Z`;
  const { header, rows } = await read(range);

  // موقع عمود المفتاح
  const keyIdx = colIndex(header, keyColName);
  if (keyIdx === -1) {
    throw new Error(`العمود ${keyColName} غير موجود في ${sheetName}`);
  }

  // نلاقي رقم الصف المطلوب (0-based داخل rows)
  const wanted = String(keyValue ?? '').trim();
  const rowIdx = rows.findIndex(r => String(r[keyIdx] ?? '').trim() === wanted);
  if (rowIdx === -1) {
    throw new Error(`القيمة ${keyValue} غير موجودة في العمود ${keyColName}`);
  }

  // رقم الصف الحقيقي داخل الشيت (الهيدر = الصف 1)
  const realRow = rowIdx + 2;

  // نبني نسخة من الصف الحالي بنفس طول الهيدر
  const current = rows[rowIdx].slice(0, header.length);
  // نضمن الطول يساوي طول الهيدر ونملأ الفراغات
  for (let i = 0; i < header.length; i++) {
    if (typeof current[i] === 'undefined') current[i] = '';
  }

  // ندمج التحديثات حسب أسماء الأعمدة (غير حساس)
  for (const [k, val] of Object.entries(updates || {})) {
    const colIdx = colIndex(header, k);
    if (colIdx !== -1) {
      current[colIdx] = String(val);
    }
  }

  // نكتب الصف كامل: من A إلى آخر عمود في الهيدر
  const sheets = getSheets();
  const lastCol = toA1Col(header.length - 1); // A1 مثل 'Z' أو 'AA'
  const updateRange = `${sheetName}!A${realRow}:${lastCol}${realRow}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: updateRange,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [current] }
  });

  return true;
}
