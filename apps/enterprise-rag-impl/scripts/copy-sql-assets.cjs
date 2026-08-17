const fs = require('node:fs');
const path = require('node:path');

const srcDir = path.join(__dirname, '..', 'src', 'database', 'migrations');
const destDir = path.join(__dirname, '..', 'dist', 'database', 'migrations');

fs.mkdirSync(destDir, { recursive: true });
for (const entry of fs.readdirSync(srcDir)) {
  if (entry.endsWith('.sql')) {
    fs.copyFileSync(path.join(srcDir, entry), path.join(destDir, entry));
  }
}
