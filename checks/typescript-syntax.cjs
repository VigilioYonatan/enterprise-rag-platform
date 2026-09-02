#!/usr/bin/env node
/**
 * TypeScript Syntax Check
 * Verifies syntax validity of all TS/TSX/JS files using the installed TypeScript compiler API.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
let ts;
try {
  ts = require(path.join(root, 'apps', 'enterprise-rag-impl', 'node_modules', 'typescript'));
} catch {
  try {
    ts = require(path.join(root, 'apps', 'enterprise-rag-web', 'node_modules', 'typescript'));
  } catch {
    console.error('TypeScript compiler module not found in node_modules.');
    process.exit(1);
  }
}

const errors = [];
let fileCount = 0;

function checkFile(filePath) {
  fileCount++;
  const code = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    code,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  if (sourceFile.parseDiagnostics && sourceFile.parseDiagnostics.length > 0) {
    for (const diag of sourceFile.parseDiagnostics) {
      errors.push(`${path.relative(root, filePath)}: ${diag.messageText}`);
    }
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        !['node_modules', 'dist', '.git', 'coverage', 'test-results', 'playwright-report'].includes(
          entry.name,
        )
      ) {
        walk(full);
      }
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      checkFile(full);
    }
  }
}

walk(path.join(root, 'apps'));

const result = {
  timestamp: new Date().toISOString(),
  filesChecked: fileCount,
  errorCount: errors.length,
  errors,
};

fs.writeFileSync(path.join(__dirname, 'typescript-syntax-results.json'), JSON.stringify(result, null, 2), 'utf-8');

if (errors.length > 0) {
  console.error(`TypeScript syntax check FAILED with ${errors.length} errors:`);
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
} else {
  console.log(`TypeScript syntax check: PASS (${fileCount} TS/TSX files validated)`);
}
