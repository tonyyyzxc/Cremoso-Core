// Utility for creating a Google Sheet from tabular rows.
import { google } from "googleapis";

export async function createGoogleSheet(auth, title, rows) {
  const sheets = google.sheets({ version: "v4", auth });
  const created = await sheets.spreadsheets.create({
    requestBody: { properties: { title } },
    fields: "spreadsheetId,spreadsheetUrl",
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: created.data.spreadsheetId,
    range: "A1",
    valueInputOption: "RAW",
    requestBody: {
      values: rows.map((row) => row.map((value) => value ?? "")),
    },
  });
  return created.data.spreadsheetUrl;
}
