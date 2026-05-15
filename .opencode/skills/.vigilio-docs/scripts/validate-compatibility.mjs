#!/usr/bin/env node

import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const manifestPath = path.join(ROOT, 'compatibility.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const workspaceArgument = process.argv.indexOf('--workspace');
const explicitWorkspace = workspaceArgument >= 0;
const workspace = path.resolve(
  explicitWorkspace ? process.argv[workspaceArgument + 1] : path.join(ROOT, '..'),
);
const errors = [];

const localCheckoutAliases = new Map([
  ['vigilio-platform-actions', 'platform-actions'],
  ['bus-impl', path.join('apps', 'bus-impl')],
  ['web-mfe', path.join('apps', 'web-mfe')],
]);

function fail(message) {
  errors.push(message);
}

function assertSha(value, label) {
  if (!/^[a-f0-9]{40}$/i.test(value)) {
    fail(`${label} debe ser un commit SHA completo`);
  }
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

async function assertFile(file, label) {
  try {
    await access(file);
  } catch {
    fail(`${label}: falta ${file}`);
  }
}

async function resolveCheckoutDirectory(checkoutPath) {
  const declaredDirectory = path.join(workspace, checkoutPath);

  try {
    await access(declaredDirectory);
    return declaredDirectory;
  } catch {
    const localAlias = explicitWorkspace ? undefined : localCheckoutAliases.get(checkoutPath);
    return localAlias ? path.join(workspace, localAlias) : declaredDirectory;
  }
}

async function validatePlatform(platform) {
  assertSha(platform.ref, 'platform_actions.ref');
  const directory = await resolveCheckoutDirectory(platform.checkout_path);

  await assertFile(directory, 'platform-actions checkout');

  for (const expected of platform.packages) {
    const file = path.join(directory, expected.path);
    await assertFile(file, expected.name);
    try {
      const packageJson = await readJson(file);
      if (packageJson.name !== expected.name) {
        fail(`${expected.path}: name=${packageJson.name}, esperado=${expected.name}`);
      }
      if (packageJson.version !== expected.version) {
        fail(`${expected.name}: version=${packageJson.version}, esperada=${expected.version}`);
      }
    } catch (error) {
      fail(`${expected.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  for (const relativePath of platform.required_files) {
    await assertFile(path.join(directory, relativePath), 'platform required file');
  }

  try {
    const profiles = await readJson(path.join(directory, 'skill-profiles.json'));
    const schemaVer = profiles.schema_version ?? profiles.schemaVersion;
    if (schemaVer !== 1 && schemaVer !== 2) {
      fail('skill-profiles.json: schema_version debe ser 1 o 2');
    }

    for (const [profile, expectedSkills] of Object.entries(platform.skill_profiles)) {
      const actualSkills = profiles.profiles?.[profile];
      if (JSON.stringify(actualSkills) !== JSON.stringify(expectedSkills)) {
        fail(
          `skill profile ${profile}: actual=${JSON.stringify(actualSkills)}, esperado=${JSON.stringify(expectedSkills)}`,
        );
      }
    }
  } catch (error) {
    fail(`skill-profiles.json: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function validateConsumer(consumer) {
  assertSha(consumer.ref, `${consumer.id}.ref`);
  const directory = await resolveCheckoutDirectory(consumer.checkout_path);
  const packageFile = path.join(directory, 'package.json');

  await assertFile(packageFile, `${consumer.id} package.json`);

  try {
    const packageJson = await readJson(packageFile);
    const dependencies = {
      ...(packageJson.dependencies ?? {}),
      ...(packageJson.devDependencies ?? {}),
    };

    for (const [name, expectedVersion] of Object.entries(consumer.dependencies)) {
      const actualVersion = dependencies[name];
      if (actualVersion !== expectedVersion) {
        fail(`${consumer.id}: ${name}=${actualVersion}, esperado=${expectedVersion}`);
      }
    }
  } catch (error) {
    fail(`${consumer.id}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function validateDocs(manifestData) {
  const compatibility = await readFile(path.join(ROOT, 'COMPATIBILITY.md'), 'utf8');
  const workflow = await readFile(path.join(ROOT, '.github/workflows/publish.yml'), 'utf8');
  const platform = manifestData.platform_actions;

  for (const expected of platform.packages) {
    if (!compatibility.includes(expected.name) || !compatibility.includes(expected.version)) {
      fail(`COMPATIBILITY.md no refleja ${expected.name}@${expected.version}`);
    }
  }

  if (!compatibility.includes(platform.ref)) {
    fail('COMPATIBILITY.md no refleja el SHA de platform-actions');
  }

  const jiraReference = `Vigilio-Services/vigilio-platform-actions/actions/jira-devops@${platform.ref}`;
  const localJiraReference = 'uses: ./.platform-actions/actions/jira-devops';
  if (!workflow.includes(jiraReference) && !workflow.includes(localJiraReference)) {
    fail('publish.yml no consume jira-devops desde el SHA declarado');
  }

  for (const repository of [platform, ...manifestData.consumers]) {
    if (!workflow.includes(`repository: ${repository.repository}`)) {
      fail(`publish.yml no descarga ${repository.repository} para validar compatibilidad`);
    }
    if (!workflow.includes(`ref: ${repository.ref}`)) {
      fail(`publish.yml no fija ${repository.repository} al SHA declarado`);
    }
  }
}

if (manifest.schema_version !== 1) {
  fail('compatibility.json: schema_version debe ser 1');
}

await validatePlatform(manifest.platform_actions);
for (const consumer of manifest.consumers) {
  await validateConsumer(consumer);
}
await validateDocs(manifest);

if (errors.length > 0) {
  console.error('FAIL Compatibilidad cross-repo:');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(
  `OK  Compatibilidad cross-repo: platform-actions + ${manifest.consumers.map(({ id }) => id).join(' + ')}`,
);
