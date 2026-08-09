import fs from 'fs';

const content = fs.readFileSync('server.js', 'utf8');
const lines = content.split('\n');

let capturing = false;
lines.forEach((line, idx) => {
  if (idx >= 1050 && idx <= 1300) {
    console.log(`Line ${idx + 1}: ${line}`);
  }
});
