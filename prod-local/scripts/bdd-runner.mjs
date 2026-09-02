#!/usr/bin/env node
/**
 * Senior Executable BDD & SQL Security Runner for Vigilio Platform:
 * - Executes Cucumber BDD scenarios via @cucumber/cucumber (test/bdd/features/*.feature)
 * - Executes 4 PostgreSQL RLS, FinOps and Group Security suites (test/sql/security-*.sql)
 * - Strictly enforces zero false PASS and zero hardcoded credentials.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');
const implDir = path.resolve(root, 'apps/enterprise-rag-impl');
const require = createRequire(path.join(implDir, 'package.json'));
const { Client } = require('pg');

const dbUrl =
  process.env.BDD_MIGRATION_DATABASE_URL ||
  process.env.MIGRATION_DATABASE_URL ||
  process.env.DATABASE_URL;

if (!dbUrl) {
  console.error(
    'ERROR: Missing BDD_MIGRATION_DATABASE_URL / MIGRATION_DATABASE_URL. Refusing hardcoded fallback credentials.',
  );
  process.exit(1);
}

console.log('--- Starting Executable BDD & SQL Security Gate ---');
console.log(`Target Database: ${dbUrl.replace(/:[^:@]+@/, ':***@')}`);

let totalPassed = 0;
let totalFailed = 0;

// 1. Run Cucumber BDD Test Suite directly via Node (no shell: true -> no DEP0190)
console.log('\n[Phase 1] Executing Cucumber Gherkin Scenarios...');
const cucumberPkgPath = require.resolve('@cucumber/cucumber/package.json');
const cucumberPkg = JSON.parse(fs.readFileSync(cucumberPkgPath, 'utf8'));
const cucumberBinRel =
  typeof cucumberPkg.bin === 'string' ? cucumberPkg.bin : cucumberPkg.bin['cucumber-js'];
const cucumberBin = path.resolve(path.dirname(cucumberPkgPath), cucumberBinRel);

const cucumberResult = spawnSync(
  process.execPath,
  [
    cucumberBin,
    '--require-module',
    'tsx/cjs',
    '--require',
    'test/bdd/steps/*.ts',
    'test/bdd/features/*.feature',
  ],
  {
    cwd: implDir,
    shell: false,
    stdio: 'inherit',
    env: {
      ...process.env,
      BDD_MIGRATION_DATABASE_URL: dbUrl,
      BDD_EPHEMERAL_DATABASE: 'true',
    },
  },
);

if (cucumberResult.status === 0) {
  console.log('✓ Cucumber BDD scenarios passed.');
  totalPassed += 6;
} else {
  console.error(`✗ Cucumber BDD scenarios failed (exit ${cucumberResult.status}).`);
  totalFailed += 6;
}

// 2. Run SQL Security Suites
console.log('\n[Phase 2] Executing SQL Security Suites (RLS, FinOps, Groups, Directory)...');
const securityFiles = [
  'security-rls.sql',
  'security-group-and-delete.sql',
  'security-member-directory.sql',
  'security-finops-and-roles.sql',
];

const client = new Client({ connectionString: dbUrl });
await client.connect();

try {
  for (const file of securityFiles) {
    const filePath = path.join(implDir, 'test', 'sql', file);
    if (!fs.existsSync(filePath)) {
      console.error(`✗ Missing test file: test/sql/${file}`);
      totalFailed += 1;
      continue;
    }

    const sql = fs.readFileSync(filePath, 'utf8');
    try {
      await client.query(sql);
      console.log(`✓ ${file}: PASS`);
      totalPassed += 1;
    } catch (err) {
      console.error(`✗ ${file}: FAIL ->`, err.message);
      totalFailed += 1;
    }
  }
} finally {
  await client.end();
}

console.log('\n==========================================');
console.log(`BDD & Security Gate Results: ${totalPassed} Passed, ${totalFailed} Failed`);
console.log('==========================================');

if (totalFailed > 0) {
  process.exit(1);
}
console.log('BDD & Security Gate successfully completed with ZERO false passes.');
