import fs from 'fs';
import path from 'path';

const dbDir = 'database';
const files = fs.readdirSync(dbDir);

files.forEach(f => {
  const filePath = path.join(dbDir, f);
  if (fs.statSync(filePath).isFile()) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.toUpperCase().includes('INSERT INTO')) {
        console.log(`[${f}:${idx + 1}] ${line.trim().substring(0, 120)}`);
      }
    });
  }
});
