#!/usr/bin/env node
// Audita documentación de ingeniería y guías de modernización sin reescribir ADR ni normas humanas.
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skills = existsSync(path.resolve(root, '..', 'platform-actions', 'packages', 'vigilio-skills'))
  ? path.resolve(root, '..', 'platform-actions', 'packages', 'vigilio-skills')
  : path.resolve(root, '..', 'vigilio-skills');
const ignoredDirs = new Set(['.git', '_site', 'node_modules', '.github', 'scripts', '.compat']);
const immutable = (rel) => rel.startsWith('adr/') || rel.startsWith('software-factory/') || rel.startsWith('migration-evidence/') || rel === 'AGENTS.md' || rel === '_sidebar.md' ||
  ['COMPATIBILITY.md', 'OPERATING-MODEL.md', 'threat-model/template.md'].includes(rel);
const walk = async (dir, out=[]) => {
  for (const e of await readdir(dir, {withFileTypes:true})) {
    if (e.isDirectory() && !ignoredDirs.has(e.name)) await walk(path.join(dir,e.name),out);
    else if (e.isFile() && e.name.endsWith('.md')) out.push(path.join(dir,e.name));
  }
  return out;
};
const docs = await walk(root);
const errors=[];let technical=0;
for (const file of docs) {
  const rel=path.relative(root,file).replaceAll(path.sep,'/');
  if (immutable(rel)) continue;
  const contents=await readFile(file,'utf8');
  technical++;
  if (!contents.includes('✅') || !contents.includes('❌')) errors.push(`falta Correcto/Incorrecto: ${rel}`);
  if (!contents.startsWith('# ')) errors.push(`sin H1: ${rel}`);
  if (contents.match(/^```/gm)?.length % 2) errors.push(`fence incompleto: ${rel}`);
}
const skillSrc=path.join(skills,'assets/skills');
const skillNames=(await readdir(skillSrc,{withFileTypes:true})).filter(e=>e.isDirectory()).map(e=>e.name);
const profiles=JSON.parse(await readFile(path.join(skills,'assets/profiles.json'),'utf8'));
for (const [name, members] of Object.entries(profiles.profiles)) {
  for (const member of members) if (!skillNames.includes(member)) errors.push(`skill ausente ${name}: ${member}`);
}
for (const name of skillNames) {
  const file=path.join(skillSrc,name,'SKILL.md');
  const contents=await readFile(file,'utf8');
  if (!name.startsWith('openspec-') && !contents.startsWith('---\n')) errors.push(`frontmatter faltante: ${name}`);
  if (!name.startsWith('openspec-') && (!contents.includes('✅') || !contents.includes('❌'))) errors.push(`antipatrón faltante: ${name}`);
}
if (!skillNames.includes('refactor-existing-code') || !profiles.profiles['core-cross-stack'].includes('refactor-existing-code')) errors.push('falta skill legacy en perfil core-cross-stack');
if (errors.length) { errors.forEach(e=>console.error('FAIL',e)); process.exitCode=1; }
else console.log(`OK guidance: ${technical} docs técnicos, ${skillNames.length} skills, ${Object.keys(profiles.profiles).length} perfiles; normas humanas/ADR sin alteración obligatoria`);
