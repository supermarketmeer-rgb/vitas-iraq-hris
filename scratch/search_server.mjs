import fs from 'fs';

const content = fs.readFileSync('server.js', 'utf8');
const lines = content.split('\n');

function find(term) {
  console.log(`=== SEARCH FOR: ${term} ===`);
  lines.forEach((line, idx) => {
    if (line.toLowerCase().includes(term.toLowerCase())) {
      console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
  });
}

const terms = process.argv.slice(2);
if (terms.length === 0) {
  find('branches');
  find('positions');
  find('departments');
  find('contract_types');
  find('reset-data');
} else {
  terms.forEach(t => find(t));
}
