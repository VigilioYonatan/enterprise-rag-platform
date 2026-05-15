#!/usr/bin/env node
/**
 * Valida la documentacion antes de publicarla.
 *
 * Comprobaciones:
 * 1. Enlaces internos rotos
 * 2. Cobertura del sidebar
 * 3. Colision de numeracion
 * 4. Estructura Markdown
 * 5. Portal SEO y dependencias CDN versionadas
 * 6. Portabilidad y ausencia de secretos en documentacion normativa
 * 7. Contrato de contexto dinamico
 */
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const EXCLUDED = new Set(['.compat', '.git', '.github', '_site', 'node_modules', 'scripts']);
const EXCLUDED_FILES = new Set(['AGENTS.md']);
const NUMBERING_MIRRORS = new Set([
]);

async function markdownFiles(directory = ROOT, collected = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (EXCLUDED.has(entry.name)) continue;

    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      await markdownFiles(fullPath, collected);
    } else if (entry.name.endsWith('.md') && !EXCLUDED_FILES.has(entry.name)) {
      collected.push(fullPath);
    }
  }

  return collected;
}

const relative = (file) => path.relative(ROOT, file).split(path.sep).join('/');

async function validateInternalLinks(files) {
  const errors = [];
  for (const file of files) {
    const content = await readFile(file, 'utf8');
    const directory = path.dirname(relative(file));
    const prose = content.replace(/^```[\s\S]*?^```/gm, '');

    for (const match of prose.matchAll(/\]\(([^)]+)\)/g)) {
      const target = match[1];

      if (!target || /^(https?:|mailto:|#)/.test(target)) continue;

      const [linkPath] = target.split('#');
      if (!linkPath) continue;

      const resolved = path
        .normalize(path.join(directory === '.' ? '' : directory, linkPath))
        .split(path.sep)
        .join('/');

      if (!existsSync(path.join(ROOT, resolved))) {
        errors.push(`${relative(file)}: enlace interno roto -> ${target}`);
      }
    }
  }

  return errors;
}

async function validateMarkdownStructure(files) {
  const errors = [];

  for (const file of files) {
    const content = await readFile(file, 'utf8');
    const lines = content.split(/\r?\n/);
    const firstContent = lines.find((line) => line.trim().length > 0);

    if (relative(file) !== '_sidebar.md' && !firstContent?.startsWith('# ')) {
      errors.push(`${relative(file)}: debe iniciar con un titulo H1`);
    }

    const fences = lines.filter((line) => line.trimStart().startsWith('```')).length;
    if (fences % 2 !== 0) {
      errors.push(`${relative(file)}: bloque de codigo sin cerrar`);
    }

    if (/file:\/\//i.test(content)) {
      errors.push(`${relative(file)}: no publicar enlaces file:// locales`);
    }
  }

  return errors;
}

async function validateSidebarCoverage(files) {
  const sidebar = await readFile(path.join(ROOT, '_sidebar.md'), 'utf8');
  const linked = new Set(
    [...sidebar.matchAll(/\]\(([^)]+\.md)\)/g)].map((match) => match[1]),
  );

  return files
    .map(relative)
    .filter((file) => file !== '_sidebar.md' && !linked.has(file))
    .map((file) => `${file}: no es alcanzable desde _sidebar.md`);
}

