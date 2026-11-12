// Fails if a production build (dist/, or the folder given) is over the Poki limit of 8 MB.
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const LIMIT = 8 * 1024 * 1024;
function total(dir) {
  let sum = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    sum += s.isDirectory() ? total(p) : s.size;
  }
  return sum;
}
const dir = process.argv[2] ?? 'dist';
const size = total(dir);
const mb = (size / 1024 / 1024).toFixed(2);
console.log(`${dir} size: ${mb} MB (limit 8 MB)`);
if (size > LIMIT) {
  console.error('FAIL: build is over 8 MB');
  process.exit(1);
}
