const fs = require('node:fs');
const path = require('node:path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const full = path.resolve(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (full.endsWith('.js') || full.endsWith('.d.ts')) {
      results.push(full);
    }
  }
  return results;
}

const distDir = path.resolve(__dirname, '../packages/contracts/dist');
if (!fs.existsSync(distDir)) {
  console.error('dist dir does not exist:', distDir);
  process.exit(1);
}

const files = walk(distDir);
const importRegex = /(from\s+['"])(\.[^'"]+)(['"])/g;
const exportRegex = /(export\s+(?:(?:\*|[a-zA-Z0-9_{},\s]+)\s+from\s+)?['"])(\.[^'"]+)(['"])/g;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  const replaceSpecifier = (match, p1, specifier, p3) => {
    if (specifier.endsWith('.js') || specifier.endsWith('.json') || specifier.endsWith('.mjs')) {
      return match;
    }
    const resolvedPath = path.resolve(path.dirname(file), specifier);
    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
      changed = true;
      return `${p1}${specifier}/index.js${p3}`;
    }
    changed = true;
    return `${p1}${specifier}.js${p3}`;
  };

  content = content.replace(importRegex, replaceSpecifier);
  content = content.replace(exportRegex, replaceSpecifier);

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
  }
}
console.log('fix-esm-imports completed for', files.length, 'files in packages/contracts/dist');
