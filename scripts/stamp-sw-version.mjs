// PWA SW Version Stamp Script – runs after vite build
// Replaces __VITAS_SW_VERSION__ placeholder in dist/sw.js with a unique build timestamp

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const distDir = join(process.cwd(), 'dist');
const swPath = join(distDir, 'sw.js');
const version = Date.now().toString(36); // compact timestamp-based version

try {
  let swContent = readFileSync(swPath, 'utf-8');
  swContent = swContent.replace('__VITAS_SW_VERSION__', version);
  writeFileSync(swPath, swContent, 'utf-8');
  console.log(`[PWA] Service Worker stamped with version: ${version}`);
} catch (err) {
  console.warn('[PWA] Could not stamp SW version:', err.message);
}
