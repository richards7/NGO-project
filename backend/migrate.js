const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'services');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.service.ts'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace import (handle both single and double quotes)
  content = content.replace(/import prisma from (['"])(\.\.\/config\/database)\1;?/g, 'import { getDb } from $1$2$1;');
  
  // Replace method signatures to inject const db = getDb();
  // Match `async methodName(...) {` or `methodName(...) {` inside class
  content = content.replace(/(\b(?:async\s+)?\w+\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{)/g, (match) => {
    // avoid matching 'if (...) {' or 'for (...) {' or 'while (...) {' or 'catch (...) {' or 'switch (...) {'
    if (match.match(/\b(if|for|while|catch|switch)\b/)) return match;
    // avoid inline functions like map((m) => {
    if (match.includes('=>')) return match;
    // avoid constructor
    if (match.includes('constructor')) return match;
    
    // Only inject if not already there
    return match + '\n    const db = getDb();';
  });
  
  // Replace prisma. with db.
  content = content.replace(/\bprisma\./g, 'db.');
  
  // Clean up any double injections in auth.service and patient.service which we manually edited
  content = content.replace(/const db = getDb\(\);\s+const db = getDb\(\);/g, 'const db = getDb();');
  
  fs.writeFileSync(filePath, content);
  console.log('Migrated', file);
}
