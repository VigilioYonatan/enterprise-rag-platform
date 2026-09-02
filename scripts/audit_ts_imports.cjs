const fs = require('fs');
const path = require('path');
const repoRoot = path.resolve(__dirname, '..');
const targetRoot = process.argv[2]
  ? path.resolve(repoRoot, process.argv[2])
  : repoRoot;
const ts = require(
  require.resolve('typescript', {
    paths: [
      __dirname,
      path.join(repoRoot, 'apps/enterprise-rag-impl/node_modules'),
      path.join(repoRoot, 'apps/enterprise-rag-web/node_modules'),
    ],
  }),
);

const ignoredDirs = new Set([
  'skills',
  '.opencode',
  'node_modules',
  '.git',
  'dist',
  'coverage',
  'playwright-report',
  'test-results',
]);
const files = [];
function walk(d) {
  for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) walk(p);
    } else if (/\.tsx?$/.test(p) && !p.endsWith('.d.ts')) {
      files.push(p);
    }
  }
}
walk(targetRoot);

const source = new Map();
const parseProblems = [];
for (const file of files) {
  const s = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  source.set(file, s);
  for (const d of s.parseDiagnostics) {
    parseProblems.push(
      `${file}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`,
    );
  }
}

function resolve(file, mod) {
  let base;
  const isImpl = file.includes('enterprise-rag-impl');
  const isWeb = file.includes('enterprise-rag-web');

  if (mod.startsWith('.')) {
    base = path.resolve(path.dirname(file), mod);
  } else if (mod.startsWith('@/')) {
    if (isImpl) {
      base = path.resolve(
        repoRoot,
        'apps/enterprise-rag-impl/src/modules',
        mod.slice(2),
      );
    } else if (isWeb) {
      base = path.resolve(
        repoRoot,
        'apps/enterprise-rag-web/src/features',
        mod.slice(2),
      );
    } else {
      return null;
    }
  } else if (mod.startsWith('~/')) {
    if (isImpl) {
      base = path.resolve(
        repoRoot,
        'apps/enterprise-rag-impl/src',
        mod.slice(2),
      );
    } else if (isWeb) {
      base = path.resolve(
        repoRoot,
        'apps/enterprise-rag-web/src',
        mod.slice(2),
      );
    } else {
      return null;
    }
  } else {
    return null;
  }

  const stripped = base.replace(/\.(js|jsx)$/, '');
  return (
    [
      base,
      base + '.ts',
      base + '.tsx',
      base + '.js',
      base + '.json',
      base + '.css',
      stripped + '.ts',
      stripped + '.tsx',
      path.join(base, 'index.ts'),
      path.join(base, 'index.tsx'),
    ].find(fs.existsSync) ?? null
  );
}

const cache = new Map();
function exportsOf(file, seen = new Set()) {
  if (!source.has(file) || seen.has(file)) return new Set();
  if (cache.has(file)) return cache.get(file);
  seen.add(file);
  const names = new Set();
  const s = source.get(file);
  for (const node of s.statements) {
    const isExport = Boolean(
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword),
    );
    if (isExport) {
      if (node.name?.text) names.add(node.name.text);
      if (ts.isVariableStatement(node)) {
        for (const d of node.declarationList.declarations) {
          if (ts.isIdentifier(d.name)) names.add(d.name.text);
        }
      }
      if (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)) {
        names.add('default');
      }
    }
    if (ts.isExportDeclaration(node)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const spec of node.exportClause.elements) {
          names.add(spec.name.text);
        }
      } else if (
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const dep = resolve(file, node.moduleSpecifier.text);
        if (dep) {
          for (const n of exportsOf(dep, seen)) names.add(n);
        }
      }
    }
  }
  cache.set(file, names);
  return names;
}

const errors = [];
let localImports = 0;
let checkedNames = 0;
for (const [file, s] of source) {
  for (const node of s.statements) {
    if (
      !ts.isImportDeclaration(node) ||
      !ts.isStringLiteral(node.moduleSpecifier)
    ) {
      continue;
    }
    const mod = node.moduleSpecifier.text;
    if (!mod.startsWith('.') && !mod.startsWith('@/') && !mod.startsWith('~/'))
      continue;
    const dep = resolve(file, mod);
    localImports++;
    const relFile = path.relative(targetRoot, file).replace(/\\/g, '/');
    if (!dep) {
      errors.push(`${relFile}: unresolved ${mod}`);
      continue;
    }
    const clause = node.importClause;
    if (!clause || !source.has(dep)) continue;
    const names = exportsOf(dep);
    if (clause.name) {
      checkedNames++;
      if (!names.has('default')) {
        errors.push(`${relFile}: import default from ${mod}, no default export`);
      }
    }
    if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      for (const spec of clause.namedBindings.elements) {
        const name = (spec.propertyName ?? spec.name).text;
        checkedNames++;
        if (!names.has(name)) {
          errors.push(`${relFile}: named ${name} missing from ${mod}`);
        }
      }
    }
  }
}

const result = {
  source_files: files.length,
  parse_issues: parseProblems,
  relative_imports: localImports,
  named_imports_checked: checkedNames,
  named_import_errors: errors,
};
console.log(JSON.stringify(result, null, 2));
process.exit(errors.length || parseProblems.length ? 1 : 0);
