// FAIL CLOSED until a current API export is checked into this frontend repository
// and synchronized with the sibling backend contract when present.
const { existsSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const openapi = resolve(__dirname, '../src/generated/openapi.json');
const types = resolve(__dirname, '../src/generated/openapi-types.ts');
const siblingBackendSpec = process.env.OPENAPI_SOURCE_PATH
  ? resolve(process.env.OPENAPI_SOURCE_PATH)
  : resolve(__dirname, '../../enterprise-rag-impl/openapi.json');

if (!existsSync(openapi) || !existsSync(types)) {
  console.error(
    'Contract gate blocked: generated OpenAPI spec and TypeScript client are absent. Run backend openapi:export and contracts:generate.',
  );
  process.exit(1);
}

const rawFrontendSpec = readFileSync(openapi, 'utf8');
const spec = JSON.parse(rawFrontendSpec);
const pathCount = spec.paths ? Object.keys(spec.paths).length : 0;
if (pathCount < 35) {
  throw new Error(`Generated API surface is incomplete (${pathCount} paths)`);
}

const generatedTypes = readFileSync(types, 'utf8');
if (!generatedTypes.includes('export interface paths')) {
  throw new Error('Generated TypeScript OpenAPI types file is invalid');
}

if (existsSync(siblingBackendSpec)) {
  const backendSpec = JSON.stringify(JSON.parse(readFileSync(siblingBackendSpec, 'utf8')));
  const frontendNormalized = JSON.stringify(spec);
  if (backendSpec !== frontendNormalized) {
    console.error(
      'Contract drift detected between apps/enterprise-rag-impl/openapi.json and src/generated/openapi.json. Run pnpm contracts:generate.',
    );
    process.exit(1);
  }
}

console.log(`OpenAPI contract verified: ${pathCount} paths (zero drift).`);
