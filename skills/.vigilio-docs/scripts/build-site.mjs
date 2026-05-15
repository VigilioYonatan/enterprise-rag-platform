#!/usr/bin/env node
/**
 * Construye `_site` para GitHub Pages.
 *
 * Descubre las carpetas de documentacion en vez de listarlas a mano. La version
 * anterior copiaba una lista fija que omitia `frontend-web-mfe`, asi que los 17
 * documentos de frontend daban 404 en el sitio publicado mientras el sidebar y
 * el README de `web-mfe` los enlazaban como fuente canonica. Derivar la lista
 * hace que anadir una seccion nueva no requiera acordarse de tocar el workflow.
 */
import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, '_site');

/** Carpetas que nunca forman parte del sitio publicado. */
const EXCLUDED_DIRECTORIES = new Set([
  '.git',
  '.github',
  '.compat',
  '_site',
  'node_modules',
  'scripts',
]);

/** Archivos no Markdown de la raiz que forman parte del sitio. */
const ROOT_ASSETS = ['index.html', '_sidebar.md', 'compatibility.json'];
const EXCLUDED_ROOT_DOCS = new Set(['AGENTS.md']);

async function docDirectories() {
  const entries = await readdir(ROOT, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !EXCLUDED_DIRECTORIES.has(name))
    .sort();
}

async function rootDocumentationFiles() {
  const entries = await readdir(ROOT, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.endsWith('.md') && !EXCLUDED_ROOT_DOCS.has(name))
    .sort();
}

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const directories = await docDirectories();

  if (directories.length === 0) {
    throw new Error('No se encontro ninguna carpeta de documentacion para publicar');
  }

  for (const directory of directories) {
    await cp(path.join(ROOT, directory), path.join(OUT, directory), { recursive: true });
  }

  for (const file of [...ROOT_ASSETS, ...(await rootDocumentationFiles())]) {
    await cp(path.join(ROOT, file), path.join(OUT, file));
  }

  // Sin esto GitHub Pages aplica Jekyll y descarta las carpetas con guion bajo.
  await writeFile(path.join(OUT, '.nojekyll'), '');

  console.log(`Sitio construido en _site con ${directories.length} secciones:`);
  for (const directory of directories) {
    console.log(`  - ${directory}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
