const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const db = new Database('camp_data.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();

let html = '<html><body>';
for (const t of tables) {
  const tableName = t.name;
  const rows = db.prepare('SELECT * FROM ' + tableName).all();
  if (rows.length === 0) continue;
  
  html += '<h2>' + tableName + '</h2><table border="1"><tr>';
  const cols = Object.keys(rows[0]);
  for (const col of cols) html += '<th>' + col + '</th>';
  html += '</tr>';
  
  for (const row of rows) {
    html += '<tr>';
    for (const col of cols) html += '<td>' + (row[col] !== null ? String(row[col]).replace(/</g, '&lt;') : '') + '</td>';
    html += '</tr>';
  }
  html += '</table><br/>';
}
html += '</body></html>';

const outPath = path.join('..', 'Database_Export.xls');
fs.writeFileSync(outPath, html);
console.log('Exported to ' + outPath);
