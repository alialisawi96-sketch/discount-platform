// pages/api/updatePoints.js
import { read, getSheets, RANGES, colIndex } from '../../lib/sheets';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const { client_code, new_points } = req.body;

  if (!client_code || typeof new_points === 'undefined') {
    return res.status(400).json({ error: 'Missing client_code or new_points' });
  }

  try {
    const { header, rows } = await read(RANGES.CLIENTS);
    const idxCode = colIndex(header, 'client_code');
    const idxPoints = colIndex(header, 'points_balance');
    if (idxCode === -1 || idxPoints === -1) {
      return res.status(500).json({ error: 'Missing headers in Clients sheet' });
    }

    const rowIndex = rows.findIndex(r => String(r[idxCode]).trim() === client_code.trim());
    if (rowIndex === -1) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const sheets = getSheets();
    const rowNumber = rowIndex + 2; // لأن أول صف هيدر
    const cell = `Clients!${String.fromCharCode(65+idxPoints)}${rowNumber}`;

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SHEET_ID,
      range: cell,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[ new_points ]] }
    });

    return res.status(200).json({ success: true, client_code, new_points });
  } catch (e) {
    console.error('updatePoints error', e);
    return res.status(500).json({ error: e.message });
  }
}
