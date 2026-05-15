#!/usr/bin/env node
/**
 * Aplica la política de workflows de la plataforma a vigilio-docs.
 *
 * Valida:
 * 1. Uso de SHA inmutables en actions remotas.
 * 2. `persist-credentials: false` en actions/checkout.
 * 3. Ausencia de `pull_request_target`.
 * 4. Permisos explícitos `permissions:`.
 * 5. `timeout-minutes:` obligatorio en jobs con runner.
 * 6. `id-token: write` restringido a acciones OIDC (AWS, Attestations, GitHub Pages).
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const WORKFLOWS_DIR = path.join(ROOT, '.github/workflows');

const oidcCapableActions = [
  'actions/attest@',
  'configure-aws-credentials@',
  'actions/deploy-pages@',
];

function activeYaml(content) {
  return content
    .split('\n')
    .map((line) => {
      let inSingle = false;
      let inDouble = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && !inSingle) inDouble = !inDouble;
        else if (char === "'" && !inDouble) inSingle = !inSingle;
        else if (char === '#' && !inSingle && !inDouble && (i === 0 || /\s/.test(line[i - 1]))) {
          return line.slice(0, i);
        }
      }
      return line;
    })
    .join('\n');
}

function validateWorkflowFile(file) {
  const errors = [];
  const rawContent = readFileSync(path.join(WORKFLOWS_DIR, file), 'utf8');
  const content = activeYaml(rawContent);

  for (const [index, line] of rawContent.split('\n').entries()) {
    const match = /^(\s+)(?:uses|run|with|env|if|name):/.exec(line);
    if (match && match[1].length % 2 !== 0) {
      errors.push(`${file}:${index + 1}: indentacion YAML impar en una clave de workflow`);
    }
  }

  // 1. Validate Pinned Uses
  // Ignore comments. A prose mention of `uses:` is not an action declaration.
  const usesMatches = [...content.matchAll(/\buses:\s*([^\s#]+)/g)];
  for (const match of usesMatches) {
    const target = match[1];
    if (target.startsWith('./')) continue;
    const separator = target.lastIndexOf('@');
    const revision = separator >= 0 ? target.slice(separator + 1) : '';
    if (!/^[a-f0-9]{40}$/i.test(revision)) {
      errors.push(`${file}: action remota debe usar un commit SHA completo (40 hex chars): ${target}`);
    }
  }

  // 2. Validate Checkout persist-credentials: false
  if (rawContent.includes('actions/checkout@')) {
    if (!rawContent.includes('persist-credentials: false')) {
      errors.push(`${file}: actions/checkout debe configurar persist-credentials: false`);
    }
  }

  // 3. Prohibit pull_request_target
  if (content.includes('pull_request_target:')) {
    errors.push(`${file}: pull_request_target está prohibido`);
  }

  // 4. Require explicit permissions
  if (!content.includes('permissions:')) {
    errors.push(`${file}: se requieren permisos explícitos (permissions:)`);
  }

  // 5. Require timeout-minutes
  const hasRunnerJob = /^\s{4}runs-on:/m.test(content);
  if (hasRunnerJob && !content.includes('timeout-minutes:')) {
    errors.push(`${file}: timeout-minutes es obligatorio en los jobs`);
  }

  // 6. Restrict id-token: write to OIDC actions (AWS OIDC, Attestations, GitHub Pages)
  if (content.match(/id-token:\s*write/)) {
    const usesOidc = oidcCapableActions.some((action) => rawContent.includes(action));
    if (!usesOidc) {
      errors.push(`${file}: id-token: write solo debe usarse para OIDC (AWS, Pages, Attestation)`);
    }
  }

  return errors;
}

try {
  const files = readdirSync(WORKFLOWS_DIR).filter(
    (f) => f.endsWith('.yml') || f.endsWith('.yaml'),
  );

  const errors = [];
  for (const file of files) {
    errors.push(...validateWorkflowFile(file));
  }

  if (errors.length > 0) {
    console.error('FAIL Política de workflows:');
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log('OK  Política de workflows');
} catch (error) {
  console.error('Error al validar workflows:', error);
  process.exit(1);
}