async function validateSiteShell() {
  const errors = [];
  const html = await readFile(path.join(ROOT, 'index.html'), 'utf8');

  for (const match of html.matchAll(/https:\/\/cdn\.jsdelivr\.net\/npm\/([^/"']+)/g)) {
    const packageReference = match[1];
    if (!packageReference.includes('@')) {
      errors.push(`index.html: dependencia CDN sin version exacta -> ${packageReference}`);
    }
  }

  if (!html.includes('<link rel="canonical"')) {
    errors.push('index.html: falta canonical URL');
  }
  if (!html.includes('id="theme-toggle"') || !html.includes('aria-label=')) {
    errors.push('index.html: el control de tema debe ser accesible');
  }

  return errors;
}

function isNormativeDocument(file) {
  const normalized = relative(file);
  const normative = ['standards/', 'platform/', 'platform-runtime/', 'governance/'].some(
    (prefix) => normalized.startsWith(prefix),
  );
  const historical =
    normalized.includes('/references/') ||
    normalized.includes('/case-studies/') ||
    normalized.includes('historico-');
  return normative && !historical;
}

async function validateNormativePortability(files) {
  const errors = [];
  const rules = [
    ['ruta absoluta Windows', /[A-Za-z]:[\\/]Users[\\/][^\s`"']+/i],
    ['ruta absoluta de usuario Unix', /\/(?:home|Users)\/[^/\s`"']+\//],
    ['token GitHub con formato real', /\bgh[pousr]_[A-Za-z0-9]{20,}\b/],
    ['token GitLab con formato real', /\bglpat-[A-Za-z0-9_-]{20,}\b/],
    ['access key AWS con formato real', /\bAKIA[0-9A-Z]{16}\b/],
    ['ARN con account ID real', /arn:aws:[^\s:]*:[^\s:]*:\d{12}:/],
    [
      'URL interna o RFC1918',
      /https?:\/\/(?:[^/\s`]+\.(?:internal|local)|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)(?::\d+)?(?:\/|\b)/i,
    ],
    ['credenciales embebidas en URL PostgreSQL', /postgres(?:ql)?:\/\/[^:$\s{]+:[^@$\s{]+@/i],
    [
      'password de ejemplo realista',
      /\b(?:POSTGRES_PASSWORD|DATABASE_PASSWORD|DB_PASSWORD)\s*[:=]\s*(?!\$\{|\$\{\{|<|REDACTED|CHANGE_ME)[^\s#`]+/i,
    ],
    ['nombre legacy de workspace', /\b(?:practicing-3|infra-v2|docker-v2|deploy-v2|prod-local-privileged)\b/i],
  ];

  for (const file of files.filter(isNormativeDocument)) {
    const content = await readFile(file, 'utf8');
    const lines = content.split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      for (const [name, pattern] of rules) {
        if (pattern.test(line)) {
          errors.push(`${relative(file)}:${index + 1}: ${name}`);
        }
      }
    }
  }
  return errors;
}

async function validatePlatformContextArtifacts() {
  const errors = [];
  const schemaPath = path.join(ROOT, 'schemas', 'platform-context.schema.json');
  const examplePath = path.join(ROOT, 'examples', 'platform-context.example.yaml');

  try {
    const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
    if (schema?.properties?.schemaVersion?.const !== 1) {
      errors.push('schemas/platform-context.schema.json: schemaVersion debe fijarse en 1');
    }
  } catch (error) {
    errors.push(
      `schemas/platform-context.schema.json: JSON invalido -> ${error instanceof Error ? error.message : error}`,
    );
  }

  try {
    const example = await readFile(examplePath, 'utf8');
    for (const required of [
      'schemaVersion: 1',
      'project:',
      'repositories:',
      'environments:',
      'delivery:',
      'infrastructure:',
      'labs:',
    ]) {
      if (!example.includes(required)) {
        errors.push(`examples/platform-context.example.yaml: falta ${required}`);
      }
    }
  } catch (error) {
    errors.push(
      `examples/platform-context.example.yaml: no se pudo leer -> ${error instanceof Error ? error.message : error}`,
    );
  }

  return errors;
}

function validateNumbering(files) {
  const bySection = new Map();

  for (const file of files.map(relative)) {
    if (NUMBERING_MIRRORS.has(file)) continue;
    const match = /^(.*)\/(\d+)-/.exec(file);
    if (!match) continue;

    const [, section, number] = match;
    const key = `${section}/${number}`;
    bySection.set(key, [...(bySection.get(key) ?? []), file]);
  }

  return [...bySection.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([key, entries]) => `numeracion duplicada ${key}: ${entries.join(', ')}`);
}

async function main() {
  const files = await markdownFiles();
  const checks = [
    ['Enlaces internos', await validateInternalLinks(files)],
    ['Cobertura del sidebar', await validateSidebarCoverage(files)],
    ['Numeracion', validateNumbering(files)],
    ['Estructura Markdown', await validateMarkdownStructure(files)],
    ['Portal SEO/supply-chain', await validateSiteShell()],
    ['Portabilidad normativa', await validateNormativePortability(files)],
    ['Contexto dinamico de plataforma', await validatePlatformContextArtifacts()],
  ];

  let failed = false;

  for (const [name, errors] of checks) {
    if (errors.length === 0) {
      console.log(`OK  ${name}`);
      continue;
    }

    failed = true;
    console.error(`FAIL ${name} (${errors.length})`);
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
  }

  console.log(`\n${files.length} documentos analizados`);

  if (failed) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
