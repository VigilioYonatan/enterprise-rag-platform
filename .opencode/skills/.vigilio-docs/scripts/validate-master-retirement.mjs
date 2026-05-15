#!/usr/bin/env node
// Garantía local/CI: el Master legado no puede volver a la fuente normativa.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const docs=path.resolve(import.meta.dirname,'..');
const root=path.resolve(docs,'..');
const master='master_prompt_software_factory_openspec_agent_plugins_runner_2026.md';
const expectedArchiveHashes=[
  '4d6346ff53944fbffac438ae666024eff84151471c6f478ba47cc9cbfc9883b5',
  '4f4e9f5500a2ba80a8033cf8b74618cbe32cf7b3942347e3f7fd139b89344dfb',
];
const mustExist=[
  'standards/data/polymorphic-relations.md',
  'standards/engineering/use-case-traceability.md',
  'platform-runtime/5-execution-plans-and-context-locks.md',
];
const errors=[];
for (const rel of mustExist) if (!fs.existsSync(path.join(docs,rel))) errors.push(`Missing canonical document: ${rel}`);
for (const rel of ['software-factory/'+master,'_site/software-factory/'+master]) {
  if (fs.existsSync(path.join(docs,rel))) errors.push(`Deprecated active master: ${rel}`);
}
for (const rel of ['README.md','_sidebar.md']) {
  const t=fs.readFileSync(path.join(docs,rel),'utf8');
  if (t.includes('software-factory/'+master)) errors.push(`Stale master link: ${rel}`);
  for (const target of mustExist) if (!t.includes(target)) errors.push(`Missing navigation ${target} in ${rel}`);
}
const archive=path.join(root,'historical-reports','2026-10',master);
if (fs.existsSync(path.join(root,'historical-reports'))) {
  if (!fs.existsSync(archive)) errors.push('No historical archive of master');
  else {
    const sha=crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
    if (!expectedArchiveHashes.includes(sha)) errors.push(`Historical master checksum mismatch: ${sha}`);
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode=1;
} else console.log('PASS retired master; 3 canons linked; historical hash verified if included in ZIP');
