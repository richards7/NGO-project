const lines = "Name,Stock\nParacetamol, 10".split('\n').filter(l => l.trim() !== '');
const headerLine = lines[0].toLowerCase();
const hasHeader = headerLine.includes('name');
const dataLines = hasHeader ? lines.slice(1) : lines;

let nameIdx = 0;
let catIdx = 1;
let stockIdx = 2;

if (hasHeader) {
  const headers = headerLine.split(',').map(h => h.trim());
  nameIdx = headers.findIndex(h => h === 'name');
  catIdx = headers.findIndex(h => h === 'category');
  stockIdx = headers.findIndex(h => h === 'stock');
}

for (const line of dataLines) {
  const cols = line.split(',').map(s => s?.trim());
  const name = cols[nameIdx !== -1 ? nameIdx : 0];
  
  let stockVal = 0;
  let categoryId = "category-id-1";
  
  if (cols.length === 2 && !hasHeader) {
    stockVal = parseInt(cols[1]) || 0;
  } else {
    const rawCat = catIdx !== -1 ? cols[catIdx] : undefined;
    categoryId = rawCat || "category-id-1";
    const rawStock = stockIdx !== -1 ? cols[stockIdx] : cols[cols.length - 1]; // fallback to last column
    stockVal = parseInt(rawStock || "0") || 0;
  }
  
  console.log({ name, categoryId, stockVal });
}
