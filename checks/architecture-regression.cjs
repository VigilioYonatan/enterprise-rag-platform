#!/usr/bin/env node
/**
 * Architecture Regression Check
 * Enforces boundaries between the 5 logical repositories and verifies zero AWS dependencies.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const errors = [];

// 1. Check for forbidden root coupling files
const forbiddenRootFiles = ['package.json', 'pnpm-workspace.yaml', 'contracts', 'packages'];
for (const file of forbiddenRootFiles) {
  if (fs.existsSync(path.join(root, file))) {
    errors.push(`Forbidden root coupling artifact found: ${file}`);
  }
}

// 2. Scan backend and frontend source files for forbidden dependencies
function scanDir(dir, pattern, onFile) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        !['node_modules', 'dist', '.git', 'coverage', 'test-results', 'playwright-report'].includes(
          entry.name,
        )
      ) {
        scanDir(fullPath, pattern, onFile);
      }
    } else if (pattern.test(entry.name)) {
      onFile(fullPath);
    }
  }
}

// Scan for AWS SDK imports
const awsPattern = /@aws-sdk|aws-sdk/;
scanDir(path.join(root, 'apps'), /\.(ts|tsx|js|mjs|cjs)$/, (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  if (awsPattern.test(content)) {
    // Only allow if in a comment or mock
    if (!filePath.includes('.test.') && !filePath.includes('test/')) {
      errors.push(`Forbidden AWS SDK dependency detected in ${path.relative(root, filePath)}`);
    }
  }
});

// Scan for cross-repo imports
const crossRepoImportToWeb = /(from|require\(|import\()\s*['"][^'"]*enterprise-rag-web/;
const crossRepoImportToImpl = /(from|require\(|import\()\s*['"][^'"]*enterprise-rag-impl/;

scanDir(path.join(root, 'apps', 'enterprise-rag-impl'), /\.(ts|js)$/, (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  if (crossRepoImportToWeb.test(content)) {
    errors.push(`Invalid cross-repo import to frontend in ${path.relative(root, filePath)}`);
  }
});

scanDir(path.join(root, 'apps', 'enterprise-rag-web'), /\.(ts|tsx)$/, (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  if (crossRepoImportToImpl.test(content) && !filePath.includes('openapi-types')) {
    errors.push(`Invalid direct cross-repo import to backend in ${path.relative(root, filePath)}`);
  }
});

const reportPath = path.join(__dirname, 'architecture-regression-results.json');
const result = {
  timestamp: new Date().toISOString(),
  passed: errors.length === 0,
  errorCount: errors.length,
  errors: errors,
};
fs.writeFileSync(reportPath, JSON.stringify(result, null, 2), 'utf-8');

if (errors.length > 0) {
  console.error('Architecture regression check FAILED:');
  for (const err of errors) console.error(` - ${err}`);
  process.exit(1);
} else {
  console.log('Architecture regression check: PASS (0 boundary violations, zero AWS SDK)');
}
