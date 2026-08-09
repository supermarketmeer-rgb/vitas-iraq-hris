import fs from 'fs';

const filePath = process.argv[2];
const term = process.argv[3];

if (!filePath || !term) {
  console.log('Usage: node search_file.mjs <file> <term>');
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log(`=== SEARCH FOR "${term}" IN ${filePath} ===`);
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes(term.toLowerCase())) {
    console.log(`Line ${idx + 1}: ${line.trim().substring(0, 150)}`);
  }
});
