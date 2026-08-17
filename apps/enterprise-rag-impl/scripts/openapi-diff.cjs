const fs = require('node:fs');
const path = require('node:path');

const target = path.resolve(process.cwd(), process.argv[2] || 'openapi.json');
if (!fs.existsSync(target)) {
  console.error('OpenAPI diff gate failed: spec file not found at', target);
  process.exit(1);
}

const spec = JSON.parse(fs.readFileSync(target, 'utf8'));
const paths = spec.paths || {};
const pathKeys = Object.keys(paths);
if (pathKeys.length < 35) {
  console.error(`OpenAPI diff gate failed: expected >= 35 paths, found ${pathKeys.length}`);
  process.exit(1);
}

const missingResponses = [];
for (const [route, methods] of Object.entries(paths)) {
  for (const [method, operation] of Object.entries(methods)) {
    if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
    const responses = operation?.responses || {};
    const hasSuccess = Object.keys(responses).some((code) => /^2\d\d$/.test(code));
    if (!hasSuccess) {
      missingResponses.push(`${method.toUpperCase()} ${route}`);
    }
    const successSchemas = Object.entries(responses)
      .filter(([code]) => /^2\d\d$/.test(code) && code !== '204')
      .some(([, res]) => Boolean(res?.content));
    if (!successSchemas && !responses['204']) {
      missingResponses.push(`${method.toUpperCase()} ${route} (missing 2xx content schema)`);
    }
  }
}

if (missingResponses.length > 0) {
  console.error(`OpenAPI contract completeness gate failed on operations:\n${missingResponses.join('\n')}`);
  process.exit(1);
}

console.log(`OpenAPI contract check passed: ${pathKeys.length} paths verified with 100% 2xx schemas.`);
